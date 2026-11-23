using System;
using System.Collections.Generic;
using System.Linq;

namespace InventoryManagementSystem.Business.SalesOrders.DTOs;

public class SalesOrderResponse
{
    public Guid Id { get; set; }
    public string SalesOrderNumber { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerEmail { get; set; }
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string WarehouseCode { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public IReadOnlyCollection<SalesOrderLineResponse> Lines { get; set; } = new List<SalesOrderLineResponse>();

    public decimal TotalAmount => Lines.Sum(l => l.LineTotal);
    public decimal TotalOrderedQuantity => Lines.Sum(l => l.QuantityOrdered);
    public decimal TotalFulfilledQuantity => Lines.Sum(l => l.QuantityFulfilled);
}
