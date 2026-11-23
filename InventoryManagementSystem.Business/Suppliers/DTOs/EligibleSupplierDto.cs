using System;

namespace InventoryManagementSystem.Business.Suppliers.DTOs;

public class EligibleSupplierDto
{
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? SupplierProductCode { get; set; }
    public decimal? LastPurchasePrice { get; set; }
    public int? LeadTimeDays { get; set; }
    public bool IsPreferred { get; set; }
    public decimal OnHandQuantity { get; set; }
    public decimal ReservedQuantity { get; set; }
    public decimal AvailableToPromiseQuantity { get; set; }
    public decimal AvailableToPromise => AvailableToPromiseQuantity;
}
