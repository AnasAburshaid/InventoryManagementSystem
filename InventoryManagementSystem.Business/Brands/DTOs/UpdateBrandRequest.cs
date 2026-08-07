using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Business.Brands.DTOs;

public class UpdateBrandRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = null!;
}