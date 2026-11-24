using System;
using System.Threading;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.Analytics.DTOs;
using InventoryManagementSystem.Business.AuditLogs.DTOs;

namespace InventoryManagementSystem.Business.AuditLogs.Services;

public interface IAuditLogService
{
    Task LogAsync(
        string action,
        string entityName,
        string? entityId,
        Guid? warehouseId,
        object? details = null,
        CancellationToken cancellationToken = default);

    Task<PagedResult<AuditLogResponse>> GetAuditLogsAsync(
        AuditLogFilter filter,
        CancellationToken cancellationToken = default);
}
