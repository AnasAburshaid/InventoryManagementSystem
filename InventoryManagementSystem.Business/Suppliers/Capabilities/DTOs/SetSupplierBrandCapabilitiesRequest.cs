using System;
using System.Collections.Generic;

namespace InventoryManagementSystem.Business.Suppliers.Capabilities.DTOs;

public class SetSupplierBrandCapabilitiesRequest
{
    public List<Guid> BrandIds { get; set; } = new();
}
