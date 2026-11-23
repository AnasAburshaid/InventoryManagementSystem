using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.DataAccess.Entities;

[Table("SupplierProduct")]
[Index("SupplierId", Name = "IX_SupplierProduct_SupplierId")]
[Index("ProductId", Name = "IX_SupplierProduct_ProductId")]
[Index("SupplierId", "ProductId", Name = "UQ_SupplierProduct_Supplier_Product", IsUnique = true)]
public partial class SupplierProduct
{
    [Key]
    public Guid Id { get; set; }

    public Guid SupplierId { get; set; }

    public Guid ProductId { get; set; }

    [StringLength(100)]
    public string? SupplierProductCode { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? LastPurchasePrice { get; set; }

    public int? LeadTimeDays { get; set; }

    public bool IsPreferred { get; set; }

    public DateTime CreatedAt { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("ProductId")]
    [InverseProperty("SupplierProducts")]
    public virtual Product Product { get; set; } = null!;

    [ForeignKey("SupplierId")]
    [InverseProperty("SupplierProducts")]
    public virtual Supplier Supplier { get; set; } = null!;
}
