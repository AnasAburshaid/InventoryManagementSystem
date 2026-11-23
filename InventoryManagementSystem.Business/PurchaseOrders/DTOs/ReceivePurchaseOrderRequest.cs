using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Business.PurchaseOrders.DTOs;

public class ReceivePurchaseOrderRequest
{
    [Required]
    [MinLength(1, ErrorMessage = "At least one item must be received.")]
    public List<ReceivePurchaseOrderLineItem> Items { get; set; } = new();

    public string? ReceiptReferenceId { get; set; }
}
