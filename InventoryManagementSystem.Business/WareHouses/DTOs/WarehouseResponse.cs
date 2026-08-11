namespace InventoryManagementSystem.Business.Warehouses.DTOs;

public class WarehouseResponse
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public string Code { get; set; } = null!;

    public string? Address { get; set; }

    public DateTime CreatedAt { get; set; }

    public bool IsActive { get; set; }
}