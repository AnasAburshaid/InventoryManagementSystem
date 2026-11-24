using System;

namespace InventoryManagementSystem.Business.Replenishment.DTOs;

public class ReplenishmentSuggestionResponse
{
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = null!;
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = null!;
    public string ProductSku { get; set; } = null!;
    public string? UnitOfMeasureName { get; set; }
    public decimal CurrentStock { get; set; }
    public decimal OnOrderStock { get; set; }
    public decimal ReservedStock { get; set; }
    public decimal EffectiveStock { get; set; }
    public decimal ReorderPoint { get; set; }
    public decimal TargetStockLevel { get; set; }
    public decimal SuggestedQuantity { get; set; }
    public Guid? PreferredSupplierId { get; set; }
    public string? PreferredSupplierName { get; set; }
    public decimal? PreferredSupplierUnitPrice { get; set; }
    public string? SupplierProductCode { get; set; }
    public bool IsCriticallyLow { get; set; }
}
