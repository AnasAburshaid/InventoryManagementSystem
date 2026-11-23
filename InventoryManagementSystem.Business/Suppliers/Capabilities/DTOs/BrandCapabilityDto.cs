using System;

namespace InventoryManagementSystem.Business.Suppliers.Capabilities.DTOs;

public class BrandCapabilityDto
{
    public Guid BrandId { get; set; }
    public string BrandName { get; set; } = string.Empty;
}
