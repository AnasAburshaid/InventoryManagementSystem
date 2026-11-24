using System;

namespace InventoryManagementSystem.Business.StockCounting.DTOs;

public class ReviewStockCountSessionRequest
{
    public bool Approve { get; set; }
    public string? ReviewNotes { get; set; }
    public Guid? DefaultAdjustmentReasonId { get; set; }
}
