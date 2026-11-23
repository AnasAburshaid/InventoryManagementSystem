using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.Analytics.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.Analytics.Services;

public class AnalyticsService : IAnalyticsService
{
    private readonly InventoryDbContext _context;

    public AnalyticsService(InventoryDbContext context)
    {
        _context = context;
    }

    public (DateTime fromUtc, DateTime toUtc, string presetName) ResolveDateRange(string? preset, DateTime? customFrom, DateTime? customTo)
    {
        var nowUtc = DateTime.UtcNow;
        var todayStart = nowUtc.Date;
        var todayEnd = todayStart.AddDays(1); // Exclusive upper bound

        if (!string.IsNullOrWhiteSpace(preset))
        {
            switch (preset.Trim().ToLowerInvariant())
            {
                case "today":
                    return (todayStart, todayEnd, "Today");

                case "yesterday":
                    return (todayStart.AddDays(-1), todayStart, "Yesterday");

                case "last7days":
                case "last 7 days":
                    return (todayStart.AddDays(-7), todayEnd, "Last 7 Days");

                case "last30days":
                case "last 30 days":
                    return (todayStart.AddDays(-30), todayEnd, "Last 30 Days");

                case "last12months":
                case "last 12 months":
                    return (todayStart.AddMonths(-12), todayEnd, "Last 12 Months");

                case "currentmonth":
                case "current month":
                {
                    var startOfMonth = new DateTime(nowUtc.Year, nowUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                    var startOfNextMonth = startOfMonth.AddMonths(1);
                    return (startOfMonth, startOfNextMonth, "Current Month");
                }

                case "previousmonth":
                case "previous month":
                {
                    var startOfThisMonth = new DateTime(nowUtc.Year, nowUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                    var startOfPrevMonth = startOfThisMonth.AddMonths(-1);
                    return (startOfPrevMonth, startOfThisMonth, "Previous Month");
                }

                case "currentyear":
                case "current year":
                {
                    var startOfYear = new DateTime(nowUtc.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
                    var startOfNextYear = startOfYear.AddYears(1);
                    return (startOfYear, startOfNextYear, "Current Year");
                }
            }
        }

        if (customFrom.HasValue || customTo.HasValue)
        {
            var from = customFrom.HasValue ? customFrom.Value.ToUniversalTime() : DateTime.MinValue;
            var to = customTo.HasValue ? customTo.Value.ToUniversalTime().Date.AddDays(1) : todayEnd;
            return (from, to, "Custom");
        }

        return (todayStart.AddDays(-30), todayEnd, "Last 30 Days");
    }

    public async Task<PagedResult<WarehouseMovementHistoryItem>> GetWarehouseMovementHistoryAsync(WarehouseMovementHistoryFilter filter)
    {
        var (fromUtc, toUtc, _) = ResolveDateRange(filter.DatePreset, filter.FromDate, filter.ToDate);

        var query = _context.StockMovements
            .AsNoTracking()
            .Include(sm => sm.Product)
                .ThenInclude(p => p.Category)
            .Include(sm => sm.Product)
                .ThenInclude(p => p.Brand)
            .Include(sm => sm.Product)
                .ThenInclude(p => p.UnitOfMeasure)
            .Include(sm => sm.Warehouse)
            .Include(sm => sm.AdjustmentReason)
            .Include(sm => sm.LinkedMovement)
                .ThenInclude(lm => lm!.Warehouse)
            .Where(sm => sm.WarehouseId == filter.WarehouseId)
            .Where(sm => sm.CreatedAt >= fromUtc && sm.CreatedAt < toUtc);

        if (filter.ProductId.HasValue)
        {
            query = query.Where(sm => sm.ProductId == filter.ProductId.Value);
        }

        if (filter.CategoryId.HasValue)
        {
            query = query.Where(sm => sm.Product.CategoryId == filter.CategoryId.Value);
        }

        if (filter.BrandId.HasValue)
        {
            query = query.Where(sm => sm.Product.BrandId == filter.BrandId.Value);
        }

        if (filter.MovementType.HasValue)
        {
            query = query.Where(sm => sm.Type == filter.MovementType.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.ReferenceType))
        {
            query = query.Where(sm => sm.ReferenceType == filter.ReferenceType);
        }

        if (!string.IsNullOrWhiteSpace(filter.ReferenceId))
        {
            query = query.Where(sm => sm.ReferenceId != null && sm.ReferenceId.Contains(filter.ReferenceId));
        }

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var term = filter.SearchTerm.Trim().ToLower();
            query = query.Where(sm => sm.Product.Name.ToLower().Contains(term) ||
                                      sm.Product.Sku.ToLower().Contains(term) ||
                                      (sm.ReferenceId != null && sm.ReferenceId.ToLower().Contains(term)));
        }

        int totalCount = await query.CountAsync();

        // Sorting
        query = (filter.SortBy?.ToLowerInvariant(), filter.SortDescending) switch
        {
            ("productname", false) => query.OrderBy(sm => sm.Product.Name),
            ("productname", true) => query.OrderByDescending(sm => sm.Product.Name),
            ("quantity", false) => query.OrderBy(sm => sm.Quantity),
            ("quantity", true) => query.OrderByDescending(sm => sm.Quantity),
            ("movementtype", false) => query.OrderBy(sm => sm.Type),
            ("movementtype", true) => query.OrderByDescending(sm => sm.Type),
            ("createdat", false) => query.OrderBy(sm => sm.CreatedAt),
            _ => query.OrderByDescending(sm => sm.CreatedAt)
        };

        int pageIndex = filter.PageIndex < 1 ? 1 : filter.PageIndex;
        int pageSize = filter.PageSize < 1 ? 20 : (filter.PageSize > 100 ? 100 : filter.PageSize);

        var items = await query
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(sm =>
        {
            bool isInbound = sm.Type == StockMovementType.Purchase ||
                             sm.Type == StockMovementType.AdjustmentIn ||
                             sm.Type == StockMovementType.TransferIn;

            return new WarehouseMovementHistoryItem
            {
                Id = sm.Id,
                ProductId = sm.ProductId,
                ProductName = sm.Product.Name,
                ProductSku = sm.Product.Sku,
                CategoryName = sm.Product.Category?.Name ?? "Unassigned",
                BrandName = sm.Product.Brand?.Name,
                UomName = sm.Product.UnitOfMeasure?.Name ?? "Units",
                MovementType = sm.Type,
                Quantity = sm.Quantity,
                NetQuantityChange = isInbound ? sm.Quantity : -sm.Quantity,
                WarehouseId = sm.WarehouseId,
                WarehouseName = sm.Warehouse.Name,
                WarehouseCode = sm.Warehouse.Code,
                LinkedMovementId = sm.LinkedMovementId,
                OtherWarehouseId = sm.LinkedMovement?.WarehouseId,
                OtherWarehouseName = sm.LinkedMovement?.Warehouse?.Name,
                OtherWarehouseCode = sm.LinkedMovement?.Warehouse?.Code,
                ReferenceType = sm.ReferenceType,
                ReferenceId = sm.ReferenceId,
                AdjustmentReasonId = sm.AdjustmentReasonId,
                AdjustmentReasonName = sm.AdjustmentReason?.Name,
                CreatedByUserId = sm.CreatedByUserId,
                CreatedAt = sm.CreatedAt
            };
        }).ToList();

        return new PagedResult<WarehouseMovementHistoryItem>
        {
            Items = dtos,
            TotalCount = totalCount,
            PageIndex = pageIndex,
            PageSize = pageSize
        };
    }

    public async Task<WarehouseActivitySummary> GetWarehouseActivitySummaryAsync(Guid warehouseId, string? datePreset, DateTime? fromDate, DateTime? toDate)
    {
        var (fromUtc, toUtc, presetName) = ResolveDateRange(datePreset, fromDate, toDate);

        var movements = await _context.StockMovements
            .AsNoTracking()
            .Where(sm => sm.WarehouseId == warehouseId && sm.CreatedAt >= fromUtc && sm.CreatedAt < toUtc)
            .Select(sm => new { sm.Type, sm.Quantity })
            .ToListAsync();

        var summary = new WarehouseActivitySummary
        {
            PeriodStart = fromUtc,
            PeriodEnd = toUtc,
            DatePresetApplied = presetName,
            TotalMovementCount = movements.Count
        };

        foreach (var m in movements)
        {
            switch (m.Type)
            {
                case StockMovementType.Purchase:
                    summary.TotalPurchasesQuantity += m.Quantity;
                    summary.TotalReceivedQuantity += m.Quantity;
                    break;
                case StockMovementType.TransferIn:
                    summary.TotalTransfersInQuantity += m.Quantity;
                    summary.TotalReceivedQuantity += m.Quantity;
                    break;
                case StockMovementType.AdjustmentIn:
                    summary.TotalAdjustmentsInQuantity += m.Quantity;
                    summary.TotalReceivedQuantity += m.Quantity;
                    break;
                case StockMovementType.Sale:
                    summary.TotalSalesQuantity += m.Quantity;
                    summary.TotalDispatchedQuantity += m.Quantity;
                    break;
                case StockMovementType.TransferOut:
                    summary.TotalTransfersOutQuantity += m.Quantity;
                    summary.TotalDispatchedQuantity += m.Quantity;
                    break;
                case StockMovementType.AdjustmentOut:
                    summary.TotalAdjustmentsOutQuantity += m.Quantity;
                    summary.TotalDispatchedQuantity += m.Quantity;
                    break;
            }
        }

        summary.NetStockChange = summary.TotalReceivedQuantity - summary.TotalDispatchedQuantity;
        return summary;
    }

    public async Task<PagedResult<WarehouseInventoryItem>> GetWarehouseInventoryAsync(WarehouseInventoryFilter filter)
    {
        var warehouse = await _context.Warehouses
            .AsNoTracking()
            .Include(w => w.CategoryRestrictions)
            .FirstOrDefaultAsync(w => w.Id == filter.WarehouseId);

        if (warehouse == null)
        {
            return new PagedResult<WarehouseInventoryItem>();
        }

        var allowedCategoryIds = warehouse.CanAcceptAllCategories
            ? new HashSet<Guid>()
            : warehouse.CategoryRestrictions.Select(cr => cr.CategoryId).ToHashSet();

        // Load all active products with their categories & brands
        var productsQuery = _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .Include(p => p.UnitOfMeasure)
            .Where(p => p.IsActive);

        if (filter.CategoryId.HasValue)
        {
            productsQuery = productsQuery.Where(p => p.CategoryId == filter.CategoryId.Value);
        }

        if (filter.BrandId.HasValue)
        {
            productsQuery = productsQuery.Where(p => p.BrandId == filter.BrandId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var term = filter.SearchTerm.Trim().ToLower();
            productsQuery = productsQuery.Where(p => p.Name.ToLower().Contains(term) || p.Sku.ToLower().Contains(term));
        }

        var products = await productsQuery.ToListAsync();

        // Calculate current physical stock per product in this warehouse
        var stockStats = await _context.StockMovements
            .AsNoTracking()
            .Where(sm => sm.WarehouseId == filter.WarehouseId)
            .GroupBy(sm => sm.ProductId)
            .Select(g => new
            {
                ProductId = g.Key,
                CurrentStock = g.Sum(m =>
                    (m.Type == StockMovementType.Purchase ||
                     m.Type == StockMovementType.AdjustmentIn ||
                     m.Type == StockMovementType.TransferIn) ? m.Quantity :
                    (m.Type == StockMovementType.Sale ||
                     m.Type == StockMovementType.AdjustmentOut ||
                     m.Type == StockMovementType.TransferOut) ? -m.Quantity : 0m),
                LastMovementDate = g.Max(m => m.CreatedAt)
            })
            .ToDictionaryAsync(x => x.ProductId);

        var now = DateTime.UtcNow;
        var allItems = new List<WarehouseInventoryItem>();

        foreach (var p in products)
        {
            bool isPermitted = warehouse.CanAcceptAllCategories || allowedCategoryIds.Contains(p.CategoryId);
            decimal stock = 0m;
            DateTime? lastMove = null;

            if (stockStats.TryGetValue(p.Id, out var stat))
            {
                stock = stat.CurrentStock;
                lastMove = stat.LastMovementDate;
            }

            int? daysSince = lastMove.HasValue ? (int)(now - lastMove.Value).TotalDays : null;

            // Only show products if they have physical stock OR are permitted in this warehouse
            if (stock > 0 || isPermitted)
            {
                allItems.Add(new WarehouseInventoryItem
                {
                    ProductId = p.Id,
                    ProductName = p.Name,
                    ProductSku = p.Sku,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category?.Name ?? "Unassigned",
                    BrandId = p.BrandId,
                    BrandName = p.Brand?.Name,
                    UomName = p.UnitOfMeasure?.Name ?? "Units",
                    CurrentStock = stock,
                    IsPermitted = isPermitted,
                    LastMovementDate = lastMove,
                    DaysSinceLastMovement = daysSince
                });
            }
        }

        // Apply StockStatus filter
        IEnumerable<WarehouseInventoryItem> filtered = allItems;
        if (!string.IsNullOrWhiteSpace(filter.StockStatus))
        {
            filtered = filter.StockStatus.Trim().ToLowerInvariant() switch
            {
                "instock" => filtered.Where(x => x.HasStock),
                "outofstock" => filtered.Where(x => x.IsOutOfStock && x.IsPermitted),
                "lowstock" => filtered.Where(x => x.IsLowStock),
                "dormant" => filtered.Where(x => x.IsDormant),
                "permittedonly" => filtered.Where(x => x.IsPermitted),
                _ => filtered
            };
        }

        // Sorting
        filtered = (filter.SortBy?.ToLowerInvariant(), filter.SortDescending) switch
        {
            ("productname", false) => filtered.OrderBy(x => x.ProductName),
            ("productname", true) => filtered.OrderByDescending(x => x.ProductName),
            ("categoryname", false) => filtered.OrderBy(x => x.CategoryName),
            ("categoryname", true) => filtered.OrderByDescending(x => x.CategoryName),
            ("lastmovementdate", false) => filtered.OrderBy(x => x.LastMovementDate),
            ("lastmovementdate", true) => filtered.OrderByDescending(x => x.LastMovementDate),
            ("currentstock", false) => filtered.OrderBy(x => x.CurrentStock),
            _ => filtered.OrderByDescending(x => x.CurrentStock)
        };

        var filteredList = filtered.ToList();
        int totalCount = filteredList.Count;

        int pageIndex = filter.PageIndex < 1 ? 1 : filter.PageIndex;
        int pageSize = filter.PageSize < 1 ? 20 : (filter.PageSize > 100 ? 100 : filter.PageSize);

        var pagedItems = filteredList
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return new PagedResult<WarehouseInventoryItem>
        {
            Items = pagedItems,
            TotalCount = totalCount,
            PageIndex = pageIndex,
            PageSize = pageSize
        };
    }

    public async Task<WarehouseAnalyticsResponse?> GetWarehouseAnalyticsAsync(Guid warehouseId, string? datePreset, DateTime? fromDate, DateTime? toDate)
    {
        var warehouse = await _context.Warehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.Id == warehouseId);

        if (warehouse == null) return null;

        var (fromUtc, toUtc, _) = ResolveDateRange(datePreset, fromDate, toDate);
        var activitySummary = await GetWarehouseActivitySummaryAsync(warehouseId, datePreset, fromDate, toDate);

        // Top Moving Products during the period
        var topMovingData = await _context.StockMovements
            .AsNoTracking()
            .Include(sm => sm.Product)
                .ThenInclude(p => p.Category)
            .Include(sm => sm.Product)
                .ThenInclude(p => p.Brand)
            .Where(sm => sm.WarehouseId == warehouseId && sm.CreatedAt >= fromUtc && sm.CreatedAt < toUtc)
            .GroupBy(sm => new
            {
                sm.ProductId,
                sm.Product.Name,
                sm.Product.Sku,
                CategoryName = sm.Product.Category.Name,
                BrandName = sm.Product.Brand != null ? sm.Product.Brand.Name : null
            })
            .Select(g => new
            {
                g.Key.ProductId,
                g.Key.Name,
                g.Key.Sku,
                g.Key.CategoryName,
                g.Key.BrandName,
                TotalMoved = g.Sum(sm => sm.Quantity),
                QuantityIn = g.Sum(sm => (sm.Type == StockMovementType.Purchase ||
                                          sm.Type == StockMovementType.AdjustmentIn ||
                                          sm.Type == StockMovementType.TransferIn) ? sm.Quantity : 0m),
                QuantityOut = g.Sum(sm => (sm.Type == StockMovementType.Sale ||
                                           sm.Type == StockMovementType.AdjustmentOut ||
                                           sm.Type == StockMovementType.TransferOut) ? sm.Quantity : 0m),
                MovementCount = g.Count()
            })
            .OrderByDescending(x => x.TotalMoved)
            .Take(10)
            .ToListAsync();

        var topMoving = topMovingData.Select(x => new TopMovingProductDto
        {
            ProductId = x.ProductId,
            ProductName = x.Name,
            ProductSku = x.Sku,
            CategoryName = x.CategoryName,
            BrandName = x.BrandName,
            TotalQuantityMoved = x.TotalMoved,
            QuantityIn = x.QuantityIn,
            QuantityOut = x.QuantityOut,
            NetChange = x.QuantityIn - x.QuantityOut,
            MovementCount = x.MovementCount
        }).ToList();

        // Inventory snapshot for alerts & dormant items
        var invFilter = new WarehouseInventoryFilter
        {
            WarehouseId = warehouseId,
            PageSize = 500
        };
        var fullInventory = await GetWarehouseInventoryAsync(invFilter);

        var dormant = fullInventory.Items
            .Where(x => x.IsDormant)
            .Select(x => new DormantProductDto
            {
                ProductId = x.ProductId,
                ProductName = x.ProductName,
                ProductSku = x.ProductSku,
                CategoryName = x.CategoryName,
                BrandName = x.BrandName,
                CurrentStock = x.CurrentStock,
                LastMovementDate = x.LastMovementDate,
                DaysDormant = x.DaysSinceLastMovement ?? 999
            })
            .OrderByDescending(x => x.DaysDormant)
            .Take(10)
            .ToList();

        var lowStock = fullInventory.Items
            .Where(x => x.IsLowStock)
            .OrderBy(x => x.CurrentStock)
            .Take(10)
            .ToList();

        var stockedItems = fullInventory.Items.Where(x => x.HasStock).ToList();

        return new WarehouseAnalyticsResponse
        {
            WarehouseId = warehouse.Id,
            WarehouseName = warehouse.Name,
            WarehouseCode = warehouse.Code,
            CanAcceptAllCategories = warehouse.CanAcceptAllCategories,
            ActivitySummary = activitySummary,
            TopMovingProducts = topMoving,
            DormantProducts = dormant,
            LowStockAlerts = lowStock,
            TotalStockedProductsCount = stockedItems.Count,
            TotalUnitsInWarehouse = stockedItems.Sum(x => x.CurrentStock)
        };
    }

    public async Task<SupplierAnalyticsResponse?> GetSupplierAnalyticsAsync(Guid supplierId)
    {
        var supplier = await _context.Suppliers
            .AsNoTracking()
            .Include(s => s.SupplierProducts)
                .ThenInclude(sp => sp.Product)
                    .ThenInclude(p => p.Category)
            .Include(s => s.SupplierProducts)
                .ThenInclude(sp => sp.Product)
                    .ThenInclude(p => p.Brand)
            .FirstOrDefaultAsync(s => s.Id == supplierId);

        if (supplier == null) return null;

        // Load all stock movements for this supplier
        var stockMovements = await _context.SupplierStockMovements
            .AsNoTracking()
            .Where(ssm => ssm.SupplierId == supplierId)
            .ToListAsync();

        var productPerformance = new List<SupplierProductPerformanceDto>();

        foreach (var sp in supplier.SupplierProducts.Where(p => p.IsActive))
        {
            var pMovements = stockMovements.Where(m => m.ProductId == sp.ProductId).ToList();

            decimal replenishments = pMovements.Where(m => m.MovementType == SupplierStockMovementType.ExternalReplenishment).Sum(m => m.Quantity);
            decimal adjIn = pMovements.Where(m => m.MovementType == SupplierStockMovementType.AdjustmentIn).Sum(m => m.Quantity);
            decimal adjOut = pMovements.Where(m => m.MovementType == SupplierStockMovementType.AdjustmentOut).Sum(m => m.Quantity);
            decimal fulfilled = pMovements.Where(m => m.MovementType == SupplierStockMovementType.OrderFulfilledToWarehouse).Sum(m => m.Quantity);

            decimal onHand = Math.Max(0m, replenishments + adjIn - adjOut - fulfilled);

            decimal reserved = pMovements.Where(m => m.MovementType == SupplierStockMovementType.OrderReserved).Sum(m => m.Quantity)
                             - pMovements.Where(m => m.MovementType == SupplierStockMovementType.OrderReleased ||
                                                    m.MovementType == SupplierStockMovementType.OrderFulfilledToWarehouse).Sum(m => m.Quantity);
            reserved = Math.Max(0m, reserved);

            decimal atp = Math.Max(0m, onHand - reserved);

            productPerformance.Add(new SupplierProductPerformanceDto
            {
                ProductId = sp.ProductId,
                ProductName = sp.Product.Name,
                ProductSku = sp.Product.Sku,
                CategoryName = sp.Product.Category?.Name ?? "Unassigned",
                BrandName = sp.Product.Brand?.Name,
                LastPurchasePrice = sp.LastPurchasePrice,
                LeadTimeDays = sp.LeadTimeDays,
                IsPreferred = sp.IsPreferred,
                OnHand = onHand,
                Reserved = reserved,
                AvailableToPromise = atp,
                TotalSupplied = fulfilled
            });
        }

        var totalFulfilled = stockMovements
            .Where(m => m.MovementType == SupplierStockMovementType.OrderFulfilledToWarehouse)
            .Sum(m => m.Quantity);

        var totalPOs = await _context.PurchaseOrders
            .CountAsync(po => po.SupplierId == supplierId && po.Status == "Received");

        var leadTimes = supplier.SupplierProducts
            .Where(sp => sp.IsActive && sp.LeadTimeDays.HasValue)
            .Select(sp => sp.LeadTimeDays!.Value)
            .ToList();

        double avgLeadTime = leadTimes.Count > 0 ? leadTimes.Average() : 0.0;

        return new SupplierAnalyticsResponse
        {
            SupplierId = supplier.Id,
            SupplierName = supplier.Name,
            CanSupplyAllCategories = supplier.CanSupplyAllCategories,
            CanSupplyAllBrands = supplier.CanSupplyAllBrands,
            TotalCatalogProductsCount = productPerformance.Count,
            PreferredProductsCount = productPerformance.Count(p => p.IsPreferred),
            TotalOnHandStock = productPerformance.Sum(p => p.OnHand),
            TotalReservedStock = productPerformance.Sum(p => p.Reserved),
            TotalAvailableToPromise = productPerformance.Sum(p => p.AvailableToPromise),
            TotalUnitsSuppliedHistorically = totalFulfilled,
            TotalPurchaseOrdersFulfilled = totalPOs,
            AverageLeadTimeDays = Math.Round(avgLeadTime, 1),
            Products = productPerformance.OrderByDescending(p => p.TotalSupplied).ToList()
        };
    }
}
