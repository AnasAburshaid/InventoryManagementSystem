using System;
using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Business.Suppliers.Stock.DTOs;

public class SupplierStockAdjustmentRequest
{
    [Required]
    public Guid ProductId { get; set; }

    [Range(0.001, 1000000000, ErrorMessage = "Adjustment quantity must be greater than 0.")]
    public decimal Quantity { get; set; }

    public bool IsIncrease { get; set; }

    [StringLength(100)]
    public string? ReferenceId { get; set; }

    [StringLength(1000)]
    [Required(ErrorMessage = "A reason or explanatory note is required for supplier stock corrections.")]
    public string Notes { get; set; } = string.Empty;
}
