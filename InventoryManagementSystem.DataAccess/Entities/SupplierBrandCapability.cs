using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.DataAccess.Entities;

[Table("SupplierBrandCapability")]
[Index("SupplierId", Name = "IX_SupplierBrandCapability_SupplierId")]
[Index("BrandId", Name = "IX_SupplierBrandCapability_BrandId")]
[Index("SupplierId", "BrandId", Name = "UQ_SupplierBrandCapability_Supplier_Brand", IsUnique = true)]
public partial class SupplierBrandCapability
{
    [Key]
    public Guid Id { get; set; }

    public Guid SupplierId { get; set; }

    public Guid BrandId { get; set; }

    public DateTime CreatedAt { get; set; }

    [ForeignKey("SupplierId")]
    [InverseProperty("BrandCapabilities")]
    public virtual Supplier Supplier { get; set; } = null!;

    [ForeignKey("BrandId")]
    [InverseProperty("SupplierBrandCapabilities")]
    public virtual Brand Brand { get; set; } = null!;
}
