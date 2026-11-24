using System.Text.Json;
using InventoryManagementSystem.Business.Assistant.Security;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.Assistant.Tools;

public class GetAuditLogsTool : IAssistantTool
{
    private readonly InventoryDbContext _context;

    public GetAuditLogsTool(InventoryDbContext context)
    {
        _context = context;
    }

    public string Name => "get_audit_logs";

    public string Description => "Review system-wide audit trail logs and operational business activities (adjustments, transfers, approvals, creations) for authorized facilities.";

    public object ParametersSchema => new
    {
        type = "object",
        properties = new
        {
            action = new { type = "string", description = "Optional action filter (e.g. StockMovementCreated, StockCountApproved, etc.)" },
            entity_name = new { type = "string", description = "Optional affected entity (e.g. StockMovement, PurchaseOrder, StockCountSession)" },
            limit = new { type = "integer", description = "Max audit records (1-25, default 15)" }
        }
    };

    public async Task<string> ExecuteAsync(JsonElement arguments, AssistantSecurityContext securityContext, CancellationToken ct = default)
    {
        string? actionInput = arguments.TryGetProperty("action", out var a) ? a.GetString() : null;
        string? entityInput = arguments.TryGetProperty("entity_name", out var e) ? e.GetString() : null;
        int limit = arguments.TryGetProperty("limit", out var l) && l.TryGetInt32(out var lim) ? Math.Clamp(lim, 1, 25) : 15;

        var query = _context.AuditLogs.AsNoTracking().AsQueryable();

        // Enforce warehouse scope if user is not global Admin
        if (!securityContext.IsAdmin)
        {
            if (securityContext.AssignedWarehouseIds.Count == 0)
            {
                return "[AUTHORIZATION NOTICE]: You have no active warehouse assignments to view audit records.";
            }

            // Show logs tied to user's warehouses or performed by the user
            query = query.Where(log =>
                (log.WarehouseId.HasValue && securityContext.AssignedWarehouseIds.Contains(log.WarehouseId.Value)) ||
                log.UserId == securityContext.UserId);
        }

        if (!string.IsNullOrWhiteSpace(actionInput))
        {
            var aLower = actionInput.Trim().ToLower();
            query = query.Where(log => log.Action.ToLower().Contains(aLower));
        }

        if (!string.IsNullOrWhiteSpace(entityInput))
        {
            var eLower = entityInput.Trim().ToLower();
            query = query.Where(log => log.EntityName.ToLower().Contains(eLower));
        }

        var logs = await query
            .OrderByDescending(log => log.CreatedAt)
            .Take(limit)
            .Select(log => new
            {
                Timestamp = log.CreatedAt,
                User = log.UserName ?? log.UserId,
                Action = log.Action,
                Entity = log.EntityName,
                EntityId = log.EntityId,
                WarehouseId = log.WarehouseId,
                Details = log.Details
            })
            .ToListAsync(ct);

        if (logs.Count == 0) return "No audit logs found matching criteria.";

        return JsonSerializer.Serialize(new
        {
            TotalRecords = logs.Count,
            AuditRecords = logs
        });
    }
}
