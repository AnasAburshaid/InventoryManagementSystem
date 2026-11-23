using System;
using System.Collections.Generic;

namespace InventoryManagementSystem.Business.Warehouses.Restrictions.DTOs;

public class SetWarehouseCategoryRestrictionsRequest
{
    public List<Guid> CategoryIds { get; set; } = new();
}
