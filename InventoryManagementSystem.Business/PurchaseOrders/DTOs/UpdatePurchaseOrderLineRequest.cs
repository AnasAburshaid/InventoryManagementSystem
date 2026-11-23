using System;
using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Business.PurchaseOrders.DTOs;

public class UpdatePurchaseOrderLineRequest
{
    [Required]
    [Range(0.001, (double)decimal.MaxValue, ErrorMessage = "Quantity ordered must be greater than 0.")]
    public decimal QuantityOrdered { get; set; }

    [Required]
    [Range(0, (double)decimal.MaxValue, ErrorMessage = "Unit cost must be non-negative.")]
    public decimal UnitCost { get; set; }
}
