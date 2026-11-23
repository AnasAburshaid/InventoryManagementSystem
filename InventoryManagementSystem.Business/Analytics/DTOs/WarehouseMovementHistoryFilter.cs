using System;
using InventoryManagementSystem.DataAccess.Enums;

namespace InventoryManagementSystem.Business.Analytics.DTOs;

public class WarehouseMovementHistoryFilter
{
    public Guid WarehouseId { get; set; }
    public Guid? ProductId { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? BrandId { get; set; }
    public StockMovementType? MovementType { get; set; }
    public string? ReferenceType { get; set; }
    public string? ReferenceId { get; set; }
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Presets: Today, Yesterday, Last7Days, Last30Days, Last12Months, CurrentMonth, PreviousMonth, CurrentYear, Custom
    /// </summary>
    public string? DatePreset { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }

    public int PageIndex { get; set; } = 1;
    public int PageSize { get; set; } = 20;

    public string? SortBy { get; set; } = "CreatedAt";
    public bool SortDescending { get; set; } = true;
}
