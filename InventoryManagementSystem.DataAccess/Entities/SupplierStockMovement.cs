using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using InventoryManagementSystem.DataAccess.Enums;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.DataAccess.Entities;

[Table("SupplierStockMovement")]
[Index("SupplierId", "ProductId", Name = "IX_SupplierStockMovement_Supplier_Product")]
[Index("CreatedAt", Name = "IX_SupplierStockMovement_CreatedAt")]
public partial class SupplierStockMovement
{
    [Key]
    public Guid Id { get; set; }

    public Guid SupplierId { get; set; }

    public Guid ProductId { get; set; }

    [Column("MovementType")]
    public SupplierStockMovementType MovementType { get; set; }

    [Column(TypeName = "decimal(18, 3)")]
    public decimal Quantity { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? UnitCost { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string? ReferenceType { get; set; }

    [StringLength(100)]
    public string? ReferenceId { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }

    [StringLength(450)]
    public string CreatedByUserId { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    [ForeignKey("SupplierId")]
    [InverseProperty("SupplierStockMovements")]
    public virtual Supplier Supplier { get; set; } = null!;

    [ForeignKey("ProductId")]
    [InverseProperty("SupplierStockMovements")]
    public virtual Product Product { get; set; } = null!;
}
