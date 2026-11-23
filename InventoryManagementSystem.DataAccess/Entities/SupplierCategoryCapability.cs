using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.DataAccess.Entities;

[Table("SupplierCategoryCapability")]
[Index("SupplierId", Name = "IX_SupplierCategoryCapability_SupplierId")]
[Index("CategoryId", Name = "IX_SupplierCategoryCapability_CategoryId")]
[Index("SupplierId", "CategoryId", Name = "UQ_SupplierCategoryCapability_Supplier_Category", IsUnique = true)]
public partial class SupplierCategoryCapability
{
    [Key]
    public Guid Id { get; set; }

    public Guid SupplierId { get; set; }

    public Guid CategoryId { get; set; }

    public DateTime CreatedAt { get; set; }

    [ForeignKey("SupplierId")]
    [InverseProperty("CategoryCapabilities")]
    public virtual Supplier Supplier { get; set; } = null!;

    [ForeignKey("CategoryId")]
    [InverseProperty("SupplierCategoryCapabilities")]
    public virtual Category Category { get; set; } = null!;
}
