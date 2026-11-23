using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.DataAccess.Entities;

[Table("SalesOrderLine")]
[Index("SalesOrderId", "LineNumber", Name = "UQ_SalesOrderLine_SalesOrderId_LineNumber", IsUnique = true)]
[Index("SalesOrderId", Name = "IX_SalesOrderLine_SalesOrderId")]
[Index("ProductId", Name = "IX_SalesOrderLine_ProductId")]
public partial class SalesOrderLine
{
    [Key]
    public Guid Id { get; set; }

    public Guid SalesOrderId { get; set; }

    public int LineNumber { get; set; }

    public Guid ProductId { get; set; }

    [Column(TypeName = "decimal(18, 3)")]
    public decimal QuantityOrdered { get; set; }

    [Column(TypeName = "decimal(18, 3)")]
    public decimal QuantityFulfilled { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal UnitPrice { get; set; }

    public DateTime CreatedAt { get; set; }

    [ForeignKey("SalesOrderId")]
    [InverseProperty("SalesOrderLines")]
    public virtual SalesOrder SalesOrder { get; set; } = null!;

    [ForeignKey("ProductId")]
    [InverseProperty("SalesOrderLines")]
    public virtual Product Product { get; set; } = null!;
}
