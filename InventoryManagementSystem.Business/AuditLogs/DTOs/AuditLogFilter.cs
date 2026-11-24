using System;

namespace InventoryManagementSystem.Business.AuditLogs.DTOs;

public class AuditLogFilter
{
    public Guid? WarehouseId { get; set; }
    public List<Guid>? AllowedWarehouseIds { get; set; }
    public string? UserId { get; set; }
    public string? Action { get; set; }
    public string? EntityName { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int PageIndex { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}
