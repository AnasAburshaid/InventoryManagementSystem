using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace InventoryManagementSystem.DataAccess.Entities;

[Table("WarehouseProductSetting")]
public class WarehouseProductSetting
{
    public Guid Id { get; set; }
    public Guid WarehouseId { get; set; }
    public virtual Warehouse Warehouse { get; set; } = null!;
    public Guid ProductId { get; set; }
    public virtual Product Product { get; set; } = null!;
    public decimal ReorderPoint { get; set; }
    public decimal TargetStockLevel { get; set; }
    public decimal MinOrderQuantity { get; set; } = 1m;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
