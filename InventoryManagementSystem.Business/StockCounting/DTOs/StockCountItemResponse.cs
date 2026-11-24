using System;

namespace InventoryManagementSystem.Business.StockCounting.DTOs;

public class StockCountItemResponse
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductSku { get; set; } = null!;
    public string ProductName { get; set; } = null!;
    public string? UnitOfMeasureName { get; set; }
    public decimal SystemQuantity { get; set; }
    public decimal? CountedQuantity { get; set; }
    public decimal? DiscrepancyQuantity { get; set; }
    public string? Notes { get; set; }
}
