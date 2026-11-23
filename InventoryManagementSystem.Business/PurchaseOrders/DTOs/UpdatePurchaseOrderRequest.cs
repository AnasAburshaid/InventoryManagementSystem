using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Business.PurchaseOrders.DTOs;

public class UpdatePurchaseOrderRequest
{
    public DateTime? ExpectedDeliveryDate { get; set; }

    [StringLength(1000, ErrorMessage = "Notes cannot exceed 1000 characters.")]
    public string? Notes { get; set; }

    public List<CreatePurchaseOrderLineRequest>? Lines { get; set; }
}
