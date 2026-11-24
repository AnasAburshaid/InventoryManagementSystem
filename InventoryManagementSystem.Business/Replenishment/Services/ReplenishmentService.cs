using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.AuditLogs.Services;
using InventoryManagementSystem.Business.PurchaseOrders;
using InventoryManagementSystem.Business.PurchaseOrders.DTOs;
using InventoryManagementSystem.Business.PurchaseOrders.Services;
using InventoryManagementSystem.Business.Replenishment.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.Replenishment.Services;

public class ReplenishmentService : IReplenishmentService
{
    private readonly InventoryDbContext _context;
    private readonly IPurchaseOrderService _purchaseOrderService;
    private readonly IAuditLogService _auditLogService;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public ReplenishmentService(
        InventoryDbContext context,
        IPurchaseOrderService purchaseOrderService,
        IAuditLogService auditLogService,
        IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _purchaseOrderService = purchaseOrderService;
        _auditLogService = auditLogService;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<IReadOnlyCollection<WarehouseProductSettingResponse>> GetSettingsAsync(
        Guid warehouseId,
        CancellationToken cancellationToken = default)
    {
        var settings = await _context.WarehouseProductSettings
            .AsNoTracking()
            .Include(s => s.Warehouse)
            .Include(s => s.Product)
            .Where(s => s.WarehouseId == warehouseId)
            .OrderBy(s => s.Product.Name)
            .ToListAsync(cancellationToken);

        return settings.Select(s => new WarehouseProductSettingResponse
        {
            Id = s.Id,
            WarehouseId = s.WarehouseId,
            WarehouseName = s.Warehouse?.Name ?? string.Empty,
            ProductId = s.ProductId,
            ProductName = s.Product?.Name ?? string.Empty,
            ProductSku = s.Product?.Sku ?? string.Empty,
            ReorderPoint = s.ReorderPoint,
            TargetStockLevel = s.TargetStockLevel,
            MinOrderQuantity = s.MinOrderQuantity,
            IsActive = s.IsActive,
            CreatedAt = s.CreatedAt,
            UpdatedAt = s.UpdatedAt
        }).ToList();
    }

    public async Task<ReplenishmentOperationResult<WarehouseProductSettingResponse>> UpsertSettingAsync(
        UpsertWarehouseProductSettingRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.ReorderPoint < 0 || request.TargetStockLevel < 0 || request.MinOrderQuantity <= 0)
        {
            return new ReplenishmentOperationResult<WarehouseProductSettingResponse>
            {
                Status = ReplenishmentOperationStatus.InvalidLevels,
                ErrorMessage = "Reorder point and target stock level must be non-negative, and min order quantity must be greater than zero."
            };
        }

        if (request.TargetStockLevel < request.ReorderPoint)
        {
            return new ReplenishmentOperationResult<WarehouseProductSettingResponse>
            {
                Status = ReplenishmentOperationStatus.InvalidLevels,
                ErrorMessage = "Target stock level cannot be less than reorder point."
            };
        }

        bool warehouseValid = await _context.Warehouses
            .AsNoTracking()
            .AnyAsync(w => w.Id == request.WarehouseId && w.IsActive, cancellationToken);

        if (!warehouseValid)
        {
            return new ReplenishmentOperationResult<WarehouseProductSettingResponse>
            {
                Status = ReplenishmentOperationStatus.WarehouseNotFoundOrInactive,
                ErrorMessage = "Warehouse not found or inactive."
            };
        }

        bool productValid = await _context.Products
            .AsNoTracking()
            .AnyAsync(p => p.Id == request.ProductId && p.IsActive, cancellationToken);

        if (!productValid)
        {
            return new ReplenishmentOperationResult<WarehouseProductSettingResponse>
            {
                Status = ReplenishmentOperationStatus.ProductNotFoundOrInactive,
                ErrorMessage = "Product not found or inactive."
            };
        }

        var setting = await _context.WarehouseProductSettings
            .FirstOrDefaultAsync(s => s.WarehouseId == request.WarehouseId && s.ProductId == request.ProductId, cancellationToken);

        if (setting == null)
        {
            setting = new WarehouseProductSetting
            {
                WarehouseId = request.WarehouseId,
                ProductId = request.ProductId,
                ReorderPoint = request.ReorderPoint,
                TargetStockLevel = request.TargetStockLevel,
                MinOrderQuantity = request.MinOrderQuantity,
                IsActive = request.IsActive,
                CreatedAt = DateTime.UtcNow
            };
            _context.WarehouseProductSettings.Add(setting);
        }
        else
        {
            setting.ReorderPoint = request.ReorderPoint;
            setting.TargetStockLevel = request.TargetStockLevel;
            setting.MinOrderQuantity = request.MinOrderQuantity;
            setting.IsActive = request.IsActive;
            setting.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            "UpsertWarehouseProductSetting",
            "WarehouseProductSetting",
            setting.Id.ToString(),
            setting.WarehouseId,
            new { setting.ProductId, setting.ReorderPoint, setting.TargetStockLevel, setting.MinOrderQuantity },
            cancellationToken);

        var loaded = await _context.WarehouseProductSettings
            .AsNoTracking()
            .Include(s => s.Warehouse)
            .Include(s => s.Product)
            .FirstAsync(s => s.Id == setting.Id, cancellationToken);

        return new ReplenishmentOperationResult<WarehouseProductSettingResponse>
        {
            Status = ReplenishmentOperationStatus.Success,
            Data = new WarehouseProductSettingResponse
            {
                Id = loaded.Id,
                WarehouseId = loaded.WarehouseId,
                WarehouseName = loaded.Warehouse?.Name ?? string.Empty,
                ProductId = loaded.ProductId,
                ProductName = loaded.Product?.Name ?? string.Empty,
                ProductSku = loaded.Product?.Sku ?? string.Empty,
                ReorderPoint = loaded.ReorderPoint,
                TargetStockLevel = loaded.TargetStockLevel,
                MinOrderQuantity = loaded.MinOrderQuantity,
                IsActive = loaded.IsActive,
                CreatedAt = loaded.CreatedAt,
                UpdatedAt = loaded.UpdatedAt
            }
        };
    }

    public async Task<IReadOnlyCollection<ReplenishmentSuggestionResponse>> GetSuggestionsAsync(
        Guid warehouseId,
        bool onlyBelowReorderPoint = true,
        CancellationToken cancellationToken = default)
    {
        var warehouse = await _context.Warehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.Id == warehouseId, cancellationToken);

        if (warehouse == null) return Array.Empty<ReplenishmentSuggestionResponse>();

        var settings = await _context.WarehouseProductSettings
            .AsNoTracking()
            .Include(s => s.Product)
                .ThenInclude(p => p.UnitOfMeasure)
            .Where(s => s.WarehouseId == warehouseId && s.IsActive && s.Product.IsActive)
            .ToListAsync(cancellationToken);

        var inboundTypes = new[] { StockMovementType.Purchase, StockMovementType.AdjustmentIn, StockMovementType.TransferIn };
        var outboundTypes = new[] { StockMovementType.Sale, StockMovementType.AdjustmentOut, StockMovementType.TransferOut };

        var openPoStatuses = new[] { "Draft", "Submitted", "Approved", "PartiallyReceived" };
        var openSoStatuses = new[] { "Draft", "Submitted", "Approved", "Processing" };

        var suggestions = new List<ReplenishmentSuggestionResponse>();

        foreach (var setting in settings)
        {
            // 1. Current On-Hand Stock from Ledger
            decimal inbound = await _context.StockMovements
                .AsNoTracking()
                .Where(m => m.WarehouseId == warehouseId && m.ProductId == setting.ProductId && inboundTypes.Contains(m.Type))
                .SumAsync(m => (decimal?)m.Quantity, cancellationToken) ?? 0m;

            decimal outbound = await _context.StockMovements
                .AsNoTracking()
                .Where(m => m.WarehouseId == warehouseId && m.ProductId == setting.ProductId && outboundTypes.Contains(m.Type))
                .SumAsync(m => (decimal?)m.Quantity, cancellationToken) ?? 0m;

            decimal currentStock = inbound - outbound;

            // 2. On-Order Stock from Open Purchase Orders
            decimal onOrderStock = await _context.PurchaseOrderLines
                .AsNoTracking()
                .Where(l => l.PurchaseOrder.WarehouseId == warehouseId
                            && l.ProductId == setting.ProductId
                            && openPoStatuses.Contains(l.PurchaseOrder.Status))
                .SumAsync(l => (decimal?)(l.QuantityOrdered - l.QuantityReceived), cancellationToken) ?? 0m;

            // 3. Reserved Stock from Open Sales Orders
            decimal reservedStock = await _context.SalesOrderLines
                .AsNoTracking()
                .Where(l => l.SalesOrder.WarehouseId == warehouseId
                            && l.ProductId == setting.ProductId
                            && openSoStatuses.Contains(l.SalesOrder.Status))
                .SumAsync(l => (decimal?)(l.QuantityOrdered - l.QuantityFulfilled), cancellationToken) ?? 0m;

            // 4. Effective Stock & Suggestions
            decimal effectiveStock = currentStock + onOrderStock - reservedStock;
            bool needsReplenishment = (effectiveStock <= setting.ReorderPoint) || (currentStock <= setting.ReorderPoint);

            if (onlyBelowReorderPoint && !needsReplenishment)
            {
                continue;
            }

            decimal rawSuggested = setting.TargetStockLevel - effectiveStock;
            decimal suggestedQty = Math.Max(0m, rawSuggested);

            if (suggestedQty > 0m && suggestedQty < setting.MinOrderQuantity)
            {
                suggestedQty = setting.MinOrderQuantity;
            }

            // Find preferred / available supplier
            var preferredSupplierProduct = await _context.SupplierProducts
                .AsNoTracking()
                .Include(sp => sp.Supplier)
                .Where(sp => sp.ProductId == setting.ProductId && sp.IsActive && sp.Supplier.IsActive)
                .OrderByDescending(sp => sp.IsPreferred)
                .ThenBy(sp => sp.LastPurchasePrice)
                .FirstOrDefaultAsync(cancellationToken);

            suggestions.Add(new ReplenishmentSuggestionResponse
            {
                WarehouseId = warehouseId,
                WarehouseName = warehouse.Name,
                ProductId = setting.ProductId,
                ProductName = setting.Product.Name,
                ProductSku = setting.Product.Sku,
                UnitOfMeasureName = setting.Product.UnitOfMeasure?.Name,
                CurrentStock = currentStock,
                OnOrderStock = onOrderStock,
                ReservedStock = reservedStock,
                EffectiveStock = effectiveStock,
                ReorderPoint = setting.ReorderPoint,
                TargetStockLevel = setting.TargetStockLevel,
                SuggestedQuantity = suggestedQty,
                PreferredSupplierId = preferredSupplierProduct?.SupplierId,
                PreferredSupplierName = preferredSupplierProduct?.Supplier?.Name,
                PreferredSupplierUnitPrice = preferredSupplierProduct?.LastPurchasePrice,
                SupplierProductCode = preferredSupplierProduct?.SupplierProductCode,
                IsCriticallyLow = currentStock <= 0m
            });
        }

        return suggestions;
    }

    public async Task<ReplenishmentOperationResult<PurchaseOrderResponse>> ConvertSuggestionToPoAsync(
        ConvertSuggestionToPoRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Quantity <= 0)
        {
            return new ReplenishmentOperationResult<PurchaseOrderResponse>
            {
                Status = ReplenishmentOperationStatus.InvalidQuantity,
                ErrorMessage = "Replenishment order quantity must be greater than zero."
            };
        }

        var product = await _context.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == request.ProductId && p.IsActive, cancellationToken);

        if (product == null)
        {
            return new ReplenishmentOperationResult<PurchaseOrderResponse>
            {
                Status = ReplenishmentOperationStatus.ProductNotFoundOrInactive,
                ErrorMessage = "Product not found or inactive."
            };
        }

        Guid supplierId;
        decimal unitPrice = request.UnitPrice ?? 0m;

        if (request.SupplierId.HasValue)
        {
            supplierId = request.SupplierId.Value;
            var supplier = await _context.Suppliers.AsNoTracking().FirstOrDefaultAsync(s => s.Id == supplierId && s.IsActive, cancellationToken);
            if (supplier == null)
            {
                return new ReplenishmentOperationResult<PurchaseOrderResponse>
                {
                    Status = ReplenishmentOperationStatus.SupplierNotFound,
                    ErrorMessage = "Specified supplier was not found or is inactive."
                };
            }
        }
        else
        {
            var preferred = await _context.SupplierProducts
                .AsNoTracking()
                .Include(sp => sp.Supplier)
                .Where(sp => sp.ProductId == request.ProductId && sp.IsActive && sp.Supplier.IsActive)
                .OrderByDescending(sp => sp.IsPreferred)
                .FirstOrDefaultAsync(cancellationToken);

            if (preferred == null)
            {
                return new ReplenishmentOperationResult<PurchaseOrderResponse>
                {
                    Status = ReplenishmentOperationStatus.SupplierNotFound,
                    ErrorMessage = "No active supplier found offering this product."
                };
            }

            supplierId = preferred.SupplierId;
            if (unitPrice == 0m && preferred.LastPurchasePrice.HasValue)
            {
                unitPrice = preferred.LastPurchasePrice.Value;
            }
        }

        var createPoRequest = new CreatePurchaseOrderRequest
        {
            WarehouseId = request.WarehouseId,
            SupplierId = supplierId,
            OrderDate = DateTime.UtcNow,
            ExpectedDeliveryDate = DateTime.UtcNow.AddDays(7),
            Notes = request.Notes ?? $"Auto-generated replenishment purchase order for {product.Sku}",
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest
                {
                    ProductId = request.ProductId,
                    QuantityOrdered = request.Quantity,
                    UnitCost = unitPrice
                }
            }
        };

        var poResult = await _purchaseOrderService.CreateAsync(createPoRequest);
        if (poResult.Status != PurchaseOrderOperationStatus.Success || poResult.Data == null)
        {
            return new ReplenishmentOperationResult<PurchaseOrderResponse>
            {
                Status = ReplenishmentOperationStatus.PoCreationFailed,
                ErrorMessage = $"Failed to create purchase order: {poResult.Status}"
            };
        }

        await _auditLogService.LogAsync(
            "ConvertReplenishmentSuggestionToPO",
            "PurchaseOrder",
            poResult.Data.Id.ToString(),
            request.WarehouseId,
            new { poResult.Data.PurchaseOrderNumber, request.ProductId, request.Quantity, SupplierId = supplierId },
            cancellationToken);

        return new ReplenishmentOperationResult<PurchaseOrderResponse>
        {
            Status = ReplenishmentOperationStatus.Success,
            Data = poResult.Data
        };
    }
}
