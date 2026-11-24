using System;

namespace InventoryManagementSystem.Business.Replenishment.DTOs;

public class UpsertWarehouseProductSettingRequest
{
    public Guid WarehouseId { get; set; }
    public Guid ProductId { get; set; }
    public decimal ReorderPoint { get; set; }
    public decimal TargetStockLevel { get; set; }
    public decimal MinOrderQuantity { get; set; } = 1m;
    public bool IsActive { get; set; } = true;
}
