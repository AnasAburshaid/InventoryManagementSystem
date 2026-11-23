using System;

namespace InventoryManagementSystem.Business.Analytics.DTOs;

public class WarehouseInventoryFilter
{
    public Guid WarehouseId { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? BrandId { get; set; }
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Filter mode: All, InStock, OutOfStock, LowStock, Dormant, PermittedOnly
    /// </summary>
    public string? StockStatus { get; set; } = "All";

    public int PageIndex { get; set; } = 1;
    public int PageSize { get; set; } = 20;

    public string? SortBy { get; set; } = "CurrentStock";
    public bool SortDescending { get; set; } = true;
}
