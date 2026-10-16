using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Business.Products.DTOs;

public class UpdateProductRequest
{
    [Required]
    [StringLength(200, MinimumLength = 2)]
    public string Name { get; set; } = null!;

    [Required]
    public Guid UnitOfMeasureId { get; set; }

    [Range(0, int.MaxValue)]
    public int ReorderThreshold { get; set; }

    [Required]
    public Guid CategoryId { get; set; }

    public Guid? BrandId { get; set; }

    [Range(0, double.MaxValue)]
    public decimal SellingPrice { get; set; }
}