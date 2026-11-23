using System;
using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Business.SalesOrders.DTOs;

public class CreateSalesOrderLineRequest
{
    [Required]
    public Guid ProductId { get; set; }

    [Required]
    [Range(0.001, double.MaxValue, ErrorMessage = "Quantity ordered must be greater than 0.")]
    public decimal QuantityOrdered { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Unit price cannot be negative.")]
    public decimal? UnitPrice { get; set; }
}
