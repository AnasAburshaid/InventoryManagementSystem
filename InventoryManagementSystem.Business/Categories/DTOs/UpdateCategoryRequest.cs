using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Business.Categories.DTOs;

public class UpdateCategoryRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = null!;
}