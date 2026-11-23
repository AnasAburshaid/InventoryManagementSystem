using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.DataAccess.Entities;

[Table("WarehouseCategoryRestriction")]
[Index("WarehouseId", Name = "IX_WarehouseCategoryRestriction_WarehouseId")]
[Index("CategoryId", Name = "IX_WarehouseCategoryRestriction_CategoryId")]
[Index("WarehouseId", "CategoryId", Name = "UQ_WarehouseCategoryRestriction_Warehouse_Category", IsUnique = true)]
public partial class WarehouseCategoryRestriction
{
    [Key]
    public Guid Id { get; set; }

    public Guid WarehouseId { get; set; }

    public Guid CategoryId { get; set; }

    public DateTime CreatedAt { get; set; }

    [ForeignKey("WarehouseId")]
    [InverseProperty("CategoryRestrictions")]
    public virtual Warehouse Warehouse { get; set; } = null!;

    [ForeignKey("CategoryId")]
    [InverseProperty("WarehouseCategoryRestrictions")]
    public virtual Category Category { get; set; } = null!;
}
