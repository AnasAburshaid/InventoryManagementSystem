using System;
using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Business.SalesOrders.DTOs;

public class FulfillSalesOrderLineItem
{
    [Required]
    public Guid SalesOrderLineId { get; set; }

    [Required]
    [Range(0.001, double.MaxValue, ErrorMessage = "Quantity to fulfill must be greater than 0.")]
    public decimal QuantityToFulfill { get; set; }
}
