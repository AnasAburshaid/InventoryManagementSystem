using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.DataAccess.Entities;

[Table("PurchaseOrder")]
[Index("PurchaseOrderNumber", Name = "UQ_PurchaseOrder_PurchaseOrderNumber", IsUnique = true)]
[Index("SupplierId", Name = "IX_PurchaseOrder_SupplierId")]
[Index("WarehouseId", Name = "IX_PurchaseOrder_WarehouseId")]
[Index("Status", Name = "IX_PurchaseOrder_Status")]
[Index("OrderDate", Name = "IX_PurchaseOrder_OrderDate")]
public partial class PurchaseOrder
{
    [Key]
    public Guid Id { get; set; }

    [StringLength(30)]
    public string PurchaseOrderNumber { get; set; } = null!;

    public Guid SupplierId { get; set; }

    public Guid WarehouseId { get; set; }

    public DateTime OrderDate { get; set; }

    public DateTime? ExpectedDeliveryDate { get; set; }

    [StringLength(30)]
    public string Status { get; set; } = null!;

    [StringLength(1000)]
    public string? Notes { get; set; }

    [StringLength(450)]
    public string? CreatedByUserId { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    [ForeignKey("SupplierId")]
    [InverseProperty("PurchaseOrders")]
    public virtual Supplier Supplier { get; set; } = null!;

    [ForeignKey("WarehouseId")]
    [InverseProperty("PurchaseOrders")]
    public virtual Warehouse Warehouse { get; set; } = null!;

    [InverseProperty("PurchaseOrder")]
    public virtual ICollection<PurchaseOrderLine> PurchaseOrderLines { get; set; } = new List<PurchaseOrderLine>();
}
