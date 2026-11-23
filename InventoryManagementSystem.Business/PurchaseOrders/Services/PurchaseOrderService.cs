using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.PurchaseOrders.DTOs;
using InventoryManagementSystem.Business.Suppliers.Capabilities.Services;
using InventoryManagementSystem.Business.Suppliers.Stock.Services;
using InventoryManagementSystem.Business.Warehouses.Restrictions.Services;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.PurchaseOrders.Services;

public class PurchaseOrderService : IPurchaseOrderService
{
    private readonly InventoryDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly PurchaseOrderNumberGenerator _numberGenerator;
    private readonly ISupplierCapabilityService _capabilityService;
    private readonly ISupplierStockService _supplierStockService;
    private readonly IWarehouseRestrictionService _warehouseRestrictionService;

    public PurchaseOrderService(
        InventoryDbContext context,
        IHttpContextAccessor httpContextAccessor,
        PurchaseOrderNumberGenerator numberGenerator,
        ISupplierCapabilityService capabilityService,
        ISupplierStockService supplierStockService,
        IWarehouseRestrictionService warehouseRestrictionService)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
        _numberGenerator = numberGenerator;
        _capabilityService = capabilityService;
        _supplierStockService = supplierStockService;
        _warehouseRestrictionService = warehouseRestrictionService;
    }

    private string GetCurrentUserId()
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";
    }

    public async Task<IReadOnlyCollection<PurchaseOrderResponse>> GetAllAsync(
        Guid? warehouseId = null,
        Guid? supplierId = null,
        string? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null)
    {
        var query = _context.PurchaseOrders
            .AsNoTracking()
            .Include(po => po.Supplier)
            .Include(po => po.Warehouse)
            .Include(po => po.PurchaseOrderLines)
                .ThenInclude(pol => pol.Product)
            .AsQueryable();

        if (warehouseId.HasValue)
        {
            query = query.Where(po => po.WarehouseId == warehouseId.Value);
        }

        if (supplierId.HasValue)
        {
            query = query.Where(po => po.SupplierId == supplierId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(po => po.Status == status);
        }

        if (fromDate.HasValue)
        {
            DateTime startBoundary = fromDate.Value.Kind == DateTimeKind.Utc ? fromDate.Value : fromDate.Value.Date;
            query = query.Where(po => po.OrderDate >= startBoundary);
        }

        if (toDate.HasValue)
        {
            DateTime endBoundary = toDate.Value.TimeOfDay == TimeSpan.Zero
                ? toDate.Value.Date.AddDays(1).AddTicks(-1)
                : toDate.Value;
            query = query.Where(po => po.OrderDate <= endBoundary);
        }

        var list = await query
            .OrderByDescending(po => po.OrderDate)
            .ThenByDescending(po => po.CreatedAt)
            .ToListAsync();

        return list.Select(MapToResponse).ToList();
    }

    public async Task<PurchaseOrderResponse?> GetByIdAsync(Guid id)
    {
        var po = await _context.PurchaseOrders
            .AsNoTracking()
            .Include(p => p.Supplier)
            .Include(p => p.Warehouse)
            .Include(p => p.PurchaseOrderLines)
                .ThenInclude(pol => pol.Product)
            .FirstOrDefaultAsync(p => p.Id == id);

        return po is null ? null : MapToResponse(po);
    }

    public async Task<PurchaseOrderResponse?> GetByNumberAsync(string purchaseOrderNumber)
    {
        var po = await _context.PurchaseOrders
            .AsNoTracking()
            .Include(p => p.Supplier)
            .Include(p => p.Warehouse)
            .Include(p => p.PurchaseOrderLines)
                .ThenInclude(pol => pol.Product)
            .FirstOrDefaultAsync(p => p.PurchaseOrderNumber == purchaseOrderNumber);

        return po is null ? null : MapToResponse(po);
    }

    public async Task<PurchaseOrderOperationResult<PurchaseOrderResponse>> CreateAsync(CreatePurchaseOrderRequest request)
    {
        if (request.Lines == null || request.Lines.Count == 0)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.EmptyLines,
                Message = "Purchase order must contain at least one line item."
            };
        }

        var supplier = await _context.Suppliers.AsNoTracking().FirstOrDefaultAsync(s => s.Id == request.SupplierId);
        if (supplier == null)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.SupplierNotFound,
                Message = "Supplier was not found."
            };
        }

        if (!supplier.IsActive)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.SupplierInactive,
                Message = "Cannot create a purchase order for an inactive supplier."
            };
        }

        var warehouse = await _context.Warehouses.AsNoTracking().FirstOrDefaultAsync(w => w.Id == request.WarehouseId);
        if (warehouse == null)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.WarehouseNotFound,
                Message = "Destination warehouse was not found."
            };
        }

        if (!warehouse.IsActive)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.WarehouseInactive,
                Message = "Cannot create a purchase order for an inactive warehouse."
            };
        }

        DateTime orderDate = request.OrderDate ?? DateTime.UtcNow;
        DateTime? expectedDeliveryDate = null;
        if (request.ExpectedDeliveryDate.HasValue)
        {
            if (request.ExpectedDeliveryDate.Value.Date < orderDate.Date)
            {
                return new PurchaseOrderOperationResult<PurchaseOrderResponse>
                {
                    Status = PurchaseOrderOperationStatus.InvalidDeliveryDate,
                    Message = "Expected delivery date cannot be earlier than the order date."
                };
            }

            DateTime exp = request.ExpectedDeliveryDate.Value;
            if (exp < orderDate)
            {
                exp = exp.Date.AddDays(1).AddTicks(-1);
            }
            expectedDeliveryDate = exp;
        }

        var productIds = request.Lines.Select(l => l.ProductId).Distinct().ToList();
        if (productIds.Count != request.Lines.Count)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.DuplicateProductInLines,
                Message = "A product cannot appear multiple times in the same purchase order. Please combine quantities."
            };
        }

        var existingProducts = await _context.Products
            .AsNoTracking()
            .Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id);

        foreach (var lineReq in request.Lines)
        {
            if (!existingProducts.TryGetValue(lineReq.ProductId, out var product))
            {
                return new PurchaseOrderOperationResult<PurchaseOrderResponse>
                {
                    Status = PurchaseOrderOperationStatus.ProductNotFound,
                    Message = $"Product with ID '{lineReq.ProductId}' was not found."
                };
            }

            if (!product.IsActive)
            {
                return new PurchaseOrderOperationResult<PurchaseOrderResponse>
                {
                    Status = PurchaseOrderOperationStatus.ProductInactive,
                    Message = $"Product '{product.Name}' is inactive and cannot be ordered."
                };
            }

            // Capability validation
            var (isEligible, reason) = await _capabilityService.ValidateProductEligibilityAsync(request.SupplierId, lineReq.ProductId);
            if (!isEligible)
            {
                return new PurchaseOrderOperationResult<PurchaseOrderResponse>
                {
                    Status = PurchaseOrderOperationStatus.ProductNotOfferedBySupplier,
                    Message = reason ?? $"Product '{product.Name}' violates supplier capability rules."
                };
            }

            // Warehouse category restriction check
            var (isWhEligible, whReason) = await _warehouseRestrictionService.ValidateCategoryEligibilityAsync(request.WarehouseId, product.CategoryId);
            if (!isWhEligible)
            {
                return new PurchaseOrderOperationResult<PurchaseOrderResponse>
                {
                    Status = PurchaseOrderOperationStatus.CategoryNotAllowedInWarehouse,
                    Message = whReason ?? $"Destination warehouse is not authorized to accept products in category '{product.CategoryId}'."
                };
            }

            if (lineReq.QuantityOrdered <= 0)
            {
                return new PurchaseOrderOperationResult<PurchaseOrderResponse>
                {
                    Status = PurchaseOrderOperationStatus.InvalidLineQuantity,
                    Message = $"Quantity ordered for product '{product.Name}' must be greater than 0."
                };
            }

            if (lineReq.UnitCost < 0)
            {
                return new PurchaseOrderOperationResult<PurchaseOrderResponse>
                {
                    Status = PurchaseOrderOperationStatus.InvalidLineCost,
                    Message = $"Unit cost for product '{product.Name}' cannot be negative."
                };
            }
        }

        string orderNumber;
        do
        {
            orderNumber = _numberGenerator.Generate();
        } while (await _context.PurchaseOrders.AnyAsync(po => po.PurchaseOrderNumber == orderNumber));

        string userId = GetCurrentUserId();

        var purchaseOrder = new PurchaseOrder
        {
            Id = Guid.NewGuid(),
            PurchaseOrderNumber = orderNumber,
            SupplierId = request.SupplierId,
            WarehouseId = request.WarehouseId,
            OrderDate = orderDate,
            ExpectedDeliveryDate = expectedDeliveryDate,
            Status = PurchaseOrderStatuses.Draft,
            Notes = request.Notes?.Trim(),
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        int lineNumber = 1;
        foreach (var lineReq in request.Lines)
        {
            purchaseOrder.PurchaseOrderLines.Add(new PurchaseOrderLine
            {
                Id = Guid.NewGuid(),
                PurchaseOrderId = purchaseOrder.Id,
                LineNumber = lineNumber++,
                ProductId = lineReq.ProductId,
                QuantityOrdered = lineReq.QuantityOrdered,
                QuantityReceived = 0,
                UnitCost = lineReq.UnitCost,
                CreatedAt = DateTime.UtcNow
            });
        }

        _context.PurchaseOrders.Add(purchaseOrder);
        await _context.SaveChangesAsync();

        var createdPo = await GetByIdAsync(purchaseOrder.Id);

        return new PurchaseOrderOperationResult<PurchaseOrderResponse>
        {
            Status = PurchaseOrderOperationStatus.Success,
            Data = createdPo
        };
    }

    public async Task<PurchaseOrderOperationResult<PurchaseOrderResponse>> UpdateAsync(Guid id, UpdatePurchaseOrderRequest request)
    {
        var po = await _context.PurchaseOrders
            .Include(p => p.PurchaseOrderLines)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (po == null)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.NotFound,
                Message = "Purchase order was not found."
            };
        }

        if (po.Status != PurchaseOrderStatuses.Draft)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.OrderNotEditable,
                Message = $"Purchase order cannot be edited because it is in '{po.Status}' status."
            };
        }

        DateTime currentOrderDate = po.OrderDate;

        if (request.ExpectedDeliveryDate.HasValue)
        {
            if (request.ExpectedDeliveryDate.Value.Date < currentOrderDate.Date)
            {
                return new PurchaseOrderOperationResult<PurchaseOrderResponse>
                {
                    Status = PurchaseOrderOperationStatus.InvalidDeliveryDate,
                    Message = "Expected delivery date cannot be earlier than the order date."
                };
            }

            DateTime exp = request.ExpectedDeliveryDate.Value;
            if (exp < currentOrderDate)
            {
                exp = exp.Date.AddDays(1).AddTicks(-1);
            }
            po.ExpectedDeliveryDate = exp;
        }

        po.Notes = request.Notes?.Trim();
        po.UpdatedAt = DateTime.UtcNow;

        if (request.Lines != null)
        {
            if (request.Lines.Count == 0)
            {
                return new PurchaseOrderOperationResult<PurchaseOrderResponse>
                {
                    Status = PurchaseOrderOperationStatus.EmptyLines,
                    Message = "Purchase order must contain at least one line item."
                };
            }

            var productIds = request.Lines.Select(l => l.ProductId).Distinct().ToList();
            if (productIds.Count != request.Lines.Count)
            {
                return new PurchaseOrderOperationResult<PurchaseOrderResponse>
                {
                    Status = PurchaseOrderOperationStatus.DuplicateProductInLines,
                    Message = "A product cannot appear multiple times in the same purchase order. Please combine quantities."
                };
            }

            var existingProducts = await _context.Products
                .AsNoTracking()
                .Where(p => productIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id);

            foreach (var lineReq in request.Lines)
            {
                if (!existingProducts.TryGetValue(lineReq.ProductId, out var product))
                {
                    return new PurchaseOrderOperationResult<PurchaseOrderResponse>
                    {
                        Status = PurchaseOrderOperationStatus.ProductNotFound,
                        Message = $"Product with ID '{lineReq.ProductId}' was not found."
                    };
                }

                if (!product.IsActive)
                {
                    return new PurchaseOrderOperationResult<PurchaseOrderResponse>
                    {
                        Status = PurchaseOrderOperationStatus.ProductInactive,
                        Message = $"Product '{product.Name}' is inactive and cannot be ordered."
                    };
                }

                if (lineReq.QuantityOrdered <= 0)
                {
                    return new PurchaseOrderOperationResult<PurchaseOrderResponse>
                    {
                        Status = PurchaseOrderOperationStatus.InvalidLineQuantity,
                        Message = $"Quantity ordered for product '{product.Name}' must be greater than 0."
                    };
                }

                if (lineReq.UnitCost < 0)
                {
                    return new PurchaseOrderOperationResult<PurchaseOrderResponse>
                    {
                        Status = PurchaseOrderOperationStatus.InvalidLineCost,
                        Message = $"Unit cost for product '{product.Name}' cannot be negative."
                    };
                }
            }

            _context.PurchaseOrderLines.RemoveRange(po.PurchaseOrderLines);

            int lineNumber = 1;
            foreach (var lineReq in request.Lines)
            {
                po.PurchaseOrderLines.Add(new PurchaseOrderLine
                {
                    Id = Guid.NewGuid(),
                    PurchaseOrderId = po.Id,
                    LineNumber = lineNumber++,
                    ProductId = lineReq.ProductId,
                    QuantityOrdered = lineReq.QuantityOrdered,
                    QuantityReceived = 0,
                    UnitCost = lineReq.UnitCost,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        await _context.SaveChangesAsync();

        var updatedPo = await GetByIdAsync(po.Id);
        return new PurchaseOrderOperationResult<PurchaseOrderResponse>
        {
            Status = PurchaseOrderOperationStatus.Success,
            Data = updatedPo
        };
    }

    public async Task<PurchaseOrderOperationResult<PurchaseOrderResponse>> SubmitAsync(Guid id)
    {
        var po = await _context.PurchaseOrders
            .Include(p => p.PurchaseOrderLines)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (po == null)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.NotFound,
                Message = "Purchase order was not found."
            };
        }

        if (po.Status != PurchaseOrderStatuses.Draft)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.InvalidStatusTransition,
                Message = $"Only 'Draft' purchase orders can be submitted to 'Ordered'. Current status: '{po.Status}'."
            };
        }

        if (po.PurchaseOrderLines.Count == 0)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.EmptyLines,
                Message = "Cannot submit a purchase order with zero line items."
            };
        }

        string userId = GetCurrentUserId();
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var (reserveSuccess, reserveError) = await _supplierStockService.ReserveStockForPurchaseOrderAsync(po, userId);
            if (!reserveSuccess)
            {
                await transaction.RollbackAsync();
                return new PurchaseOrderOperationResult<PurchaseOrderResponse>
                {
                    Status = PurchaseOrderOperationStatus.InsufficientSupplierStock,
                    Message = reserveError ?? "Insufficient supplier stock available."
                };
            }

            po.Status = PurchaseOrderStatuses.Ordered;
            po.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.ConcurrencyConflict,
                Message = $"Failed to submit purchase order: {ex.Message}"
            };
        }

        var updatedPo = await GetByIdAsync(po.Id);
        return new PurchaseOrderOperationResult<PurchaseOrderResponse>
        {
            Status = PurchaseOrderOperationStatus.Success,
            Data = updatedPo
        };
    }

    public async Task<PurchaseOrderOperationResult<PurchaseOrderResponse>> ReceiveGoodsAsync(Guid id, ReceivePurchaseOrderRequest request)
    {
        if (request.Items == null || request.Items.Count == 0)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.InvalidLineQuantity,
                Message = "At least one item receipt must be specified."
            };
        }

        var po = await _context.PurchaseOrders
            .Include(p => p.PurchaseOrderLines)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (po == null)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.NotFound,
                Message = "Purchase order was not found."
            };
        }

        if (po.Status == PurchaseOrderStatuses.Draft)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.CannotReceiveDraftOrder,
                Message = "Cannot receive goods for a 'Draft' order. Please submit the purchase order first."
            };
        }

        if (po.Status == PurchaseOrderStatuses.Received)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.OrderAlreadyReceived,
                Message = "This purchase order has already been fully received."
            };
        }

        if (po.Status == PurchaseOrderStatuses.Cancelled)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.OrderAlreadyCancelled,
                Message = "Cannot receive goods for a cancelled purchase order."
            };
        }

        var linesById = po.PurchaseOrderLines.ToDictionary(l => l.Id);

        foreach (var item in request.Items)
        {
            if (!linesById.TryGetValue(item.PurchaseOrderLineId, out var line))
            {
                return new PurchaseOrderOperationResult<PurchaseOrderResponse>
                {
                    Status = PurchaseOrderOperationStatus.NotFound,
                    Message = $"Purchase order line with ID '{item.PurchaseOrderLineId}' was not found in this order."
                };
            }

            if (item.QuantityToReceive <= 0)
            {
                return new PurchaseOrderOperationResult<PurchaseOrderResponse>
                {
                    Status = PurchaseOrderOperationStatus.InvalidLineQuantity,
                    Message = $"Quantity to receive for line {line.LineNumber} must be greater than 0."
                };
            }

            decimal remainingAllowed = line.QuantityOrdered - line.QuantityReceived;
            if (item.QuantityToReceive > remainingAllowed)
            {
                return new PurchaseOrderOperationResult<PurchaseOrderResponse>
                {
                    Status = PurchaseOrderOperationStatus.OverReceiptNotAllowed,
                    Message = $"Cannot receive {item.QuantityToReceive} units for line {line.LineNumber}. Only {remainingAllowed} units remain unreceived."
                };
            }
        }

        string userId = GetCurrentUserId();

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            string docRef = string.IsNullOrWhiteSpace(request.ReceiptReferenceId)
                ? Guid.NewGuid().ToString("N")[..8].ToUpper()
                : request.ReceiptReferenceId.Trim();

            if (!string.IsNullOrWhiteSpace(request.ReceiptReferenceId))
            {
                bool alreadyProcessed = await _context.StockMovements.AnyAsync(sm =>
                    sm.ReferenceType == "PurchaseOrder" &&
                    sm.ReferenceId != null &&
                    sm.ReferenceId.Contains($"#DOC#{docRef}"));
                if (alreadyProcessed)
                {
                    return new PurchaseOrderOperationResult<PurchaseOrderResponse>
                    {
                        Status = PurchaseOrderOperationStatus.InvalidStatusTransition,
                        Message = $"Receipt with reference '{request.ReceiptReferenceId}' has already been processed for this purchase order."
                    };
                }
            }

            foreach (var item in request.Items)
            {
                var line = linesById[item.PurchaseOrderLineId];
                line.QuantityReceived += item.QuantityToReceive;

                var stockMovement = new StockMovement
                {
                    Id = Guid.NewGuid(),
                    ProductId = line.ProductId,
                    WarehouseId = po.WarehouseId,
                    Quantity = item.QuantityToReceive,
                    Type = StockMovementType.Purchase,
                    ReferenceType = "PurchaseOrder",
                    ReferenceId = $"{po.PurchaseOrderNumber}#L{line.LineNumber}#DOC#{docRef}",
                    CreatedByUserId = userId,
                    CreatedAt = DateTime.UtcNow
                };

                _context.StockMovements.Add(stockMovement);

                // Supplier stock fulfillment hook
                await _supplierStockService.FulfillStockForReceiptAsync(
                    po.SupplierId,
                    line.ProductId,
                    item.QuantityToReceive,
                    po.PurchaseOrderNumber,
                    line.LineNumber,
                    userId);
            }

            bool allLinesFullyReceived = po.PurchaseOrderLines.All(l => l.QuantityReceived >= l.QuantityOrdered);
            po.Status = allLinesFullyReceived
                ? PurchaseOrderStatuses.Received
                : PurchaseOrderStatuses.PartiallyReceived;

            po.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.InvalidStatusTransition,
                Message = $"Failed to record receipt and stock movement: {ex.Message}"
            };
        }

        var updatedPo = await GetByIdAsync(po.Id);
        return new PurchaseOrderOperationResult<PurchaseOrderResponse>
        {
            Status = PurchaseOrderOperationStatus.Success,
            Data = updatedPo
        };
    }

    public async Task<PurchaseOrderOperationResult<PurchaseOrderResponse>> CancelAsync(Guid id, string? reason = null)
    {
        var po = await _context.PurchaseOrders
            .Include(p => p.PurchaseOrderLines)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (po == null)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.NotFound,
                Message = "Purchase order was not found."
            };
        }

        if (po.Status == PurchaseOrderStatuses.Cancelled)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.OrderAlreadyCancelled,
                Message = "Purchase order is already cancelled."
            };
        }

        if (po.Status == PurchaseOrderStatuses.Received || po.Status == PurchaseOrderStatuses.PartiallyReceived)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.InvalidStatusTransition,
                Message = $"Cannot cancel a purchase order with status '{po.Status}' because stock has already been received."
            };
        }

        string userId = GetCurrentUserId();
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            if (po.Status == PurchaseOrderStatuses.Ordered)
            {
                await _supplierStockService.ReleaseReservationForPurchaseOrderAsync(po, userId);
            }

            po.Status = PurchaseOrderStatuses.Cancelled;
            po.UpdatedAt = DateTime.UtcNow;

            if (!string.IsNullOrWhiteSpace(reason))
            {
                po.Notes = string.IsNullOrWhiteSpace(po.Notes)
                    ? $"[Cancelled: {reason.Trim()}]"
                    : $"{po.Notes} | [Cancelled: {reason.Trim()}]";
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return new PurchaseOrderOperationResult<PurchaseOrderResponse>
            {
                Status = PurchaseOrderOperationStatus.ConcurrencyConflict,
                Message = $"Failed to cancel purchase order: {ex.Message}"
            };
        }

        var updatedPo = await GetByIdAsync(po.Id);
        return new PurchaseOrderOperationResult<PurchaseOrderResponse>
        {
            Status = PurchaseOrderOperationStatus.Success,
            Data = updatedPo
        };
    }

    public async Task<PurchaseOrderOperationResult<bool>> DeleteAsync(Guid id)
    {
        var po = await _context.PurchaseOrders
            .Include(p => p.PurchaseOrderLines)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (po == null)
        {
            return new PurchaseOrderOperationResult<bool>
            {
                Status = PurchaseOrderOperationStatus.NotFound,
                Data = false,
                Message = "Purchase order was not found."
            };
        }

        if (po.Status != PurchaseOrderStatuses.Draft)
        {
            return new PurchaseOrderOperationResult<bool>
            {
                Status = PurchaseOrderOperationStatus.OrderNotEditable,
                Data = false,
                Message = $"Only 'Draft' purchase orders can be deleted. Current status: '{po.Status}'."
            };
        }

        _context.PurchaseOrderLines.RemoveRange(po.PurchaseOrderLines);
        _context.PurchaseOrders.Remove(po);

        await _context.SaveChangesAsync();

        return new PurchaseOrderOperationResult<bool>
        {
            Status = PurchaseOrderOperationStatus.Success,
            Data = true
        };
    }

    private static PurchaseOrderResponse MapToResponse(PurchaseOrder po)
    {
        return new PurchaseOrderResponse
        {
            Id = po.Id,
            PurchaseOrderNumber = po.PurchaseOrderNumber,
            SupplierId = po.SupplierId,
            SupplierName = po.Supplier?.Name ?? string.Empty,
            WarehouseId = po.WarehouseId,
            WarehouseName = po.Warehouse?.Name ?? string.Empty,
            WarehouseCode = po.Warehouse?.Code ?? string.Empty,
            OrderDate = po.OrderDate,
            ExpectedDeliveryDate = po.ExpectedDeliveryDate,
            Status = po.Status,
            Notes = po.Notes,
            CreatedByUserId = po.CreatedByUserId,
            CreatedAt = po.CreatedAt,
            UpdatedAt = po.UpdatedAt,
            Lines = po.PurchaseOrderLines
                .OrderBy(l => l.LineNumber)
                .Select(l => new PurchaseOrderLineResponse
                {
                    Id = l.Id,
                    PurchaseOrderId = l.PurchaseOrderId,
                    LineNumber = l.LineNumber,
                    ProductId = l.ProductId,
                    ProductName = l.Product?.Name ?? string.Empty,
                    ProductSku = l.Product?.Sku ?? string.Empty,
                    QuantityOrdered = l.QuantityOrdered,
                    QuantityReceived = l.QuantityReceived,
                    UnitCost = l.UnitCost,
                    CreatedAt = l.CreatedAt
                })
                .ToList()
        };
    }
}
