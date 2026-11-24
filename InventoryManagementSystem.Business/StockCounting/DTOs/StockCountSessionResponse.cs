using System;
using System.Collections.Generic;
using InventoryManagementSystem.DataAccess.Enums;

namespace InventoryManagementSystem.Business.StockCounting.DTOs;

public class StockCountSessionResponse
{
    public Guid Id { get; set; }
    public string SessionNumber { get; set; } = null!;
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = null!;
    public string WarehouseCode { get; set; } = null!;
    public StockCountStatus Status { get; set; }
    public StockCountType CountType { get; set; }
    public string? Notes { get; set; }
    public string CreatedByUserId { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public string? SubmittedByUserId { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public string? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNotes { get; set; }
    public int TotalItemsCount { get; set; }
    public int DiscrepantItemsCount { get; set; }
    public IReadOnlyCollection<StockCountItemResponse> Items { get; set; } = new List<StockCountItemResponse>();
}
