namespace InventoryManagementSystem.Business.Suppliers.DTOs;

public class UpdateSupplierRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
}