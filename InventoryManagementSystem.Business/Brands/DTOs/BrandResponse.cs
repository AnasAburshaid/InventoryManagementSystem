namespace InventoryManagementSystem.Business.Brands.DTOs;

public class BrandResponse
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public bool IsActive { get; set; }
}