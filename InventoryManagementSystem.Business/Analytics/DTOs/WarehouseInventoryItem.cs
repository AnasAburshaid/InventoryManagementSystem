using System;

namespace InventoryManagementSystem.Business.Analytics.DTOs;

public class WarehouseInventoryItem
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = null!;
    public string ProductSku { get; set; } = null!;
    public Guid CategoryId { get; set; }
    public string CategoryName { get; set; } = null!;
    public Guid? BrandId { get; set; }
    public string? BrandName { get; set; }
    public string UomName { get; set; } = null!;

    /// <summary>
    /// Exact physical on-hand stock calculated from immutable movements.
    /// </summary>
    public decimal CurrentStock { get; set; }

    /// <summary>
    /// True if the warehouse category restrictions permit stocking this product's category.
    /// </summary>
    public bool IsPermitted { get; set; }

    public bool HasStock => CurrentStock > 0;
    public bool IsLowStock => CurrentStock > 0 && CurrentStock <= 10m;
    public bool IsOutOfStock => CurrentStock <= 0;

    public DateTime? LastMovementDate { get; set; }
    public int? DaysSinceLastMovement { get; set; }

    /// <summary>
    /// True if items have positive stock but have not moved for >= 60 days.
    /// </summary>
    public bool IsDormant => CurrentStock > 0 && (DaysSinceLastMovement == null || DaysSinceLastMovement >= 60);
}
