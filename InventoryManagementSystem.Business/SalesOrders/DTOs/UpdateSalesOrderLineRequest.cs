using System;
using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Business.SalesOrders.DTOs;

public class UpdateSalesOrderLineRequest
{
    [Required]
    [Range(0.001, (double)decimal.MaxValue, ErrorMessage = "Quantity ordered must be greater than 0.")]
    public decimal QuantityOrdered { get; set; }

    [Range(0, (double)decimal.MaxValue, ErrorMessage = "Unit price must be non-negative.")]
    public decimal? UnitPrice { get; set; }
}
