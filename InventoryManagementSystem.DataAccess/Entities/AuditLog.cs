using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace InventoryManagementSystem.DataAccess.Entities;

[Table("AuditLog")]
public class AuditLog
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = null!;
    public string? UserName { get; set; }
    public string? UserRole { get; set; }
    public string Action { get; set; } = null!;
    public string EntityName { get; set; } = null!;
    public string? EntityId { get; set; }
    public Guid? WarehouseId { get; set; }
    public virtual Warehouse? Warehouse { get; set; }
    public string? Details { get; set; }
    public string? IpAddress { get; set; }
    public DateTime CreatedAt { get; set; }
}
