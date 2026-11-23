using System;
using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Business.Suppliers.Stock.DTOs;

public class RecordSupplierReplenishmentRequest
{
    [Required]
    public Guid ProductId { get; set; }

    [Range(1, 1000000000, ErrorMessage = "Replenishment quantity must be at least 1 whole unit.")]
    public decimal Quantity { get; set; }

    [Range(0, 1000000000, ErrorMessage = "Unit cost cannot be negative.")]
    public decimal? UnitCost { get; set; }

    [StringLength(100)]
    public string? ReferenceId { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}
