using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Business.Warehouses.DTOs;

public class CreateWarehouseRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = null!;

    [StringLength(250)]
    public string? Address { get; set; }
}