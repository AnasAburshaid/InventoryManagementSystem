using System;
using System.Collections.Generic;

namespace InventoryManagementSystem.Business.Warehouses.Restrictions.DTOs;

public class WarehouseCategoryRestrictionsResponse
{
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string WarehouseCode { get; set; } = string.Empty;
    public bool CanAcceptAllCategories { get; set; }
    public List<WarehouseCategoryRestrictionDto> AllowedCategories { get; set; } = new();
}
