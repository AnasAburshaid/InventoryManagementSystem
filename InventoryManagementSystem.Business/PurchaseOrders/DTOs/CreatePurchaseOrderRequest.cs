using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Business.PurchaseOrders.DTOs;

public class CreatePurchaseOrderRequest
{
    [Required]
    public Guid SupplierId { get; set; }

    [Required]
    public Guid WarehouseId { get; set; }

    public DateTime? OrderDate { get; set; }

    public DateTime? ExpectedDeliveryDate { get; set; }

    [StringLength(1000, ErrorMessage = "Notes cannot exceed 1000 characters.")]
    public string? Notes { get; set; }

    [Required(ErrorMessage = "At least one purchase order line is required.")]
    [MinLength(1, ErrorMessage = "At least one purchase order line is required.")]
    public List<CreatePurchaseOrderLineRequest> Lines { get; set; } = new();
}
