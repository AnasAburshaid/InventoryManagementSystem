using System;

namespace InventoryManagementSystem.Business.Analytics.DTOs;

public class DormantProductDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = null!;
    public string ProductSku { get; set; } = null!;
    public string CategoryName { get; set; } = null!;
    public string? BrandName { get; set; }
    public decimal CurrentStock { get; set; }
    public DateTime? LastMovementDate { get; set; }
    public int DaysDormant { get; set; }
}
