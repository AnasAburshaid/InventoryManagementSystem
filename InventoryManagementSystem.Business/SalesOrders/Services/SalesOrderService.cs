using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.AuditLogs.Services;
using InventoryManagementSystem.Business.SalesOrders.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.SalesOrders.Services;

public class SalesOrderService : ISalesOrderService
{
    private readonly InventoryDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly SalesOrderNumberGenerator _numberGenerator;
    private readonly IAuditLogService? _auditLogService;

    public SalesOrderService(
        InventoryDbContext context,
        IHttpContextAccessor httpContextAccessor,
        SalesOrderNumberGenerator numberGenerator,
        IAuditLogService? auditLogService = null)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
        _numberGenerator = numberGenerator;
        _auditLogService = auditLogService;
    }

    private string GetCurrentUserId()
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";
    }

    public async Task<IReadOnlyCollection<SalesOrderResponse>> GetAllAsync(
        Guid? warehouseId = null,
        Guid? customerId = null,
        string? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null)
    {
        var query = _context.SalesOrders
            .AsNoTracking()
            .Include(so => so.Customer)
            .Include(so => so.Warehouse)
            .Include(so => so.SalesOrderLines)
                .ThenInclude(sol => sol.Product)
            .AsQueryable();

        if (warehouseId.HasValue)
        {
            query = query.Where(so => so.WarehouseId == warehouseId.Value);
        }

        if (customerId.HasValue)
        {
            query = query.Where(so => so.CustomerId == customerId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(so => so.Status == status);
        }

        if (fromDate.HasValue)
        {
            DateTime startBoundary = fromDate.Value.Kind == DateTimeKind.Utc ? fromDate.Value : fromDate.Value.Date;
            query = query.Where(so => so.OrderDate >= startBoundary);
        }

        if (toDate.HasValue)
        {
            DateTime endBoundary = toDate.Value.TimeOfDay == TimeSpan.Zero
                ? toDate.Value.Date.AddDays(1).AddTicks(-1)
                : toDate.Value;
            query = query.Where(so => so.OrderDate <= endBoundary);
        }

        var list = await query
            .OrderByDescending(so => so.OrderDate)
            .ThenByDescending(so => so.CreatedAt)
            .ToListAsync();

        return list.Select(MapToResponse).ToList();
    }

    public async Task<SalesOrderResponse?> GetByIdAsync(Guid id)
    {
        var so = await _context.SalesOrders
            .AsNoTracking()
            .Include(s => s.Customer)
            .Include(s => s.Warehouse)
            .Include(s => s.SalesOrderLines)
                .ThenInclude(sol => sol.Product)
            .FirstOrDefaultAsync(s => s.Id == id);

        return so is null ? null : MapToResponse(so);
    }

    public async Task<SalesOrderResponse?> GetByNumberAsync(string salesOrderNumber)
    {
        var so = await _context.SalesOrders
            .AsNoTracking()
            .Include(s => s.Customer)
            .Include(s => s.Warehouse)
            .Include(s => s.SalesOrderLines)
                .ThenInclude(sol => sol.Product)
            .FirstOrDefaultAsync(s => s.SalesOrderNumber == salesOrderNumber);

        return so is null ? null : MapToResponse(so);
    }

    public async Task<SalesOrderOperationResult<SalesOrderResponse>> CreateAsync(CreateSalesOrderRequest request)
    {
        if (request.Lines == null || request.Lines.Count == 0)
        {
            return new SalesOrderOperationResult<SalesOrderResponse>
            {
                Status = SalesOrderOperationStatus.EmptyLines,
                Message = "Sales order must contain at least one line item."
            };
        }

        var customer = await _context.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.Id == request.CustomerId);
        if (customer == null)
        {
            return new SalesOrderOperationResult<SalesOrderResponse>
            {
                Status = SalesOrderOperationStatus.CustomerNotFound,
                Message = "Customer was not found."
            };
        }

        if (!customer.IsActive)
        {
            return new SalesOrderOperationResult<SalesOrderResponse>
            {
                Status = SalesOrderOperationStatus.CustomerInactive,
                Message = "Cannot create a sales order for an inactive customer."
            };
        }

        var warehouse = await _context.Warehouses.AsNoTracking().FirstOrDefaultAsync(w => w.Id == request.WarehouseId);
        if (warehouse == null)
        {
            return new SalesOrderOperationResult<SalesOrderResponse>
            {
                Status = SalesOrderOperationStatus.WarehouseNotFound,
                Message = "Fulfillment warehouse was not found."
            };
        }

        if (!warehouse.IsActive)
        {
            return new SalesOrderOperationResult<SalesOrderResponse>
            {
                Status = SalesOrderOperationStatus.WarehouseInactive,
                Message = "Cannot create a sales order for an inactive warehouse."
            };
        }

        var productIds = request.Lines.Select(l => l.ProductId).Distinct().ToList();
        if (productIds.Count != request.Lines.Count)
        {
            return new SalesOrderOperationResult<SalesOrderResponse>
            {
                Status = SalesOrderOperationStatus.DuplicateProductInLines,
                Message = "A product cannot appear multiple times in the same sales order. Please combine quantities."
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
                return new SalesOrderOperationResult<SalesOrderResponse>
                {
                    Status = SalesOrderOperationStatus.ProductNotFound,
                    Message = $"Product with ID '{lineReq.ProductId}' was not found."
                };
            }

            if (!product.IsActive)
            {
                return new SalesOrderOperationResult<SalesOrderResponse>
                {
                    Status = SalesOrderOperationStatus.ProductInactive,
                    Message = $"Product '{product.Name}' is inactive and cannot be ordered."
                };
            }

            if (lineReq.QuantityOrdered <= 0)
            {
                return new SalesOrderOperationResult<SalesOrderResponse>
                {
                    Status = SalesOrderOperationStatus.InvalidLineQuantity,
                    Message = $"Quantity ordered for product '{product.Name}' must be greater than 0."
                };
            }

            if (lineReq.UnitPrice.HasValue && lineReq.UnitPrice.Value < 0)
            {
                return new SalesOrderOperationResult<SalesOrderResponse>
                {
                    Status = SalesOrderOperationStatus.InvalidLinePrice,
                    Message = $"Unit price for product '{product.Name}' cannot be negative."
                };
            }
        }

        string orderNumber;
        do
        {
            orderNumber = _numberGenerator.Generate();
        } while (await _context.SalesOrders.AnyAsync(so => so.SalesOrderNumber == orderNumber));

        string userId = GetCurrentUserId();
        DateTime orderDate = request.OrderDate ?? DateTime.UtcNow;

        var salesOrder = new SalesOrder
        {
            Id = Guid.NewGuid(),
            SalesOrderNumber = orderNumber,
            CustomerId = request.CustomerId,
            WarehouseId = request.WarehouseId,
            OrderDate = orderDate,
            Status = SalesOrderStatuses.Draft,
            Notes = request.Notes?.Trim(),
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        int lineNumber = 1;
        foreach (var lineReq in request.Lines)
        {
            var product = existingProducts[lineReq.ProductId];
            decimal price = lineReq.UnitPrice ?? product.SellingPrice;

            salesOrder.SalesOrderLines.Add(new SalesOrderLine
            {
                Id = Guid.NewGuid(),
                SalesOrderId = salesOrder.Id,
                LineNumber = lineNumber++,
                ProductId = lineReq.ProductId,
                QuantityOrdered = lineReq.QuantityOrdered,
                QuantityFulfilled = 0,
                UnitPrice = price,
                CreatedAt = DateTime.UtcNow
            });
        }

        _context.SalesOrders.Add(salesOrder);
        await _context.SaveChangesAsync();

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                action: "CreateSalesOrder",
                entityName: "SalesOrder",
                entityId: salesOrder.Id.ToString(),
                warehouseId: salesOrder.WarehouseId,
                details: new { salesOrder.SalesOrderNumber, LineCount = salesOrder.SalesOrderLines.Count, salesOrder.CustomerId });
        }

        var created = await GetByIdAsync(salesOrder.Id);
        return new SalesOrderOperationResult<SalesOrderResponse>
        {
            Status = SalesOrderOperationStatus.Success,
            Data = created
        };
    }

    public async Task<SalesOrderOperationResult<SalesOrderResponse>> UpdateAsync(Guid id, UpdateSalesOrderRequest request)
    {
        var so = await _context.SalesOrders
            .Include(s => s.SalesOrderLines)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (so == null)
        {
            return new SalesOrderOperationResult<SalesOrderResponse>
            {
                Status = SalesOrderOperationStatus.NotFound,
                Message = "Sales order was not found."
            };
        }

        if (so.Status != SalesOrderStatuses.Draft)
        {
            return new SalesOrderOperationResult<SalesOrderResponse>
            {
                Status = SalesOrderOperationStatus.OrderNotEditable,
                Message = $"Only 'Draft' sales orders can be updated. Current status: '{so.Status}'."
            };
        }

        if (request.OrderDate.HasValue)
        {
            so.OrderDate = request.OrderDate.Value;
        }

        if (request.Notes != null)
        {
            so.Notes = request.Notes.Trim();
        }

        if (request.Lines != null)
        {
            if (request.Lines.Count == 0)
            {
                return new SalesOrderOperationResult<SalesOrderResponse>
                {
                    Status = SalesOrderOperationStatus.EmptyLines,
                    Message = "Sales order must contain at least one line item."
                };
            }

            var productIds = request.Lines.Select(l => l.ProductId).Distinct().ToList();
            if (productIds.Count != request.Lines.Count)
            {
                return new SalesOrderOperationResult<SalesOrderResponse>
                {
                    Status = SalesOrderOperationStatus.DuplicateProductInLines,
                    Message = "A product cannot appear multiple times in the same sales order. Please combine quantities."
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
                    return new SalesOrderOperationResult<SalesOrderResponse>
                    {
                        Status = SalesOrderOperationStatus.ProductNotFound,
                        Message = $"Product with ID '{lineReq.ProductId}' was not found."
                    };
                }

                if (!product.IsActive)
                {
                    return new SalesOrderOperationResult<SalesOrderResponse>
                    {
                        Status = SalesOrderOperationStatus.ProductInactive,
                        Message = $"Product '{product.Name}' is inactive and cannot be ordered."
                    };
                }

                if (lineReq.QuantityOrdered <= 0)
                {
                    return new SalesOrderOperationResult<SalesOrderResponse>
                    {
                        Status = SalesOrderOperationStatus.InvalidLineQuantity,
                        Message = $"Quantity ordered for product '{product.Name}' must be greater than 0."
                    };
                }

                if (lineReq.UnitPrice.HasValue && lineReq.UnitPrice.Value < 0)
                {
                    return new SalesOrderOperationResult<SalesOrderResponse>
                    {
                        Status = SalesOrderOperationStatus.InvalidLinePrice,
                        Message = $"Unit price for product '{product.Name}' cannot be negative."
                    };
                }
            }

            _context.SalesOrderLines.RemoveRange(so.SalesOrderLines);

            int lineNumber = 1;
            foreach (var lineReq in request.Lines)
            {
                var product = existingProducts[lineReq.ProductId];
                decimal price = lineReq.UnitPrice ?? product.SellingPrice;

                so.SalesOrderLines.Add(new SalesOrderLine
                {
                    Id = Guid.NewGuid(),
                    SalesOrderId = so.Id,
                    LineNumber = lineNumber++,
                    ProductId = lineReq.ProductId,
                    QuantityOrdered = lineReq.QuantityOrdered,
                    QuantityFulfilled = 0,
                    UnitPrice = price,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        so.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                action: "UpdateSalesOrder",
                entityName: "SalesOrder",
                entityId: so.Id.ToString(),
                warehouseId: so.WarehouseId,
                details: new { so.SalesOrderNumber, LineCount = request.Lines?.Count ?? 0 });
        }

        var updatedSo = await GetByIdAsync(so.Id);
        return new SalesOrderOperationResult<SalesOrderResponse>
        {
            Status = SalesOrderOperationStatus.Success,
            Data = updatedSo
        };
    }

    public async Task<SalesOrderOperationResult<SalesOrderResponse>> ConfirmAsync(Guid id)
    {
        var so = await _context.SalesOrders
            .Include(s => s.SalesOrderLines)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (so == null)
        {
            return new SalesOrderOperationResult<SalesOrderResponse>
            {
                Status = SalesOrderOperationStatus.NotFound,
                Message = "Sales order was not found."
            };
        }

        if (so.Status != SalesOrderStatuses.Draft)
        {
            return new SalesOrderOperationResult<SalesOrderResponse>
            {
                Status = SalesOrderOperationStatus.InvalidStatusTransition,
                Message = $"Only 'Draft' sales orders can be confirmed. Current status: '{so.Status}'."
            };
        }

        if (so.SalesOrderLines.Count == 0)
        {
            return new SalesOrderOperationResult<SalesOrderResponse>
            {
                Status = SalesOrderOperationStatus.EmptyLines,
                Message = "Cannot confirm a sales order with zero line items."
            };
        }

        so.Status = SalesOrderStatuses.Confirmed;
        so.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                action: "ConfirmSalesOrder",
                entityName: "SalesOrder",
                entityId: so.Id.ToString(),
                warehouseId: so.WarehouseId,
                details: new { so.SalesOrderNumber, LineCount = so.SalesOrderLines.Count });
        }

        var updatedSo = await GetByIdAsync(so.Id);
        return new SalesOrderOperationResult<SalesOrderResponse>
        {
            Status = SalesOrderOperationStatus.Success,
            Data = updatedSo
        };
    }

    public async Task<SalesOrderOperationResult<SalesOrderResponse>> FulfillGoodsAsync(Guid id, FulfillSalesOrderRequest request)
    {
        if (request.Items == null || request.Items.Count == 0)
        {
            return new SalesOrderOperationResult<SalesOrderResponse>
            {
                Status = SalesOrderOperationStatus.InvalidLineQuantity,
                Message = "At least one item fulfillment must be specified."
            };
        }

        var so = await _context.SalesOrders
            .Include(s => s.Warehouse)
            .Include(s => s.SalesOrderLines)
                .ThenInclude(sol => sol.Product)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (so == null)
        {
            return new SalesOrderOperationResult<SalesOrderResponse>
            {
                Status = SalesOrderOperationStatus.NotFound,
                Message = "Sales order was not found."
            };
        }

        if (so.Status == SalesOrderStatuses.Draft)
        {
            return new SalesOrderOperationResult<SalesOrderResponse>
            {
                Status = SalesOrderOperationStatus.CannotFulfillDraftOrder,
                Message = "Cannot fulfill a 'Draft' sales order. Please confirm the sales order first."
            };
        }

        if (so.Status == SalesOrderStatuses.Fulfilled)
        {
            return new SalesOrderOperationResult<SalesOrderResponse>
            {
                Status = SalesOrderOperationStatus.OrderAlreadyFulfilled,
                Message = "This sales order has already been fully fulfilled."
            };
        }

        if (so.Status == SalesOrderStatuses.Cancelled)
        {
            return new SalesOrderOperationResult<SalesOrderResponse>
            {
                Status = SalesOrderOperationStatus.OrderAlreadyCancelled,
                Message = "Cannot fulfill a cancelled sales order."
            };
        }

        var linesById = so.SalesOrderLines.ToDictionary(l => l.Id);

        foreach (var item in request.Items)
        {
            if (!linesById.TryGetValue(item.SalesOrderLineId, out var line))
            {
                return new SalesOrderOperationResult<SalesOrderResponse>
                {
                    Status = SalesOrderOperationStatus.NotFound,
                    Message = $"Sales order line with ID '{item.SalesOrderLineId}' was not found in this order."
                };
            }

            if (item.QuantityToFulfill <= 0)
            {
                return new SalesOrderOperationResult<SalesOrderResponse>
                {
                    Status = SalesOrderOperationStatus.InvalidLineQuantity,
                    Message = $"Quantity to fulfill for line {line.LineNumber} must be greater than 0."
                };
            }

            decimal remainingAllowed = line.QuantityOrdered - line.QuantityFulfilled;
            if (item.QuantityToFulfill > remainingAllowed)
            {
                return new SalesOrderOperationResult<SalesOrderResponse>
                {
                    Status = SalesOrderOperationStatus.OverFulfillmentNotAllowed,
                    Message = $"Cannot fulfill {item.QuantityToFulfill} units for line {line.LineNumber}. Only {remainingAllowed} units remain unfulfilled."
                };
            }
        }

        // Validate physical stock availability in warehouse
        var requestedByProduct = request.Items
            .GroupBy(i => linesById[i.SalesOrderLineId].ProductId)
            .ToDictionary(g => g.Key, g => g.Sum(i => i.QuantityToFulfill));

        foreach (var (productId, neededQty) in requestedByProduct)
        {
            decimal availableStock = await GetCurrentStockAsync(so.WarehouseId, productId);
            if (availableStock < neededQty)
            {
                var prod = linesById.Values.FirstOrDefault(l => l.ProductId == productId)?.Product;
                string productName = prod?.Name ?? productId.ToString();
                string warehouseName = so.Warehouse?.Name ?? so.WarehouseId.ToString();

                return new SalesOrderOperationResult<SalesOrderResponse>
                {
                    Status = SalesOrderOperationStatus.InsufficientStock,
                    Message = $"Insufficient stock for product '{productName}' in warehouse '{warehouseName}'. Required: {neededQty}, Available: {availableStock}."
                };
            }
        }

        string userId = GetCurrentUserId();
        bool isRelational = _context.Database.IsRelational();
        using var transaction = isRelational ? await _context.Database.BeginTransactionAsync() : null;

        try
        {
            foreach (var item in request.Items)
            {
                var line = linesById[item.SalesOrderLineId];
                line.QuantityFulfilled += item.QuantityToFulfill;

                var stockMovement = new StockMovement
                {
                    Id = Guid.NewGuid(),
                    ProductId = line.ProductId,
                    WarehouseId = so.WarehouseId,
                    Quantity = item.QuantityToFulfill,
                    Type = StockMovementType.Sale,
                    ReferenceType = "SalesOrder",
                    ReferenceId = $"{so.SalesOrderNumber}#L{line.LineNumber}",
                    CreatedByUserId = userId,
                    CreatedAt = DateTime.UtcNow
                };

                _context.StockMovements.Add(stockMovement);
            }

            bool allLinesFullyFulfilled = so.SalesOrderLines.All(l => l.QuantityFulfilled >= l.QuantityOrdered);
            so.Status = allLinesFullyFulfilled
                ? SalesOrderStatuses.Fulfilled
                : SalesOrderStatuses.PartiallyFulfilled;

            so.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            if (transaction != null)
            {
                await transaction.CommitAsync();
            }

            if (_auditLogService != null)
            {
                await _auditLogService.LogAsync(
                    action: "FulfillSalesOrder",
                    entityName: "SalesOrder",
                    entityId: so.Id.ToString(),
                    warehouseId: so.WarehouseId,
                    details: new { so.SalesOrderNumber, Fulfillments = request.Items.Count, Status = so.Status });
            }
        }
        catch (Exception ex)
        {
            if (transaction != null)
            {
                await transaction.RollbackAsync();
            }

            return new SalesOrderOperationResult<SalesOrderResponse>
            {
                Status = SalesOrderOperationStatus.InvalidStatusTransition,
                Message = $"An error occurred while fulfilling the sales order: {ex.Message}"
            };
        }

        var updatedSo = await GetByIdAsync(so.Id);
        return new SalesOrderOperationResult<SalesOrderResponse>
        {
            Status = SalesOrderOperationStatus.Success,
            Data = updatedSo
        };
    }

    public async Task<SalesOrderOperationResult<SalesOrderResponse>> CancelAsync(Guid id, string? reason = null)
    {
        var so = await _context.SalesOrders
            .Include(s => s.SalesOrderLines)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (so == null)
        {
            return new SalesOrderOperationResult<SalesOrderResponse>
            {
                Status = SalesOrderOperationStatus.NotFound,
                Message = "Sales order was not found."
            };
        }

        if (so.Status == SalesOrderStatuses.Cancelled)
        {
            return new SalesOrderOperationResult<SalesOrderResponse>
            {
                Status = SalesOrderOperationStatus.OrderAlreadyCancelled,
                Message = "Sales order is already cancelled."
            };
        }

        if (so.Status == SalesOrderStatuses.Fulfilled || so.Status == SalesOrderStatuses.PartiallyFulfilled)
        {
            return new SalesOrderOperationResult<SalesOrderResponse>
            {
                Status = SalesOrderOperationStatus.InvalidStatusTransition,
                Message = $"Cannot cancel a sales order with status '{so.Status}' because stock has already been fulfilled."
            };
        }

        so.Status = SalesOrderStatuses.Cancelled;
        so.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(reason))
        {
            so.Notes = string.IsNullOrWhiteSpace(so.Notes)
                ? $"[Cancelled: {reason.Trim()}]"
                : $"{so.Notes} | [Cancelled: {reason.Trim()}]";
        }

        await _context.SaveChangesAsync();

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                action: "CancelSalesOrder",
                entityName: "SalesOrder",
                entityId: so.Id.ToString(),
                warehouseId: so.WarehouseId,
                details: new { so.SalesOrderNumber, Reason = reason });
        }

        var updatedSo = await GetByIdAsync(so.Id);
        return new SalesOrderOperationResult<SalesOrderResponse>
        {
            Status = SalesOrderOperationStatus.Success,
            Data = updatedSo
        };
    }

    public async Task<SalesOrderOperationResult<bool>> DeleteAsync(Guid id)
    {
        var so = await _context.SalesOrders
            .Include(s => s.SalesOrderLines)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (so == null)
        {
            return new SalesOrderOperationResult<bool>
            {
                Status = SalesOrderOperationStatus.NotFound,
                Data = false,
                Message = "Sales order was not found."
            };
        }

        if (so.Status != SalesOrderStatuses.Draft)
        {
            return new SalesOrderOperationResult<bool>
            {
                Status = SalesOrderOperationStatus.OrderNotEditable,
                Data = false,
                Message = $"Only 'Draft' sales orders can be deleted. Current status: '{so.Status}'."
            };
        }

        _context.SalesOrderLines.RemoveRange(so.SalesOrderLines);
        _context.SalesOrders.Remove(so);
        await _context.SaveChangesAsync();

        return new SalesOrderOperationResult<bool>
        {
            Status = SalesOrderOperationStatus.Success,
            Data = true
        };
    }

    private async Task<decimal> GetCurrentStockAsync(Guid warehouseId, Guid productId)
    {
        return await _context.StockMovements
            .AsNoTracking()
            .Where(sm => sm.WarehouseId == warehouseId && sm.ProductId == productId)
            .SumAsync(sm =>
                (sm.Type == StockMovementType.Purchase ||
                 sm.Type == StockMovementType.AdjustmentIn ||
                 sm.Type == StockMovementType.TransferIn) ? sm.Quantity :
                (sm.Type == StockMovementType.Sale ||
                 sm.Type == StockMovementType.AdjustmentOut ||
                 sm.Type == StockMovementType.TransferOut) ? -sm.Quantity : 0);
    }

    private static SalesOrderResponse MapToResponse(SalesOrder so)
    {
        return new SalesOrderResponse
        {
            Id = so.Id,
            SalesOrderNumber = so.SalesOrderNumber,
            CustomerId = so.CustomerId,
            CustomerName = so.Customer?.Name ?? string.Empty,
            CustomerEmail = so.Customer?.Email,
            WarehouseId = so.WarehouseId,
            WarehouseName = so.Warehouse?.Name ?? string.Empty,
            WarehouseCode = so.Warehouse?.Code ?? string.Empty,
            OrderDate = so.OrderDate,
            Status = so.Status,
            Notes = so.Notes,
            CreatedByUserId = so.CreatedByUserId,
            CreatedAt = so.CreatedAt,
            UpdatedAt = so.UpdatedAt,
            Lines = so.SalesOrderLines
                .OrderBy(l => l.LineNumber)
                .Select(l => new SalesOrderLineResponse
                {
                    Id = l.Id,
                    SalesOrderId = l.SalesOrderId,
                    LineNumber = l.LineNumber,
                    ProductId = l.ProductId,
                    ProductName = l.Product?.Name ?? string.Empty,
                    ProductSku = l.Product?.Sku ?? string.Empty,
                    QuantityOrdered = l.QuantityOrdered,
                    QuantityFulfilled = l.QuantityFulfilled,
                    UnitPrice = l.UnitPrice,
                    CreatedAt = l.CreatedAt
                })
                .ToList()
        };
    }
}
