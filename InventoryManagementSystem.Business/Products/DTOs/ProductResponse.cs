namespace InventoryManagementSystem.Business.Products.DTOs;

public class ProductResponse
{
    public Guid Id { get; set; }

    public string SKU { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string UnitOfMeasure { get; set; } = null!;

    public int ReorderThreshold { get; set; }

    public decimal SellingPrice { get; set; }

    public Guid CategoryId { get; set; }

    public string CategoryName { get; set; } = null!;

    public Guid? BrandId { get; set; }

    public string? BrandName { get; set; }

    public DateTime CreatedAt { get; set; }

    public bool IsActive { get; set; }
}