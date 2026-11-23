using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Business.SalesOrders.DTOs;

public class FulfillSalesOrderRequest
{
    [Required]
    [MinLength(1, ErrorMessage = "At least one item must be specified for fulfillment.")]
    public List<FulfillSalesOrderLineItem> Items { get; set; } = new();
}
