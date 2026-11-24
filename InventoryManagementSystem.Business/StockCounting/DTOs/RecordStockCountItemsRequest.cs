using System;
using System.Collections.Generic;

namespace InventoryManagementSystem.Business.StockCounting.DTOs;

public class RecordStockCountItemDto
{
    public Guid ProductId { get; set; }
    public decimal CountedQuantity { get; set; }
    public string? Notes { get; set; }
}

public class RecordStockCountItemsRequest
{
    public List<RecordStockCountItemDto> Items { get; set; } = new();
}
