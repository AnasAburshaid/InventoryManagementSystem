using System;
using System.Collections.Generic;
using InventoryManagementSystem.DataAccess.Enums;

namespace InventoryManagementSystem.Business.StockCounting.DTOs;

public class CreateStockCountSessionRequest
{
    public Guid WarehouseId { get; set; }
    public StockCountType CountType { get; set; } = StockCountType.Full;
    public List<Guid>? ProductIds { get; set; }
    public string? Notes { get; set; }
}
