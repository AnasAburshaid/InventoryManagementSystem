using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.Products.DTOs;
using InventoryManagementSystem.Business.Warehouses.Restrictions.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.Warehouses.Restrictions.Services;

public class WarehouseRestrictionService : IWarehouseRestrictionService
{
    private readonly InventoryDbContext _context;

    public WarehouseRestrictionService(InventoryDbContext context)
    {
        _context = context;
    }

    public async Task<WarehouseCategoryRestrictionsResponse?> GetRestrictionsAsync(Guid warehouseId)
    {
        var warehouse = await _context.Warehouses
            .AsNoTracking()
            .Include(w => w.CategoryRestrictions)
                .ThenInclude(cr => cr.Category)
            .FirstOrDefaultAsync(w => w.Id == warehouseId);

        if (warehouse == null) return null;

        return new WarehouseCategoryRestrictionsResponse
        {
            WarehouseId = warehouse.Id,
            WarehouseName = warehouse.Name,
            WarehouseCode = warehouse.Code,
            CanAcceptAllCategories = warehouse.CanAcceptAllCategories,
            AllowedCategories = warehouse.CategoryRestrictions
                .Where(cr => cr.Category.IsActive)
                .Select(cr => new WarehouseCategoryRestrictionDto
                {
                    CategoryId = cr.CategoryId,
                    CategoryName = cr.Category.Name
                })
                .OrderBy(c => c.CategoryName)
                .ToList()
        };
    }

    public async Task<(bool isSuccess, string? error, WarehouseCategoryRestrictionsResponse? data)> SetCategoriesAsync(
        Guid warehouseId,
        IEnumerable<Guid> categoryIds)
    {
        var warehouse = await _context.Warehouses
            .Include(w => w.CategoryRestrictions)
            .FirstOrDefaultAsync(w => w.Id == warehouseId);

        if (warehouse == null)
            return (false, "Warehouse not found.", null);

        var distinctCategoryIds = categoryIds.Distinct().ToList();

        // Validate all category IDs exist and are active
        if (distinctCategoryIds.Count > 0)
        {
            var validCategoryCount = await _context.Categories
                .CountAsync(c => distinctCategoryIds.Contains(c.Id) && c.IsActive);

            if (validCategoryCount != distinctCategoryIds.Count)
            {
                return (false, "One or more category IDs are invalid or inactive.", null);
            }
        }

        // SAFEGUARD: If warehouse will not accept all categories, check if warehouse holds physical stock
        // for any category that is NOT in the distinctCategoryIds list!
        if (!warehouse.CanAcceptAllCategories || distinctCategoryIds.Count > 0)
        {
            var disallowedStockItems = await (from sm in _context.StockMovements
                                              join p in _context.Products on sm.ProductId equals p.Id
                                              join c in _context.Categories on p.CategoryId equals c.Id
                                              where sm.WarehouseId == warehouseId && !distinctCategoryIds.Contains(p.CategoryId)
                                              group sm by new { p.Id, p.Name, CategoryName = c.Name } into g
                                              select new
                                              {
                                                  ProductId = g.Key.Id,
                                                  ProductName = g.Key.Name,
                                                  CategoryName = g.Key.CategoryName,
                                                  CurrentStock = g.Sum(m =>
                                                      (m.Type == StockMovementType.Purchase ||
                                                       m.Type == StockMovementType.AdjustmentIn ||
                                                       m.Type == StockMovementType.TransferIn) ? m.Quantity :
                                                      (m.Type == StockMovementType.Sale ||
                                                       m.Type == StockMovementType.AdjustmentOut ||
                                                       m.Type == StockMovementType.TransferOut) ? -m.Quantity : 0m)
                                              })
                                              .Where(x => x.CurrentStock > 0)
                                              .ToListAsync();

            if (disallowedStockItems.Any())
            {
                var item = disallowedStockItems.First();
                return (false, $"Cannot restrict categories: Warehouse '{warehouse.Name}' currently holds {item.CurrentStock:N3} units of '{item.ProductName}' (Category: {item.CategoryName}). Transfer or adjust this stock to zero before restricting.", null);
            }
        }

        // Remove existing
        _context.WarehouseCategoryRestrictions.RemoveRange(warehouse.CategoryRestrictions);

        // Add new
        foreach (var categoryId in distinctCategoryIds)
        {
            _context.WarehouseCategoryRestrictions.Add(new WarehouseCategoryRestriction
            {
                Id = Guid.NewGuid(),
                WarehouseId = warehouseId,
                CategoryId = categoryId,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();
        var updated = await GetRestrictionsAsync(warehouseId);
        return (true, null, updated);
    }

    public async Task<(bool isSuccess, string? error, WarehouseCategoryRestrictionsResponse? data)> UpdateFlagAsync(
        Guid warehouseId,
        bool canAcceptAllCategories)
    {
        var warehouse = await _context.Warehouses
            .Include(w => w.CategoryRestrictions)
            .FirstOrDefaultAsync(w => w.Id == warehouseId);

        if (warehouse == null)
            return (false, "Warehouse not found.", null);

        // SAFEGUARD: If toggling from true to false, check if current restrictions cover all held stock
        if (warehouse.CanAcceptAllCategories && !canAcceptAllCategories)
        {
            var allowedCategoryIds = warehouse.CategoryRestrictions.Select(cr => cr.CategoryId).ToList();

            var disallowedStockItems = await (from sm in _context.StockMovements
                                              join p in _context.Products on sm.ProductId equals p.Id
                                              join c in _context.Categories on p.CategoryId equals c.Id
                                              where sm.WarehouseId == warehouseId && !allowedCategoryIds.Contains(p.CategoryId)
                                              group sm by new { p.Id, p.Name, CategoryName = c.Name } into g
                                              select new
                                              {
                                                  ProductId = g.Key.Id,
                                                  ProductName = g.Key.Name,
                                                  CategoryName = g.Key.CategoryName,
                                                  CurrentStock = g.Sum(m =>
                                                      (m.Type == StockMovementType.Purchase ||
                                                       m.Type == StockMovementType.AdjustmentIn ||
                                                       m.Type == StockMovementType.TransferIn) ? m.Quantity :
                                                      (m.Type == StockMovementType.Sale ||
                                                       m.Type == StockMovementType.AdjustmentOut ||
                                                       m.Type == StockMovementType.TransferOut) ? -m.Quantity : 0m)
                                              })
                                              .Where(x => x.CurrentStock > 0)
                                              .ToListAsync();

            if (disallowedStockItems.Any())
            {
                var item = disallowedStockItems.First();
                return (false, $"Cannot restrict warehouse '{warehouse.Name}': It holds {item.CurrentStock:N3} units of '{item.ProductName}' in category '{item.CategoryName}' which is not in its allowed list. Add that category first or clear stock before restricting.", null);
            }
        }

        warehouse.CanAcceptAllCategories = canAcceptAllCategories;
        await _context.SaveChangesAsync();

        var updated = await GetRestrictionsAsync(warehouseId);
        return (true, null, updated);
    }

    public async Task<(bool isEligible, string? reason)> ValidateCategoryEligibilityAsync(Guid warehouseId, Guid categoryId)
    {
        var warehouse = await _context.Warehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.Id == warehouseId);

        if (warehouse == null)
            return (false, "Warehouse was not found.");

        if (!warehouse.IsActive)
            return (false, $"Warehouse '{warehouse.Name}' is inactive.");

        if (warehouse.CanAcceptAllCategories)
            return (true, null);

        bool isAllowed = await _context.WarehouseCategoryRestrictions
            .AnyAsync(wcr => wcr.WarehouseId == warehouseId && wcr.CategoryId == categoryId);

        if (!isAllowed)
        {
            var category = await _context.Categories.FindAsync(categoryId);
            string catName = category?.Name ?? categoryId.ToString();
            return (false, $"Warehouse '{warehouse.Name}' is not authorized to accept products in category '{catName}'.");
        }

        return (true, null);
    }

    public async Task<(bool isEligible, string? reason)> ValidateProductEligibilityAsync(Guid warehouseId, Guid productId)
    {
        var product = await _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Id == productId);

        if (product == null)
            return (false, "Product was not found.");

        return await ValidateCategoryEligibilityAsync(warehouseId, product.CategoryId);
    }

    public async Task<IReadOnlyCollection<ProductResponse>> GetEligibleProductsAsync(Guid warehouseId)
    {
        var warehouse = await _context.Warehouses
            .AsNoTracking()
            .Include(w => w.CategoryRestrictions)
            .FirstOrDefaultAsync(w => w.Id == warehouseId);

        if (warehouse == null || !warehouse.IsActive)
            return Array.Empty<ProductResponse>();

        var query = _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.UnitOfMeasure)
            .Include(p => p.Brand)
            .Where(p => p.IsActive);

        if (!warehouse.CanAcceptAllCategories)
        {
            var allowedCategoryIds = warehouse.CategoryRestrictions.Select(cr => cr.CategoryId).ToList();
            query = query.Where(p => allowedCategoryIds.Contains(p.CategoryId));
        }

        return await query
            .OrderBy(p => p.Name)
            .Select(p => new ProductResponse
            {
                Id = p.Id,
                SKU = p.Sku,
                Name = p.Name,
                CategoryId = p.CategoryId,
                CategoryName = p.Category.Name,
                UnitOfMeasureId = p.UnitOfMeasureId,
                UnitOfMeasureName = p.UnitOfMeasure.Name,
                UnitOfMeasureCode = p.UnitOfMeasure.Code,
                UnitOfMeasure = p.UnitOfMeasure.Name,
                BrandId = p.BrandId,
                BrandName = p.Brand != null ? p.Brand.Name : null,
                SellingPrice = p.SellingPrice,
                ReorderThreshold = p.ReorderThreshold,
                IsActive = p.IsActive,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();
    }
}
