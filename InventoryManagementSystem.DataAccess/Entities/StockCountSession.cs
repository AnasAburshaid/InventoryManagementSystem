using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using InventoryManagementSystem.DataAccess.Enums;

namespace InventoryManagementSystem.DataAccess.Entities;

[Table("StockCountSession")]
public class StockCountSession
{
    public Guid Id { get; set; }
    public string SessionNumber { get; set; } = null!;
    public Guid WarehouseId { get; set; }
    public virtual Warehouse Warehouse { get; set; } = null!;
    public StockCountStatus Status { get; set; } = StockCountStatus.Draft;
    public StockCountType CountType { get; set; } = StockCountType.Full;
    public string? Notes { get; set; }
    public string CreatedByUserId { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public string? SubmittedByUserId { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public string? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNotes { get; set; }

    public virtual ICollection<StockCountItem> Items { get; set; } = new List<StockCountItem>();
}
