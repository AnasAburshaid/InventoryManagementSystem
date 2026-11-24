using System;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.Analytics.DTOs;
using InventoryManagementSystem.Business.AuditLogs.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.AuditLogs.Services;

public class AuditLogService : IAuditLogService
{
    private readonly InventoryDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditLogService(
        InventoryDbContext context,
        IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task LogAsync(
        string action,
        string entityName,
        string? entityId,
        Guid? warehouseId,
        object? details = null,
        CancellationToken cancellationToken = default)
    {
        ClaimsPrincipal? user = _httpContextAccessor.HttpContext?.User;
        string userId = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                        ?? user?.FindFirst("sub")?.Value
                        ?? "System";

        string? userName = user?.FindFirst(ClaimTypes.Name)?.Value
                           ?? user?.FindFirst(ClaimTypes.Email)?.Value
                           ?? user?.Identity?.Name;

        string? userRole = user?.FindFirst(ClaimTypes.Role)?.Value
                           ?? user?.FindFirst("role")?.Value;

        string? ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();

        string? detailsJson = null;
        if (details != null)
        {
            if (details is string strDetails)
            {
                detailsJson = strDetails;
            }
            else
            {
                try
                {
                    detailsJson = JsonSerializer.Serialize(details);
                }
                catch
                {
                    detailsJson = details.ToString();
                }
            }
        }

        var log = new AuditLog
        {
            UserId = userId,
            UserName = userName,
            UserRole = userRole,
            Action = action,
            EntityName = entityName,
            EntityId = entityId,
            WarehouseId = warehouseId,
            Details = detailsJson,
            IpAddress = ipAddress,
            CreatedAt = DateTime.UtcNow
        };

        _context.AuditLogs.Add(log);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<PagedResult<AuditLogResponse>> GetAuditLogsAsync(
        AuditLogFilter filter,
        CancellationToken cancellationToken = default)
    {
        IQueryable<AuditLog> query = _context.AuditLogs
            .AsNoTracking()
            .Include(a => a.Warehouse);

        if (filter.WarehouseId.HasValue)
        {
            query = query.Where(a => a.WarehouseId == filter.WarehouseId.Value);
        }
        else if (filter.AllowedWarehouseIds != null && filter.AllowedWarehouseIds.Count > 0)
        {
            query = query.Where(a => a.WarehouseId.HasValue && filter.AllowedWarehouseIds.Contains(a.WarehouseId.Value));
        }

        if (!string.IsNullOrWhiteSpace(filter.UserId))
        {
            query = query.Where(a => a.UserId == filter.UserId);
        }

        if (!string.IsNullOrWhiteSpace(filter.Action))
        {
            query = query.Where(a => a.Action.Contains(filter.Action));
        }

        if (!string.IsNullOrWhiteSpace(filter.EntityName))
        {
            query = query.Where(a => a.EntityName == filter.EntityName);
        }

        if (filter.FromDate.HasValue)
        {
            query = query.Where(a => a.CreatedAt >= filter.FromDate.Value);
        }

        if (filter.ToDate.HasValue)
        {
            query = query.Where(a => a.CreatedAt <= filter.ToDate.Value);
        }

        int totalCount = await query.CountAsync(cancellationToken);

        int pageIndex = filter.PageIndex > 0 ? filter.PageIndex : 1;
        int pageSize = filter.PageSize > 0 ? filter.PageSize : 50;

        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogResponse
            {
                Id = a.Id,
                UserId = a.UserId,
                UserName = a.UserName,
                UserRole = a.UserRole,
                Action = a.Action,
                EntityName = a.EntityName,
                EntityId = a.EntityId,
                WarehouseId = a.WarehouseId,
                WarehouseName = a.Warehouse != null ? a.Warehouse.Name : null,
                Details = a.Details,
                IpAddress = a.IpAddress,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<AuditLogResponse>
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = pageIndex,
            PageSize = pageSize
        };
    }
}
