using System;
using System.Collections.Generic;

namespace InventoryManagementSystem.Business.Suppliers.Capabilities.DTOs;

public class SetSupplierCategoryCapabilitiesRequest
{
    public List<Guid> CategoryIds { get; set; } = new();
}
