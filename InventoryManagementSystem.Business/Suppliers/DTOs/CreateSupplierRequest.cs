namespace InventoryManagementSystem.Business.Suppliers.DTOs;

public class CreateSupplierRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
}