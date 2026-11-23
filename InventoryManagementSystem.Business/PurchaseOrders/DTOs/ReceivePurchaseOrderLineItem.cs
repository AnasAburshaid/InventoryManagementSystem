using System;
using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Business.PurchaseOrders.DTOs;

public class ReceivePurchaseOrderLineItem
{
    [Required]
    public Guid PurchaseOrderLineId { get; set; }

    [Range(0.001, (double)decimal.MaxValue, ErrorMessage = "Quantity to receive must be greater than 0.")]
    public decimal QuantityToReceive { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }
}
