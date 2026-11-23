using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Business.SalesOrders.DTOs;

public class CreateSalesOrderRequest
{
    [Required]
    public Guid CustomerId { get; set; }

    [Required]
    public Guid WarehouseId { get; set; }

    public DateTime? OrderDate { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }

    [Required]
    [MinLength(1, ErrorMessage = "A sales order must contain at least one line item.")]
    public List<CreateSalesOrderLineRequest> Lines { get; set; } = new();
}
