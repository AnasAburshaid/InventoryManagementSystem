using InventoryManagementSystem.DataAccess.Enums;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InventoryManagementSystem.DataAccess.Entities;

[Table("WarehouseAssignment")]
[Index("WarehouseId", Name = "IX_WarehouseAssignment_WarehouseId")]
[Index("UserId", "WarehouseId", Name = "UQ_WarehouseAssignment_User_Warehouse", IsUnique = true)]
public partial class WarehouseAssignment
{
    [Key]
    public Guid Id { get; set; }

    public string UserId { get; set; } = null!;

    public Guid WarehouseId { get; set; }
    public WarehouseAssignmentRole Role { get; set; }

    public DateTime AssignedAt { get; set; }

    public bool IsActive { get; set; }
    public virtual Warehouse Warehouse { get; set; } = null!;

}
