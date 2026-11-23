using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.SalesOrders.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.SalesOrders.Services;

public class SalesOrderLineService : ISalesOrderLineService
{
    private readonly InventoryDbContext _context;

    public SalesOrderLineService(InventoryDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyCollection<SalesOrderLineResponse>> GetLinesByOrderIdAsync(Guid salesOrderId)
    {
        var lines = await _context.SalesOrderLines
            .AsNoTracking()
            .Include(l => l.Product)
            .Where(l => l.SalesOrderId == salesOrderId)
            .OrderBy(l => l.LineNumber)
            .ToListAsync();

        return lines.Select(MapToResponse).ToList();
    }

    public async Task<SalesOrderLineResponse?> GetByIdAsync(Guid id)
    {
        var line = await _context.SalesOrderLines
            .AsNoTracking()
            .Include(l => l.Product)
            .FirstOrDefaultAsync(l => l.Id == id);

        return line is null ? null : MapToResponse(line);
    }

    public async Task<SalesOrderOperationResult<SalesOrderLineResponse>> AddLineAsync(
        Guid salesOrderId,
        CreateSalesOrderLineRequest request)
    {
        var so = await _context.SalesOrders
            .Include(s => s.SalesOrderLines)
            .FirstOrDefaultAsync(s => s.Id == salesOrderId);

        if (so == null)
        {
            return new SalesOrderOperationResult<SalesOrderLineResponse>
            {
                Status = SalesOrderOperationStatus.NotFound,
                Message = "Sales order was not found."
            };
        }

        if (so.Status != SalesOrderStatuses.Draft)
        {
            return new SalesOrderOperationResult<SalesOrderLineResponse>
            {
                Status = SalesOrderOperationStatus.OrderNotEditable,
                Message = $"Cannot add line to a sales order with status '{so.Status}'. Only 'Draft' orders can be modified."
            };
        }

        var product = await _context.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == request.ProductId);
        if (product == null)
        {
            return new SalesOrderOperationResult<SalesOrderLineResponse>
            {
                Status = SalesOrderOperationStatus.ProductNotFound,
                Message = $"Product with ID '{request.ProductId}' was not found."
            };
        }

        if (!product.IsActive)
        {
            return new SalesOrderOperationResult<SalesOrderLineResponse>
            {
                Status = SalesOrderOperationStatus.ProductInactive,
                Message = $"Product '{product.Name}' is inactive and cannot be ordered."
            };
        }

        if (request.QuantityOrdered <= 0)
        {
            return new SalesOrderOperationResult<SalesOrderLineResponse>
            {
                Status = SalesOrderOperationStatus.InvalidLineQuantity,
                Message = "Quantity ordered must be greater than 0."
            };
        }

        if (request.UnitPrice.HasValue && request.UnitPrice.Value < 0)
        {
            return new SalesOrderOperationResult<SalesOrderLineResponse>
            {
                Status = SalesOrderOperationStatus.InvalidLinePrice,
                Message = "Unit price cannot be negative."
            };
        }

        bool productAlreadyInLines = so.SalesOrderLines.Any(l => l.ProductId == request.ProductId);
        if (productAlreadyInLines)
        {
            return new SalesOrderOperationResult<SalesOrderLineResponse>
            {
                Status = SalesOrderOperationStatus.DuplicateProductInLines,
                Message = $"Product '{product.Name}' is already present in this sales order. Please update the existing line instead."
            };
        }

        decimal price = request.UnitPrice ?? product.SellingPrice;

        int nextLineNumber = so.SalesOrderLines.Any()
            ? so.SalesOrderLines.Max(l => l.LineNumber) + 1
            : 1;

        var line = new SalesOrderLine
        {
            Id = Guid.NewGuid(),
            SalesOrderId = salesOrderId,
            LineNumber = nextLineNumber,
            ProductId = request.ProductId,
            QuantityOrdered = request.QuantityOrdered,
            QuantityFulfilled = 0,
            UnitPrice = price,
            CreatedAt = DateTime.UtcNow
        };

        _context.SalesOrderLines.Add(line);
        so.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var createdLine = await GetByIdAsync(line.Id);
        return new SalesOrderOperationResult<SalesOrderLineResponse>
        {
            Status = SalesOrderOperationStatus.Success,
            Data = createdLine
        };
    }

    public async Task<SalesOrderOperationResult<SalesOrderLineResponse>> UpdateLineAsync(
        Guid id,
        UpdateSalesOrderLineRequest request)
    {
        var line = await _context.SalesOrderLines
            .Include(l => l.SalesOrder)
            .Include(l => l.Product)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (line == null)
        {
            return new SalesOrderOperationResult<SalesOrderLineResponse>
            {
                Status = SalesOrderOperationStatus.NotFound,
                Message = "Sales order line was not found."
            };
        }

        if (line.SalesOrder.Status != SalesOrderStatuses.Draft)
        {
            return new SalesOrderOperationResult<SalesOrderLineResponse>
            {
                Status = SalesOrderOperationStatus.OrderNotEditable,
                Message = $"Cannot update a line on a sales order with status '{line.SalesOrder.Status}'. Only 'Draft' orders can be modified."
            };
        }

        if (request.QuantityOrdered <= 0)
        {
            return new SalesOrderOperationResult<SalesOrderLineResponse>
            {
                Status = SalesOrderOperationStatus.InvalidLineQuantity,
                Message = "Quantity ordered must be greater than 0."
            };
        }

        if (request.UnitPrice.HasValue && request.UnitPrice.Value < 0)
        {
            return new SalesOrderOperationResult<SalesOrderLineResponse>
            {
                Status = SalesOrderOperationStatus.InvalidLinePrice,
                Message = "Unit price cannot be negative."
            };
        }

        line.QuantityOrdered = request.QuantityOrdered;
        if (request.UnitPrice.HasValue)
        {
            line.UnitPrice = request.UnitPrice.Value;
        }

        line.SalesOrder.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var updatedLine = await GetByIdAsync(line.Id);
        return new SalesOrderOperationResult<SalesOrderLineResponse>
        {
            Status = SalesOrderOperationStatus.Success,
            Data = updatedLine
        };
    }

    public async Task<SalesOrderOperationResult<bool>> DeleteLineAsync(Guid id)
    {
        var line = await _context.SalesOrderLines
            .Include(l => l.SalesOrder)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (line == null)
        {
            return new SalesOrderOperationResult<bool>
            {
                Status = SalesOrderOperationStatus.NotFound,
                Data = false,
                Message = "Sales order line was not found."
            };
        }

        if (line.SalesOrder.Status != SalesOrderStatuses.Draft)
        {
            return new SalesOrderOperationResult<bool>
            {
                Status = SalesOrderOperationStatus.OrderNotEditable,
                Data = false,
                Message = $"Cannot delete a line from a sales order with status '{line.SalesOrder.Status}'. Only 'Draft' orders can be modified."
            };
        }

        int totalLines = await _context.SalesOrderLines.CountAsync(l => l.SalesOrderId == line.SalesOrderId);
        if (totalLines <= 1)
        {
            return new SalesOrderOperationResult<bool>
            {
                Status = SalesOrderOperationStatus.EmptyLines,
                Data = false,
                Message = "Cannot delete the only line in a sales order. An order must contain at least one line."
            };
        }

        _context.SalesOrderLines.Remove(line);
        line.SalesOrder.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new SalesOrderOperationResult<bool>
        {
            Status = SalesOrderOperationStatus.Success,
            Data = true
        };
    }

    private static SalesOrderLineResponse MapToResponse(SalesOrderLine line)
    {
        return new SalesOrderLineResponse
        {
            Id = line.Id,
            SalesOrderId = line.SalesOrderId,
            LineNumber = line.LineNumber,
            ProductId = line.ProductId,
            ProductName = line.Product?.Name ?? string.Empty,
            ProductSku = line.Product?.Sku ?? string.Empty,
            QuantityOrdered = line.QuantityOrdered,
            QuantityFulfilled = line.QuantityFulfilled,
            UnitPrice = line.UnitPrice,
            CreatedAt = line.CreatedAt
        };
    }
}
