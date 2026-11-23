using System;
using System.Collections.Generic;

namespace InventoryManagementSystem.Business.Suppliers.Capabilities.DTOs;

public class SupplierCapabilitiesResponse
{
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public bool CanSupplyAllCategories { get; set; }
    public bool CanSupplyAllBrands { get; set; }
    public List<CategoryCapabilityDto> AllowedCategories { get; set; } = new();
    public List<BrandCapabilityDto> AllowedBrands { get; set; } = new();
}
