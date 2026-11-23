using System;

namespace InventoryManagementSystem.Business.Suppliers.Stock.DTOs;

public class SupplierStockSummaryResponse
{
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public decimal OnHandQuantity { get; set; }
    public decimal ReservedQuantity { get; set; }
    public decimal AvailableToPromiseQuantity { get; set; }
    public decimal AvailableToPromise => AvailableToPromiseQuantity;
    public decimal? LastPurchasePrice { get; set; }
    public bool IsPreferred { get; set; }
    public DateTime? LastReplenishedAt { get; set; }
}
