using System;
using System.Collections.Generic;
using System.Linq;

namespace InventoryManagementSystem.Business.PurchaseOrders.DTOs;

public class PurchaseOrderResponse
{
    public Guid Id { get; set; }
    public string PurchaseOrderNumber { get; set; } = string.Empty;
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string WarehouseCode { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public DateTime? ExpectedDeliveryDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public IReadOnlyCollection<PurchaseOrderLineResponse> Lines { get; set; } = new List<PurchaseOrderLineResponse>();

    public decimal TotalAmount => Lines.Sum(l => l.LineTotal);
    public decimal TotalOrderedQuantity => Lines.Sum(l => l.QuantityOrdered);
    public decimal TotalReceivedQuantity => Lines.Sum(l => l.QuantityReceived);
}
