using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.Products.DTOs;
using InventoryManagementSystem.Business.Suppliers.Capabilities.DTOs;
using InventoryManagementSystem.Business.Suppliers.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.Suppliers.Capabilities.Services;

public class SupplierCapabilityService : ISupplierCapabilityService
{
    private readonly InventoryDbContext _context;

    public SupplierCapabilityService(InventoryDbContext context)
    {
        _context = context;
    }

    public async Task<SupplierCapabilitiesResponse?> GetCapabilitiesAsync(Guid supplierId)
    {
        var supplier = await _context.Suppliers
            .AsNoTracking()
            .Include(s => s.CategoryCapabilities)
                .ThenInclude(cc => cc.Category)
            .Include(s => s.BrandCapabilities)
                .ThenInclude(bc => bc.Brand)
            .FirstOrDefaultAsync(s => s.Id == supplierId);

        if (supplier == null)
            return null;

        return new SupplierCapabilitiesResponse
        {
            SupplierId = supplier.Id,
            SupplierName = supplier.Name,
            CanSupplyAllCategories = supplier.CanSupplyAllCategories,
            CanSupplyAllBrands = supplier.CanSupplyAllBrands,
            AllowedCategories = supplier.CategoryCapabilities
                .Where(cc => cc.Category.IsActive)
                .Select(cc => new CategoryCapabilityDto
                {
                    CategoryId = cc.CategoryId,
                    CategoryName = cc.Category.Name
                })
                .OrderBy(c => c.CategoryName)
                .ToList(),
            AllowedBrands = supplier.BrandCapabilities
                .Where(bc => bc.Brand.IsActive)
                .Select(bc => new BrandCapabilityDto
                {
                    BrandId = bc.BrandId,
                    BrandName = bc.Brand.Name
                })
                .OrderBy(b => b.BrandName)
                .ToList()
        };
    }

    public async Task<(bool isSuccess, string? error, SupplierCapabilitiesResponse? data)> SetCategoriesAsync(
        Guid supplierId,
        IEnumerable<Guid> categoryIds)
    {
        var supplier = await _context.Suppliers
            .Include(s => s.CategoryCapabilities)
            .FirstOrDefaultAsync(s => s.Id == supplierId);

        if (supplier == null)
            return (false, "Supplier not found.", null);

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

        // Remove existing
        _context.SupplierCategoryCapabilities.RemoveRange(supplier.CategoryCapabilities);

        // Add new
        foreach (var categoryId in distinctCategoryIds)
        {
            _context.SupplierCategoryCapabilities.Add(new SupplierCategoryCapability
            {
                Id = Guid.NewGuid(),
                SupplierId = supplierId,
                CategoryId = categoryId,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();
        var updated = await GetCapabilitiesAsync(supplierId);
        return (true, null, updated);
    }

    public async Task<(bool isSuccess, string? error, SupplierCapabilitiesResponse? data)> SetBrandsAsync(
        Guid supplierId,
        IEnumerable<Guid> brandIds)
    {
        var supplier = await _context.Suppliers
            .Include(s => s.BrandCapabilities)
            .FirstOrDefaultAsync(s => s.Id == supplierId);

        if (supplier == null)
            return (false, "Supplier not found.", null);

        var distinctBrandIds = brandIds.Distinct().ToList();

        // Validate all brand IDs exist and are active
        if (distinctBrandIds.Count > 0)
        {
            var validBrandCount = await _context.Brands
                .CountAsync(b => distinctBrandIds.Contains(b.Id) && b.IsActive);

            if (validBrandCount != distinctBrandIds.Count)
            {
                return (false, "One or more brand IDs are invalid or inactive.", null);
            }
        }

        // Remove existing
        _context.SupplierBrandCapabilities.RemoveRange(supplier.BrandCapabilities);

        // Add new
        foreach (var brandId in distinctBrandIds)
        {
            _context.SupplierBrandCapabilities.Add(new SupplierBrandCapability
            {
                Id = Guid.NewGuid(),
                SupplierId = supplierId,
                BrandId = brandId,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();
        var updated = await GetCapabilitiesAsync(supplierId);
        return (true, null, updated);
    }

    public async Task<(bool isSuccess, string? error, SupplierCapabilitiesResponse? data)> UpdateFlagsAsync(
        Guid supplierId,
        bool canSupplyAllCategories,
        bool canSupplyAllBrands)
    {
        var supplier = await _context.Suppliers.FindAsync(supplierId);
        if (supplier == null)
            return (false, "Supplier not found.", null);

        supplier.CanSupplyAllCategories = canSupplyAllCategories;
        supplier.CanSupplyAllBrands = canSupplyAllBrands;

        await _context.SaveChangesAsync();
        var updated = await GetCapabilitiesAsync(supplierId);
        return (true, null, updated);
    }

    public async Task<(bool isEligible, string? reason)> ValidateProductEligibilityAsync(Guid supplierId, Guid productId)
    {
        var supplier = await _context.Suppliers
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == supplierId);

        if (supplier == null)
            return (false, "Supplier was not found.");

        if (!supplier.IsActive)
            return (false, $"Supplier '{supplier.Name}' is inactive.");

        var product = await _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .FirstOrDefaultAsync(p => p.Id == productId);

        if (product == null)
            return (false, "Product was not found.");

        if (!product.IsActive)
            return (false, $"Product '{product.Name}' is inactive.");

        // 1. Category validation
        if (!supplier.CanSupplyAllCategories)
        {
            bool hasCategory = await _context.SupplierCategoryCapabilities
                .AnyAsync(cc => cc.SupplierId == supplierId && cc.CategoryId == product.CategoryId);

            if (!hasCategory)
            {
                return (false, $"Supplier '{supplier.Name}' is not authorized to supply products in category '{product.Category.Name}'.");
            }
        }

        // 2. Brand validation (bypassed if product has no brand, e.g. produce)
        if (product.BrandId.HasValue && !supplier.CanSupplyAllBrands)
        {
            bool hasBrand = await _context.SupplierBrandCapabilities
                .AnyAsync(bc => bc.SupplierId == supplierId && bc.BrandId == product.BrandId.Value);

            if (!hasBrand)
            {
                string brandName = product.Brand?.Name ?? "Unknown";
                return (false, $"Supplier '{supplier.Name}' is not authorized to supply products of brand '{brandName}'.");
            }
        }

        return (true, null);
    }

    public async Task<IReadOnlyCollection<EligibleSupplierDto>> GetEligibleSuppliersForProductAsync(Guid productId)
    {
        var product = await _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .FirstOrDefaultAsync(p => p.Id == productId);

        if (product == null || !product.IsActive)
            return Array.Empty<EligibleSupplierDto>();

        // Get all active supplier products for this product
        var supplierProducts = await _context.SupplierProducts
            .AsNoTracking()
            .Include(sp => sp.Supplier)
            .Where(sp => sp.ProductId == productId && sp.IsActive && sp.Supplier.IsActive)
            .ToListAsync();

        if (supplierProducts.Count == 0)
            return Array.Empty<EligibleSupplierDto>();

        // Stock aggregates for this product across these suppliers
        var supplierIds = supplierProducts.Select(sp => sp.SupplierId).Distinct().ToList();
        var stockAggregates = await _context.SupplierStockMovements
            .AsNoTracking()
            .Where(sm => sm.ProductId == productId && supplierIds.Contains(sm.SupplierId))
            .GroupBy(sm => sm.SupplierId)
            .Select(g => new
            {
                SupplierId = g.Key,
                OnHand = g.Sum(m =>
                    (m.MovementType == SupplierStockMovementType.ExternalReplenishment ||
                     m.MovementType == SupplierStockMovementType.AdjustmentIn) ? m.Quantity :
                    (m.MovementType == SupplierStockMovementType.OrderFulfilledToWarehouse ||
                     m.MovementType == SupplierStockMovementType.AdjustmentOut) ? -m.Quantity : 0m),
                Reserved = g.Sum(m =>
                    (m.MovementType == SupplierStockMovementType.OrderReserved) ? m.Quantity :
                    (m.MovementType == SupplierStockMovementType.OrderReleased) ? -m.Quantity :
                    (m.MovementType == SupplierStockMovementType.OrderFulfilledToWarehouse && m.ReferenceType == "PurchaseOrder" && (m.ReferenceId == null || !m.ReferenceId.Contains("DIRECT-RECEIPT"))) ? -m.Quantity : 0m)
            })
            .ToDictionaryAsync(x => x.SupplierId);

        var results = new List<EligibleSupplierDto>();

        foreach (var sp in supplierProducts)
        {
            var supplier = sp.Supplier;

            // Validate category capability
            if (!supplier.CanSupplyAllCategories)
            {
                bool hasCategory = await _context.SupplierCategoryCapabilities
                    .AnyAsync(cc => cc.SupplierId == supplier.Id && cc.CategoryId == product.CategoryId);
                if (!hasCategory) continue;
            }

            // Validate brand capability
            if (product.BrandId.HasValue && !supplier.CanSupplyAllBrands)
            {
                bool hasBrand = await _context.SupplierBrandCapabilities
                    .AnyAsync(bc => bc.SupplierId == supplier.Id && bc.BrandId == product.BrandId.Value);
                if (!hasBrand) continue;
            }

            stockAggregates.TryGetValue(supplier.Id, out var agg);
            decimal onHand = Math.Max(0m, agg?.OnHand ?? 0m);
            decimal reserved = Math.Max(0m, agg?.Reserved ?? 0m);
            decimal atp = Math.Max(0m, onHand - reserved);

            results.Add(new EligibleSupplierDto
            {
                SupplierId = supplier.Id,
                SupplierName = supplier.Name,
                Email = supplier.Email,
                Phone = supplier.Phone,
                SupplierProductCode = sp.SupplierProductCode,
                LastPurchasePrice = sp.LastPurchasePrice,
                LeadTimeDays = sp.LeadTimeDays,
                IsPreferred = sp.IsPreferred,
                OnHandQuantity = Math.Max(0m, onHand),
                ReservedQuantity = Math.Max(0m, reserved),
                AvailableToPromiseQuantity = Math.Max(0m, atp)
            });
        }

        return results
            .OrderByDescending(r => r.IsPreferred)
            .ThenByDescending(r => r.AvailableToPromiseQuantity > 0)
            .ThenBy(r => r.SupplierName)
            .ToList();
    }

    public async Task<IReadOnlyCollection<ProductResponse>> GetEligibleProductsForSupplierAsync(Guid supplierId)
    {
        var supplier = await _context.Suppliers
            .AsNoTracking()
            .Include(s => s.CategoryCapabilities)
            .Include(s => s.BrandCapabilities)
            .FirstOrDefaultAsync(s => s.Id == supplierId);

        if (supplier == null || !supplier.IsActive)
            return Array.Empty<ProductResponse>();

        var query = _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .Include(p => p.UnitOfMeasure)
            .Where(p => p.IsActive);

        if (!supplier.CanSupplyAllCategories)
        {
            var allowedCategoryIds = supplier.CategoryCapabilities.Select(c => c.CategoryId).ToList();
            query = query.Where(p => allowedCategoryIds.Contains(p.CategoryId));
        }

        if (!supplier.CanSupplyAllBrands)
        {
            var allowedBrandIds = supplier.BrandCapabilities.Select(b => b.BrandId).ToList();
            query = query.Where(p => p.BrandId == null || allowedBrandIds.Contains(p.BrandId.Value));
        }

        var products = await query
            .OrderBy(p => p.Name)
            .ToListAsync();

        return products.Select(p => new ProductResponse
        {
            Id = p.Id,
            SKU = p.Sku,
            Name = p.Name,
            UnitOfMeasureId = p.UnitOfMeasureId,
            UnitOfMeasureName = p.UnitOfMeasure?.Name ?? string.Empty,
            UnitOfMeasureCode = p.UnitOfMeasure?.Code ?? string.Empty,
            UnitOfMeasure = p.UnitOfMeasure?.Name ?? string.Empty,
            ReorderThreshold = p.ReorderThreshold,
            SellingPrice = p.SellingPrice,
            CategoryId = p.CategoryId,
            CategoryName = p.Category?.Name ?? string.Empty,
            BrandId = p.BrandId,
            BrandName = p.Brand?.Name,
            CreatedAt = p.CreatedAt,
            IsActive = p.IsActive
        }).ToList();
    }
}
