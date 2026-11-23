using System;

namespace InventoryManagementSystem.Business.Analytics.DTOs;

public class WarehouseActivitySummary
{
    public decimal TotalReceivedQuantity { get; set; }
    public decimal TotalDispatchedQuantity { get; set; }
    public decimal NetStockChange { get; set; }

    public decimal TotalPurchasesQuantity { get; set; }
    public decimal TotalSalesQuantity { get; set; }
    public decimal TotalTransfersInQuantity { get; set; }
    public decimal TotalTransfersOutQuantity { get; set; }
    public decimal TotalAdjustmentsInQuantity { get; set; }
    public decimal TotalAdjustmentsOutQuantity { get; set; }

    public int TotalMovementCount { get; set; }
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public string DatePresetApplied { get; set; } = "Custom";
}
