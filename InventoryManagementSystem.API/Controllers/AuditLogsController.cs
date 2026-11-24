using System;
using System.Security.Claims;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.Analytics.DTOs;
using InventoryManagementSystem.Business.AuditLogs.DTOs;
using InventoryManagementSystem.Business.AuditLogs.Services;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.API.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize]
public class AuditLogsController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;
    private readonly InventoryDbContext _context;

    public AuditLogsController(
        IAuditLogService auditLogService,
        InventoryDbContext context)
    {
        _auditLogService = auditLogService;
        _context = context;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AuditLogResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedResult<AuditLogResponse>>> GetLogs([FromQuery] AuditLogFilter filter)
    {
        bool isAdmin = User.IsInRole("Admin") ||
                       User.HasClaim(ClaimTypes.Role, "Admin") ||
                       User.HasClaim("role", "Admin");

        string? userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                        ?? User.FindFirst("sub")?.Value;

        if (!isAdmin)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                return Forbid();
            }

            // Non-admin users must be at least a Supervisor in the requested warehouse
            if (filter.WarehouseId.HasValue)
            {
                var allowedRoles = new[] { WarehouseAssignmentRole.Supervisor, WarehouseAssignmentRole.Manager };
                bool hasAccess = await _context.WarehouseAssignments
                    .AsNoTracking()
                    .AnyAsync(wa => wa.UserId == userId
                                 && wa.WarehouseId == filter.WarehouseId.Value
                                 && wa.IsActive
                                 && allowedRoles.Contains(wa.Role));

                if (!hasAccess)
                {
                    return Forbid();
                }
            }
            else
            {
                // Non-admin without specified warehouse can only see logs if they have supervisor assignments
                var supervisorWarehouseIds = await _context.WarehouseAssignments
                    .AsNoTracking()
                    .Where(wa => wa.UserId == userId && wa.IsActive &&
                                (wa.Role == WarehouseAssignmentRole.Supervisor || wa.Role == WarehouseAssignmentRole.Manager))
                    .Select(wa => wa.WarehouseId)
                    .ToListAsync();

                if (!supervisorWarehouseIds.Any())
                {
                    return Forbid();
                }

                filter.AllowedWarehouseIds = supervisorWarehouseIds;
            }
        }

        var result = await _auditLogService.GetAuditLogsAsync(filter);
        return Ok(result);
    }
}
