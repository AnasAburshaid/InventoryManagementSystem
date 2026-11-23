using System;

namespace InventoryManagementSystem.Business.Suppliers.Capabilities.DTOs;

public class CategoryCapabilityDto
{
    public Guid CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
}
