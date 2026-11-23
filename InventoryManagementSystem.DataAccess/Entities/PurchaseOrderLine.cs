using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.DataAccess.Entities;

[Table("PurchaseOrderLine")]
[Index("PurchaseOrderId", "LineNumber", Name = "UQ_PurchaseOrderLine_PurchaseOrderId_LineNumber", IsUnique = true)]
[Index("PurchaseOrderId", Name = "IX_PurchaseOrderLine_PurchaseOrderId")]
[Index("ProductId", Name = "IX_PurchaseOrderLine_ProductId")]
public partial class PurchaseOrderLine
{
    [Key]
    public Guid Id { get; set; }

    public Guid PurchaseOrderId { get; set; }

    public int LineNumber { get; set; }

    public Guid ProductId { get; set; }

    [Column(TypeName = "decimal(18, 3)")]
    public decimal QuantityOrdered { get; set; }

    [Column(TypeName = "decimal(18, 3)")]
    public decimal QuantityReceived { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal UnitCost { get; set; }

    public DateTime CreatedAt { get; set; }

    [ForeignKey("PurchaseOrderId")]
    [InverseProperty("PurchaseOrderLines")]
    public virtual PurchaseOrder PurchaseOrder { get; set; } = null!;

    [ForeignKey("ProductId")]
    [InverseProperty("PurchaseOrderLines")]
    public virtual Product Product { get; set; } = null!;
}
