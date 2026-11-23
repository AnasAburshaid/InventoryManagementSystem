using System;

namespace InventoryManagementSystem.Business.Warehouses.Restrictions.DTOs;

public class WarehouseCategoryRestrictionDto
{
    public Guid CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
}
