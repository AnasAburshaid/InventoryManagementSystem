using System;
using InventoryManagementSystem.DataAccess.Enums;

namespace InventoryManagementSystem.Business.Analytics.DTOs;

public class WarehouseMovementHistoryItem
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = null!;
    public string ProductSku { get; set; } = null!;
    public string CategoryName { get; set; } = null!;
    public string? BrandName { get; set; }
    public string UomName { get; set; } = null!;
    public StockMovementType MovementType { get; set; }

    /// <summary>
    /// Always positive absolute quantity moved.
    /// </summary>
    public decimal Quantity { get; set; }

    /// <summary>
    /// Net stock impact: Positive for Inbound (+), Negative for Outbound (-).
    /// </summary>
    public decimal NetQuantityChange { get; set; }

    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = null!;
    public string WarehouseCode { get; set; } = null!;

    public Guid? LinkedMovementId { get; set; }
    public Guid? OtherWarehouseId { get; set; }
    public string? OtherWarehouseName { get; set; }
    public string? OtherWarehouseCode { get; set; }

    public string? ReferenceType { get; set; }
    public string? ReferenceId { get; set; }

    public Guid? AdjustmentReasonId { get; set; }
    public string? AdjustmentReasonName { get; set; }

    public string CreatedByUserId { get; set; } = null!;
    public string? CreatedByUserName { get; set; }
    public DateTime CreatedAt { get; set; }
}
