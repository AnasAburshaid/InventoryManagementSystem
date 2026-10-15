using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using InventoryManagementSystem.DataAccess.Enums;

namespace InventoryManagementSystem.DataAccess.Entities;

[Table("StockMovement")]
public partial class StockMovement
{
    [Key]
    public Guid Id { get; set; }

    public Guid ProductId { get; set; }
    public Guid WarehouseId { get; set; }

    // Always positive. Direction is determined by Type.
    [Column(TypeName = "decimal(18, 4)")]
    public decimal Quantity { get; set; }

    public StockMovementType Type { get; set; }

    public Guid? AdjustmentReasonId { get; set; }

    [StringLength(50)]
    public string? ReferenceType { get; set; }

    [StringLength(100)]
    public string? ReferenceId { get; set; }

    public Guid? LinkedMovementId { get; set; }

    [StringLength(450)]
    public string CreatedByUserId { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    // Navigation Properties
    [ForeignKey(nameof(ProductId))]
    public virtual Product Product { get; set; } = null!;

    [ForeignKey(nameof(WarehouseId))]
    public virtual Warehouse Warehouse { get; set; } = null!;

    [ForeignKey(nameof(AdjustmentReasonId))]
    public virtual AdjustmentReason? AdjustmentReason { get; set; }

    [ForeignKey(nameof(LinkedMovementId))]
    public virtual StockMovement? LinkedMovement { get; set; }
}