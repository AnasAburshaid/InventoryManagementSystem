using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.Suppliers.Capabilities.Services;
using InventoryManagementSystem.Business.Suppliers.Stock.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.Suppliers.Stock.Services;

public class SupplierStockService : ISupplierStockService
{
    private static readonly ConcurrentDictionary<Guid, SemaphoreSlim> _supplierLocks = new();
    private readonly InventoryDbContext _context;
    private readonly ISupplierCapabilityService _capabilityService;

    public SupplierStockService(InventoryDbContext context, ISupplierCapabilityService capabilityService)
    {
        _context = context;
        _capabilityService = capabilityService;
    }

    public async Task<(bool isSuccess, string? error, SupplierStockMovementResponse? data)> RecordReplenishmentAsync(
        Guid supplierId,
        RecordSupplierReplenishmentRequest request,
        string userId)
    {
        if (request.Quantity <= 0)
            return (false, "Replenishment quantity must be greater than 0.", null);

        var supplier = await _context.Suppliers.FindAsync(supplierId);
        if (supplier == null)
            return (false, "Supplier not found.", null);

        if (!supplier.IsActive)
            return (false, $"Supplier '{supplier.Name}' is inactive.", null);

        var product = await _context.Products.FindAsync(request.ProductId);
        if (product == null)
            return (false, "Product not found.", null);

        // Capability Validation: Supplier must be authorized for this product's category and brand
        var (isEligible, reason) = await _capabilityService.ValidateProductEligibilityAsync(supplierId, request.ProductId);
        if (!isEligible)
        {
            return (false, reason ?? "Supplier is not authorized to supply this product under its capability matrix.", null);
        }

        // Ensure supplier offers this product (auto-provision catalog link if authorized product not yet cataloged)
        var supplierProduct = await _context.SupplierProducts
            .FirstOrDefaultAsync(sp => sp.SupplierId == supplierId && sp.ProductId == request.ProductId);

        if (supplierProduct == null)
        {
            var supClean = new string(supplier.Name.Where(char.IsLetterOrDigit).Take(4).ToArray()).ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(supClean)) supClean = "VND";
            var skuPart = !string.IsNullOrWhiteSpace(product.Sku) ? product.Sku.Trim().ToUpperInvariant() : "PRD";
            var genCode = $"SUP-{supClean}-{skuPart}";

            supplierProduct = new SupplierProduct
            {
                Id = Guid.NewGuid(),
                SupplierId = supplierId,
                ProductId = request.ProductId,
                SupplierProductCode = genCode,
                LastPurchasePrice = request.UnitCost,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            _context.SupplierProducts.Add(supplierProduct);
        }
        else if (!supplierProduct.IsActive)
        {
            supplierProduct.IsActive = true;
            if (request.UnitCost.HasValue)
            {
                supplierProduct.LastPurchasePrice = request.UnitCost;
            }
        }

        var movement = new SupplierStockMovement
        {
            Id = Guid.NewGuid(),
            SupplierId = supplierId,
            ProductId = request.ProductId,
            MovementType = SupplierStockMovementType.ExternalReplenishment,
            Quantity = request.Quantity,
            UnitCost = request.UnitCost,
            ReferenceType = "ExternalReplenishment",
            ReferenceId = string.IsNullOrWhiteSpace(request.ReferenceId)
                ? $"REP-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}"
                : request.ReferenceId.Trim(),
            Notes = request.Notes?.Trim(),
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        // If unit cost provided, update last known purchase price
        if (request.UnitCost.HasValue && request.UnitCost.Value > 0)
        {
            supplierProduct.LastPurchasePrice = request.UnitCost.Value;
        }

        _context.SupplierStockMovements.Add(movement);
        await _context.SaveChangesAsync();

        var response = new SupplierStockMovementResponse
        {
            Id = movement.Id,
            SupplierId = movement.SupplierId,
            SupplierName = supplier.Name,
            ProductId = movement.ProductId,
            ProductName = product.Name,
            ProductSku = product.Sku,
            MovementType = movement.MovementType.ToString(),
            Quantity = movement.Quantity,
            UnitCost = movement.UnitCost,
            ReferenceType = movement.ReferenceType,
            ReferenceId = movement.ReferenceId,
            Notes = movement.Notes,
            CreatedByUserId = movement.CreatedByUserId,
            CreatedAt = movement.CreatedAt
        };

        return (true, null, response);
    }

    public async Task<(bool isSuccess, string? error, SupplierStockMovementResponse? data)> RecordAdjustmentAsync(
        Guid supplierId,
        SupplierStockAdjustmentRequest request,
        string userId)
    {
        if (request.Quantity <= 0)
            return (false, "Adjustment quantity must be greater than 0.", null);

        var supplier = await _context.Suppliers.FindAsync(supplierId);
        if (supplier == null)
            return (false, "Supplier not found.", null);

        var product = await _context.Products.FindAsync(request.ProductId);
        if (product == null)
            return (false, "Product not found.", null);

        var (isEligible, reason) = await _capabilityService.ValidateProductEligibilityAsync(supplierId, request.ProductId);
        if (!isEligible)
        {
            return (false, reason ?? "Supplier is not authorized to supply this product under its capability matrix.", null);
        }

        if (!request.IsIncrease)
        {
            var summary = await GetProductStockSummaryAsync(supplierId, request.ProductId);
            decimal currentOnHand = summary?.OnHandQuantity ?? 0m;
            if (currentOnHand - request.Quantity < 0)
            {
                return (false, $"Cannot reduce stock by {request.Quantity}. Current supplier on-hand is only {currentOnHand}.", null);
            }
        }

        var movement = new SupplierStockMovement
        {
            Id = Guid.NewGuid(),
            SupplierId = supplierId,
            ProductId = request.ProductId,
            MovementType = request.IsIncrease
                ? SupplierStockMovementType.AdjustmentIn
                : SupplierStockMovementType.AdjustmentOut,
            Quantity = request.Quantity,
            ReferenceType = "Correction",
            ReferenceId = string.IsNullOrWhiteSpace(request.ReferenceId)
                ? $"ADJ-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}"
                : request.ReferenceId.Trim(),
            Notes = request.Notes.Trim(),
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        _context.SupplierStockMovements.Add(movement);
        await _context.SaveChangesAsync();

        var response = new SupplierStockMovementResponse
        {
            Id = movement.Id,
            SupplierId = movement.SupplierId,
            SupplierName = supplier.Name,
            ProductId = movement.ProductId,
            ProductName = product.Name,
            ProductSku = product.Sku,
            MovementType = movement.MovementType.ToString(),
            Quantity = movement.Quantity,
            ReferenceType = movement.ReferenceType,
            ReferenceId = movement.ReferenceId,
            Notes = movement.Notes,
            CreatedByUserId = movement.CreatedByUserId,
            CreatedAt = movement.CreatedAt
        };

        return (true, null, response);
    }

    public async Task<SupplierStockSummaryResponse?> GetProductStockSummaryAsync(Guid supplierId, Guid productId)
    {
        var supplier = await _context.Suppliers.AsNoTracking().FirstOrDefaultAsync(s => s.Id == supplierId);
        if (supplier == null) return null;

        var product = await _context.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == productId);
        if (product == null) return null;

        var supplierProduct = await _context.SupplierProducts
            .AsNoTracking()
            .FirstOrDefaultAsync(sp => sp.SupplierId == supplierId && sp.ProductId == productId);

        var agg = await _context.SupplierStockMovements
            .AsNoTracking()
            .Where(sm => sm.SupplierId == supplierId && sm.ProductId == productId)
            .GroupBy(sm => 1)
            .Select(g => new
            {
                OnHand = g.Sum(m =>
                    (m.MovementType == SupplierStockMovementType.ExternalReplenishment ||
                     m.MovementType == SupplierStockMovementType.AdjustmentIn) ? m.Quantity :
                    (m.MovementType == SupplierStockMovementType.OrderFulfilledToWarehouse ||
                     m.MovementType == SupplierStockMovementType.AdjustmentOut) ? -m.Quantity : 0m),
                Reserved = g.Sum(m =>
                    (m.MovementType == SupplierStockMovementType.OrderReserved) ? m.Quantity :
                    (m.MovementType == SupplierStockMovementType.OrderReleased) ? -m.Quantity :
                    (m.MovementType == SupplierStockMovementType.OrderFulfilledToWarehouse && m.ReferenceType == "PurchaseOrder" && (m.ReferenceId == null || !m.ReferenceId.Contains("DIRECT-RECEIPT"))) ? -m.Quantity : 0m),
                LastReplenishedAt = g.Where(m => m.MovementType == SupplierStockMovementType.ExternalReplenishment)
                                     .Max(m => (DateTime?)m.CreatedAt)
            })
            .FirstOrDefaultAsync();

        decimal onHand = Math.Max(0m, agg?.OnHand ?? 0m);
        decimal reserved = Math.Max(0m, agg?.Reserved ?? 0m);
        decimal atp = Math.Max(0m, onHand - reserved);

        return new SupplierStockSummaryResponse
        {
            SupplierId = supplier.Id,
            SupplierName = supplier.Name,
            ProductId = product.Id,
            ProductName = product.Name,
            ProductSku = product.Sku,
            OnHandQuantity = onHand,
            ReservedQuantity = reserved,
            AvailableToPromiseQuantity = atp,
            LastPurchasePrice = supplierProduct?.LastPurchasePrice,
            IsPreferred = supplierProduct?.IsPreferred ?? false,
            LastReplenishedAt = agg?.LastReplenishedAt
        };
    }

    public async Task<IReadOnlyCollection<SupplierStockSummaryResponse>> GetSupplierStockSummariesAsync(Guid supplierId)
    {
        var supplier = await _context.Suppliers
            .AsNoTracking()
            .Include(s => s.SupplierProducts)
                .ThenInclude(sp => sp.Product)
            .FirstOrDefaultAsync(s => s.Id == supplierId);

        if (supplier == null) return Array.Empty<SupplierStockSummaryResponse>();

        var aggregates = await _context.SupplierStockMovements
            .AsNoTracking()
            .Where(sm => sm.SupplierId == supplierId)
            .GroupBy(sm => sm.ProductId)
            .Select(g => new
            {
                ProductId = g.Key,
                OnHand = g.Sum(m =>
                    (m.MovementType == SupplierStockMovementType.ExternalReplenishment ||
                     m.MovementType == SupplierStockMovementType.AdjustmentIn) ? m.Quantity :
                    (m.MovementType == SupplierStockMovementType.OrderFulfilledToWarehouse ||
                     m.MovementType == SupplierStockMovementType.AdjustmentOut) ? -m.Quantity : 0m),
                Reserved = g.Sum(m =>
                    (m.MovementType == SupplierStockMovementType.OrderReserved) ? m.Quantity :
                    (m.MovementType == SupplierStockMovementType.OrderReleased) ? -m.Quantity :
                    (m.MovementType == SupplierStockMovementType.OrderFulfilledToWarehouse && m.ReferenceType == "PurchaseOrder" && (m.ReferenceId == null || !m.ReferenceId.Contains("DIRECT-RECEIPT"))) ? -m.Quantity : 0m),
                LastReplenishedAt = g.Where(m => m.MovementType == SupplierStockMovementType.ExternalReplenishment)
                                     .Max(m => (DateTime?)m.CreatedAt)
            })
            .ToDictionaryAsync(x => x.ProductId);

        var results = new List<SupplierStockSummaryResponse>();

        foreach (var sp in supplier.SupplierProducts.Where(sp => sp.IsActive))
        {
            aggregates.TryGetValue(sp.ProductId, out var agg);

            decimal onHand = Math.Max(0m, agg?.OnHand ?? 0m);
            decimal reserved = Math.Max(0m, agg?.Reserved ?? 0m);
            decimal atp = Math.Max(0m, onHand - reserved);

            results.Add(new SupplierStockSummaryResponse
            {
                SupplierId = supplier.Id,
                SupplierName = supplier.Name,
                ProductId = sp.ProductId,
                ProductName = sp.Product.Name,
                ProductSku = sp.Product.Sku,
                OnHandQuantity = onHand,
                ReservedQuantity = reserved,
                AvailableToPromiseQuantity = atp,
                LastPurchasePrice = sp.LastPurchasePrice,
                IsPreferred = sp.IsPreferred,
                LastReplenishedAt = agg?.LastReplenishedAt
            });
        }

        return results.OrderBy(r => r.ProductName).ToList();
    }

    public async Task<IReadOnlyCollection<SupplierStockMovementResponse>> GetLedgerHistoryAsync(Guid supplierId, Guid? productId = null)
    {
        var query = _context.SupplierStockMovements
            .AsNoTracking()
            .Include(m => m.Supplier)
            .Include(m => m.Product)
            .Where(m => m.SupplierId == supplierId);

        if (productId.HasValue)
        {
            query = query.Where(m => m.ProductId == productId.Value);
        }

        return await query
            .OrderByDescending(m => m.CreatedAt)
            .Select(m => new SupplierStockMovementResponse
            {
                Id = m.Id,
                SupplierId = m.SupplierId,
                SupplierName = m.Supplier.Name,
                ProductId = m.ProductId,
                ProductName = m.Product.Name,
                ProductSku = m.Product.Sku,
                MovementType = m.MovementType.ToString(),
                Quantity = m.Quantity,
                UnitCost = m.UnitCost,
                ReferenceType = m.ReferenceType,
                ReferenceId = m.ReferenceId,
                Notes = m.Notes,
                CreatedByUserId = m.CreatedByUserId,
                CreatedAt = m.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<(bool isSuccess, string? error)> ReserveStockForPurchaseOrderAsync(PurchaseOrder po, string userId)
    {
        var semaphore = _supplierLocks.GetOrAdd(po.SupplierId, _ => new SemaphoreSlim(1, 1));
        await semaphore.WaitAsync();
        try
        {
            foreach (var line in po.PurchaseOrderLines)
            {
                // Acquire pessimistic row lock on the SupplierProduct row to serialize competing orders (SQL Server)
                if (_context.Database.IsRelational())
                {
                    await _context.Database.ExecuteSqlInterpolatedAsync(
                        $"SELECT 1 FROM SupplierProduct WITH (UPDLOCK, ROWLOCK) WHERE SupplierId = {po.SupplierId} AND ProductId = {line.ProductId} AND IsActive = 1"
                    );
                }

                var summary = await GetProductStockSummaryAsync(po.SupplierId, line.ProductId);
                decimal atp = summary?.AvailableToPromiseQuantity ?? 0m;

                if (line.QuantityOrdered > atp)
                {
                    var product = await _context.Products.FindAsync(line.ProductId);
                    string pName = product?.Name ?? line.ProductId.ToString();
                    return (false, $"Insufficient supplier stock for product '{pName}'. Available: {atp}, Requested: {line.QuantityOrdered}");
                }

                var reservation = new SupplierStockMovement
                {
                    Id = Guid.NewGuid(),
                    SupplierId = po.SupplierId,
                    ProductId = line.ProductId,
                    MovementType = SupplierStockMovementType.OrderReserved,
                    Quantity = line.QuantityOrdered,
                    ReferenceType = "PurchaseOrder",
                    ReferenceId = $"{po.PurchaseOrderNumber}#L{line.LineNumber}#Reserve",
                    Notes = $"Reserved for purchase order {po.PurchaseOrderNumber} Line {line.LineNumber}",
                    CreatedByUserId = userId,
                    CreatedAt = DateTime.UtcNow
                };

                _context.SupplierStockMovements.Add(reservation);
            }

            await _context.SaveChangesAsync();
            return (true, null);
        }
        finally
        {
            semaphore.Release();
        }
    }

    public async Task<(bool isSuccess, string? error)> ReleaseReservationForPurchaseOrderAsync(PurchaseOrder po, string userId)
    {
        foreach (var line in po.PurchaseOrderLines)
        {
            decimal unreceived = line.QuantityOrdered - line.QuantityReceived;
            if (unreceived > 0)
            {
                var release = new SupplierStockMovement
                {
                    Id = Guid.NewGuid(),
                    SupplierId = po.SupplierId,
                    ProductId = line.ProductId,
                    MovementType = SupplierStockMovementType.OrderReleased,
                    Quantity = unreceived,
                    ReferenceType = "PurchaseOrder",
                    ReferenceId = $"{po.PurchaseOrderNumber}#L{line.LineNumber}#Release",
                    Notes = $"Released unreceived balance for cancelled purchase order {po.PurchaseOrderNumber}",
                    CreatedByUserId = userId,
                    CreatedAt = DateTime.UtcNow
                };

                _context.SupplierStockMovements.Add(release);
            }
        }

        await _context.SaveChangesAsync();
        return (true, null);
    }

    public async Task<(bool isSuccess, string? error)> FulfillStockForReceiptAsync(
        Guid supplierId,
        Guid productId,
        decimal quantity,
        string poNumber,
        int lineNumber,
        string userId)
    {
        if (quantity <= 0) return (true, null);

        var fulfillment = new SupplierStockMovement
        {
            Id = Guid.NewGuid(),
            SupplierId = supplierId,
            ProductId = productId,
            MovementType = SupplierStockMovementType.OrderFulfilledToWarehouse,
            Quantity = quantity,
            ReferenceType = "PurchaseOrder",
            ReferenceId = $"{poNumber}#L{lineNumber}#Rcv#{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
            Notes = $"Fulfilled to warehouse from purchase order {poNumber} Line {lineNumber}",
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        _context.SupplierStockMovements.Add(fulfillment);
        await _context.SaveChangesAsync();
        return (true, null);
    }
}
