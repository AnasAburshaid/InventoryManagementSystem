using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.DataAccess.Entities;

[Table("SalesOrder")]
[Index("SalesOrderNumber", Name = "UQ_SalesOrder_SalesOrderNumber", IsUnique = true)]
[Index("CustomerId", Name = "IX_SalesOrder_CustomerId")]
[Index("WarehouseId", Name = "IX_SalesOrder_WarehouseId")]
[Index("Status", Name = "IX_SalesOrder_Status")]
[Index("OrderDate", Name = "IX_SalesOrder_OrderDate")]
public partial class SalesOrder
{
    [Key]
    public Guid Id { get; set; }

    [StringLength(30)]
    public string SalesOrderNumber { get; set; } = null!;

    public Guid CustomerId { get; set; }

    public Guid WarehouseId { get; set; }

    public DateTime OrderDate { get; set; }

    [StringLength(30)]
    public string Status { get; set; } = null!;

    [StringLength(1000)]
    public string? Notes { get; set; }

    [StringLength(450)]
    public string? CreatedByUserId { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    [ForeignKey("CustomerId")]
    [InverseProperty("SalesOrders")]
    public virtual Customer Customer { get; set; } = null!;

    [ForeignKey("WarehouseId")]
    [InverseProperty("SalesOrders")]
    public virtual Warehouse Warehouse { get; set; } = null!;

    [InverseProperty("SalesOrder")]
    public virtual ICollection<SalesOrderLine> SalesOrderLines { get; set; } = new List<SalesOrderLine>();
}
