using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace InventoryManagementSystem.DataAccess.Entities;

[Table("StockCountItem")]
public class StockCountItem
{
    public Guid Id { get; set; }
    public Guid StockCountSessionId { get; set; }
    public virtual StockCountSession StockCountSession { get; set; } = null!;
    public Guid ProductId { get; set; }
    public virtual Product Product { get; set; } = null!;
    public decimal SystemQuantity { get; set; }
    public decimal? CountedQuantity { get; set; }
    public decimal? DiscrepancyQuantity { get; set; }
    public string? Notes { get; set; }
}
