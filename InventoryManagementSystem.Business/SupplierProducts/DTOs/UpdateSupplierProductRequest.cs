using System;
using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Business.SupplierProducts.DTOs;

public class UpdateSupplierProductRequest
{
    [StringLength(100, ErrorMessage = "SupplierProductCode cannot exceed 100 characters.")]
    public string? SupplierProductCode { get; set; }

    [Range(0, (double)decimal.MaxValue, ErrorMessage = "LastPurchasePrice must be non-negative.")]
    public decimal? LastPurchasePrice { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "LeadTimeDays must be non-negative.")]
    public int? LeadTimeDays { get; set; }

    public bool IsPreferred { get; set; }

    public bool IsActive { get; set; } = true;
}
