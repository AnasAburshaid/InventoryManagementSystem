using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.DataAccess.Entities;

[Table("Supplier")]
public partial class Supplier
{
    [Key]
    public Guid Id { get; set; }

    [StringLength(150)]
    public string Name { get; set; } = null!;

    [StringLength(30)]
    [Unicode(false)]
    public string? Phone { get; set; }

    [StringLength(254)]
    [Unicode(false)]
    public string? Email { get; set; }

    public DateTime CreatedAt { get; set; }

    public bool IsActive { get; set; }

    public bool CanSupplyAllCategories { get; set; }

    public bool CanSupplyAllBrands { get; set; }

    [InverseProperty("Supplier")]
    public virtual ICollection<SupplierProduct> SupplierProducts { get; set; } = new List<SupplierProduct>();

    [InverseProperty("Supplier")]
    public virtual ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();

    [InverseProperty("Supplier")]
    public virtual ICollection<SupplierCategoryCapability> CategoryCapabilities { get; set; } = new List<SupplierCategoryCapability>();

    [InverseProperty("Supplier")]
    public virtual ICollection<SupplierBrandCapability> BrandCapabilities { get; set; } = new List<SupplierBrandCapability>();

    [InverseProperty("Supplier")]
    public virtual ICollection<SupplierStockMovement> SupplierStockMovements { get; set; } = new List<SupplierStockMovement>();
}
