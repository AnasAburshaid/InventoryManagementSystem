using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.DataAccess.Entities;

[Table("SupplierProduct")]
[Index("ProductId", Name = "IX_SupplierProduct_ProductId")]
[Index("SupplierId", "ProductId", Name = "UQ_SupplierProduct_Supplier_Product", IsUnique = true)]
public partial class SupplierProduct
{
    [Key]
    public Guid Id { get; set; }

    public Guid SupplierId { get; set; }

    public Guid ProductId { get; set; }

    [Column("SupplierSKU")]
    [StringLength(100)]
    [Unicode(false)]
    public string? SupplierSku { get; set; }

    public DateTime CreatedAt { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("ProductId")]
    [InverseProperty("SupplierProducts")]
    public virtual Product Product { get; set; } = null!;

    [ForeignKey("SupplierId")]
    [InverseProperty("SupplierProducts")]
    public virtual Supplier Supplier { get; set; } = null!;
}
