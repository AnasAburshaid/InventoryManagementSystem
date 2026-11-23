namespace InventoryManagementSystem.Business.Suppliers.Capabilities.DTOs;

public class UpdateSupplierCapabilityFlagsRequest
{
    public bool CanSupplyAllCategories { get; set; }
    public bool CanSupplyAllBrands { get; set; }
}
