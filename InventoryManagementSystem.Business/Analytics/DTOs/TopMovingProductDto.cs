using System;

namespace InventoryManagementSystem.Business.Analytics.DTOs;

public class TopMovingProductDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = null!;
    public string ProductSku { get; set; } = null!;
    public string CategoryName { get; set; } = null!;
    public string? BrandName { get; set; }
    public decimal TotalQuantityMoved { get; set; }
    public decimal QuantityIn { get; set; }
    public decimal QuantityOut { get; set; }
    public decimal NetChange { get; set; }
    public int MovementCount { get; set; }
}
