using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.PurchaseOrders.DTOs;
using InventoryManagementSystem.Business.Suppliers.Capabilities.Services;
using InventoryManagementSystem.Business.Warehouses.Restrictions.Services;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.PurchaseOrders.Services;

public class PurchaseOrderLineService : IPurchaseOrderLineService
{
    private readonly InventoryDbContext _context;
    private readonly ISupplierCapabilityService _capabilityService;
    private readonly IWarehouseRestrictionService _warehouseRestrictionService;

    public PurchaseOrderLineService(
        InventoryDbContext context,
        ISupplierCapabilityService capabilityService,
        IWarehouseRestrictionService warehouseRestrictionService)
    {
        _context = context;
        _capabilityService = capabilityService;
        _warehouseRestrictionService = warehouseRestrictionService;
    }

    public async Task<IReadOnlyCollection<PurchaseOrderLineResponse>> GetLinesByOrderIdAsync(Guid purchaseOrderId)
    {
        var lines = await _context.PurchaseOrderLines
            .AsNoTracking()
            .Include(l => l.Product)
            .Where(l => l.PurchaseOrderId == purchaseOrderId)
            .OrderBy(l => l.LineNumber)
            .ToListAsync();

        return lines.Select(MapToResponse).ToList();
    }

    public async Task<PurchaseOrderLineResponse?> GetByIdAsync(Guid id)
    {
        var line = await _context.PurchaseOrderLines
            .AsNoTracking()
            .Include(l => l.Product)
            .FirstOrDefaultAsync(l => l.Id == id);

        return line is null ? null : MapToResponse(line);
    }

    public async Task<PurchaseOrderOperationResult<PurchaseOrderLineResponse>> AddLineAsync(
        Guid purchaseOrderId,
        CreatePurchaseOrderLineRequest request)
    {
        var po = await _context.PurchaseOrders
            .Include(p => p.PurchaseOrderLines)
            .FirstOrDefaultAsync(p => p.Id == purchaseOrderId);

        if (po == null)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderLineResponse>
            {
                Status = PurchaseOrderOperationStatus.NotFound,
                Message = "Purchase order was not found."
            };
        }

        if (po.Status != PurchaseOrderStatuses.Draft)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderLineResponse>
            {
                Status = PurchaseOrderOperationStatus.OrderNotEditable,
                Message = $"Cannot add line to a purchase order with status '{po.Status}'. Only 'Draft' orders can be modified."
            };
        }

        var product = await _context.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == request.ProductId);
        if (product == null)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderLineResponse>
            {
                Status = PurchaseOrderOperationStatus.ProductNotFound,
                Message = $"Product with ID '{request.ProductId}' was not found."
            };
        }

        if (!product.IsActive)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderLineResponse>
            {
                Status = PurchaseOrderOperationStatus.ProductInactive,
                Message = $"Product '{product.Name}' is inactive and cannot be ordered."
            };
        }

        // Supplier Capability Validation
        var (isEligible, reason) = await _capabilityService.ValidateProductEligibilityAsync(po.SupplierId, request.ProductId);
        if (!isEligible)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderLineResponse>
            {
                Status = PurchaseOrderOperationStatus.ProductNotOfferedBySupplier,
                Message = reason ?? $"Product '{product.Name}' violates supplier capability rules."
            };
        }

        // Warehouse Category Restriction Validation
        var (isWhEligible, whReason) = await _warehouseRestrictionService.ValidateCategoryEligibilityAsync(po.WarehouseId, product.CategoryId);
        if (!isWhEligible)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderLineResponse>
            {
                Status = PurchaseOrderOperationStatus.CategoryNotAllowedInWarehouse,
                Message = whReason ?? $"Destination warehouse is not authorized to accept products in category '{product.CategoryId}'."
            };
        }

        if (request.QuantityOrdered <= 0)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderLineResponse>
            {
                Status = PurchaseOrderOperationStatus.InvalidLineQuantity,
                Message = "Quantity ordered must be greater than 0."
            };
        }

        if (request.UnitCost < 0)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderLineResponse>
            {
                Status = PurchaseOrderOperationStatus.InvalidLineCost,
                Message = "Unit cost cannot be negative."
            };
        }

        bool productAlreadyInLines = po.PurchaseOrderLines.Any(l => l.ProductId == request.ProductId);
        if (productAlreadyInLines)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderLineResponse>
            {
                Status = PurchaseOrderOperationStatus.DuplicateProductInLines,
                Message = $"Product '{product.Name}' is already present in this purchase order. Please update the existing line instead."
            };
        }

        int nextLineNumber = po.PurchaseOrderLines.Any()
            ? po.PurchaseOrderLines.Max(l => l.LineNumber) + 1
            : 1;

        var line = new PurchaseOrderLine
        {
            Id = Guid.NewGuid(),
            PurchaseOrderId = purchaseOrderId,
            LineNumber = nextLineNumber,
            ProductId = request.ProductId,
            QuantityOrdered = request.QuantityOrdered,
            QuantityReceived = 0,
            UnitCost = request.UnitCost,
            CreatedAt = DateTime.UtcNow
        };

        _context.PurchaseOrderLines.Add(line);
        po.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var createdLine = await GetByIdAsync(line.Id);
        return new PurchaseOrderOperationResult<PurchaseOrderLineResponse>
        {
            Status = PurchaseOrderOperationStatus.Success,
            Data = createdLine
        };
    }

    public async Task<PurchaseOrderOperationResult<PurchaseOrderLineResponse>> UpdateLineAsync(
        Guid id,
        UpdatePurchaseOrderLineRequest request)
    {
        var line = await _context.PurchaseOrderLines
            .Include(l => l.PurchaseOrder)
            .Include(l => l.Product)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (line == null)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderLineResponse>
            {
                Status = PurchaseOrderOperationStatus.NotFound,
                Message = "Purchase order line was not found."
            };
        }

        if (line.PurchaseOrder.Status != PurchaseOrderStatuses.Draft)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderLineResponse>
            {
                Status = PurchaseOrderOperationStatus.OrderNotEditable,
                Message = $"Cannot update a line on a purchase order with status '{line.PurchaseOrder.Status}'. Only 'Draft' orders can be modified."
            };
        }

        if (request.QuantityOrdered <= 0)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderLineResponse>
            {
                Status = PurchaseOrderOperationStatus.InvalidLineQuantity,
                Message = "Quantity ordered must be greater than 0."
            };
        }

        if (request.UnitCost < 0)
        {
            return new PurchaseOrderOperationResult<PurchaseOrderLineResponse>
            {
                Status = PurchaseOrderOperationStatus.InvalidLineCost,
                Message = "Unit cost cannot be negative."
            };
        }

        line.QuantityOrdered = request.QuantityOrdered;
        line.UnitCost = request.UnitCost;
        line.PurchaseOrder.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var updatedLine = await GetByIdAsync(line.Id);
        return new PurchaseOrderOperationResult<PurchaseOrderLineResponse>
        {
            Status = PurchaseOrderOperationStatus.Success,
            Data = updatedLine
        };
    }

    public async Task<PurchaseOrderOperationResult<bool>> DeleteLineAsync(Guid id)
    {
        var line = await _context.PurchaseOrderLines
            .Include(l => l.PurchaseOrder)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (line == null)
        {
            return new PurchaseOrderOperationResult<bool>
            {
                Status = PurchaseOrderOperationStatus.NotFound,
                Data = false,
                Message = "Purchase order line was not found."
            };
        }

        if (line.PurchaseOrder.Status != PurchaseOrderStatuses.Draft)
        {
            return new PurchaseOrderOperationResult<bool>
            {
                Status = PurchaseOrderOperationStatus.OrderNotEditable,
                Data = false,
                Message = $"Cannot delete a line from a purchase order with status '{line.PurchaseOrder.Status}'. Only 'Draft' orders can be modified."
            };
        }

        int totalLines = await _context.PurchaseOrderLines.CountAsync(l => l.PurchaseOrderId == line.PurchaseOrderId);
        if (totalLines <= 1)
        {
            return new PurchaseOrderOperationResult<bool>
            {
                Status = PurchaseOrderOperationStatus.EmptyLines,
                Data = false,
                Message = "Cannot delete the only line in a purchase order. An order must contain at least one line."
            };
        }

        _context.PurchaseOrderLines.Remove(line);
        line.PurchaseOrder.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new PurchaseOrderOperationResult<bool>
        {
            Status = PurchaseOrderOperationStatus.Success,
            Data = true
        };
    }

    private static PurchaseOrderLineResponse MapToResponse(PurchaseOrderLine line)
    {
        return new PurchaseOrderLineResponse
        {
            Id = line.Id,
            PurchaseOrderId = line.PurchaseOrderId,
            LineNumber = line.LineNumber,
            ProductId = line.ProductId,
            ProductName = line.Product?.Name ?? string.Empty,
            ProductSku = line.Product?.Sku ?? string.Empty,
            QuantityOrdered = line.QuantityOrdered,
            QuantityReceived = line.QuantityReceived,
            UnitCost = line.UnitCost,
            CreatedAt = line.CreatedAt
        };
    }
}
