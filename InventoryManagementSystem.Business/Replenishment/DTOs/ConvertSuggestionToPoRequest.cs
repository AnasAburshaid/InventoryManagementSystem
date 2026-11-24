using System;

namespace InventoryManagementSystem.Business.Replenishment.DTOs;

public class ConvertSuggestionToPoRequest
{
    public Guid WarehouseId { get; set; }
    public Guid ProductId { get; set; }
    public decimal Quantity { get; set; }
    public Guid? SupplierId { get; set; }
    public decimal? UnitPrice { get; set; }
    public string? Notes { get; set; }
}
