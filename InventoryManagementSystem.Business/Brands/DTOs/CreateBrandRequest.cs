using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Business.Brands.DTOs;

public class CreateBrandRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = null!;
}