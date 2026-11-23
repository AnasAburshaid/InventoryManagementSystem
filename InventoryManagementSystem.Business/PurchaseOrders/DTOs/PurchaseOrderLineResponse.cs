using System;

namespace InventoryManagementSystem.Business.PurchaseOrders.DTOs;

public class PurchaseOrderLineResponse
{
    public Guid Id { get; set; }
    public Guid PurchaseOrderId { get; set; }
    public int LineNumber { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public decimal QuantityOrdered { get; set; }
    public decimal QuantityReceived { get; set; }
    public decimal QuantityRemaining => Math.Max(0, QuantityOrdered - QuantityReceived);
    public decimal UnitCost { get; set; }
    public decimal LineTotal => QuantityOrdered * UnitCost;
    public DateTime CreatedAt { get; set; }
}
