using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.DataAccess.Entities;

[Table("UnitOfMeasure")]
[Index(nameof(Code), Name = "UQ_UnitOfMeasure_Code", IsUnique = true)]
[Index(nameof(Name), Name = "UQ_UnitOfMeasure_Name", IsUnique = true)]
public partial class UnitOfMeasure
{
    [Key]
    public Guid Id { get; set; }

    [StringLength(100)]
    public string Name { get; set; } = null!;

    [StringLength(20)]
    [Unicode(false)]
    public string Code { get; set; } = null!;

    [StringLength(250)]
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    [InverseProperty("UnitOfMeasure")]
    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
}
