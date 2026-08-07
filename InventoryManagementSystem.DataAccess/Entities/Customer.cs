using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.DataAccess.Entities;

[Table("Customer")]
public partial class Customer
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
}
