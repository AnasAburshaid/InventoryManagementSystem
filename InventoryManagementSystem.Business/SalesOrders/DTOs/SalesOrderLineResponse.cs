using System;

namespace InventoryManagementSystem.Business.SalesOrders.DTOs;

public class SalesOrderLineResponse
{
    public Guid Id { get; set; }
    public Guid SalesOrderId { get; set; }
    public int LineNumber { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public decimal QuantityOrdered { get; set; }
    public decimal QuantityFulfilled { get; set; }
    public decimal QuantityRemaining => Math.Max(0, QuantityOrdered - QuantityFulfilled);
    public decimal UnitPrice { get; set; }
    public decimal LineTotal => QuantityOrdered * UnitPrice;
    public DateTime CreatedAt { get; set; }
}
