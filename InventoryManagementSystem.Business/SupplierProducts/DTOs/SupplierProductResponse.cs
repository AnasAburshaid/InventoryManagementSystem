using System;

namespace InventoryManagementSystem.Business.SupplierProducts.DTOs;

public class SupplierProductResponse
{
    public Guid Id { get; set; }
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string? SupplierProductCode { get; set; }
    public decimal? LastPurchasePrice { get; set; }
    public int? LeadTimeDays { get; set; }
    public bool IsPreferred { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
