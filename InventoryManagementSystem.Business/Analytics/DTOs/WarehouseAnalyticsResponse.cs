using System;
using System.Collections.Generic;

namespace InventoryManagementSystem.Business.Analytics.DTOs;

public class WarehouseAnalyticsResponse
{
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = null!;
    public string WarehouseCode { get; set; } = null!;
    public bool CanAcceptAllCategories { get; set; }

    public WarehouseActivitySummary ActivitySummary { get; set; } = new();
    public IReadOnlyCollection<TopMovingProductDto> TopMovingProducts { get; set; } = new List<TopMovingProductDto>();
    public IReadOnlyCollection<DormantProductDto> DormantProducts { get; set; } = new List<DormantProductDto>();
    public IReadOnlyCollection<WarehouseInventoryItem> LowStockAlerts { get; set; } = new List<WarehouseInventoryItem>();

    public int TotalStockedProductsCount { get; set; }
    public decimal TotalUnitsInWarehouse { get; set; }
}
