using System;

namespace InventoryManagementSystem.Business.Replenishment.DTOs;

public class WarehouseProductSettingResponse
{
    public Guid Id { get; set; }
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = null!;
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = null!;
    public string ProductSku { get; set; } = null!;
    public decimal ReorderPoint { get; set; }
    public decimal TargetStockLevel { get; set; }
    public decimal MinOrderQuantity { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
