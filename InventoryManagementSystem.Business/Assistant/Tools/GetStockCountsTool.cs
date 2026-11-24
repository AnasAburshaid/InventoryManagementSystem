using System.Text.Json;
using InventoryManagementSystem.Business.Assistant.Security;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.Assistant.Tools;

public class GetStockCountsTool : IAssistantTool
{
    private readonly InventoryDbContext _context;

    public GetStockCountsTool(InventoryDbContext context)
    {
        _context = context;
    }

    public string Name => "get_stock_counts";

    public string Description => "Query physical stock counting sessions, count statuses, and discrepancy reconciliations across authorized warehouses.";

    public object ParametersSchema => new
    {
        type = "object",
        properties = new
        {
            warehouse_name_or_id = new { type = "string", description = "Optional warehouse name or UUID filter" },
            status = new { type = "string", description = "Optional status: Draft, InProgress, Submitted, Approved, Rejected, Cancelled" }
        }
    };

    public async Task<string> ExecuteAsync(JsonElement arguments, AssistantSecurityContext securityContext, CancellationToken ct = default)
    {
        string? warehouseInput = arguments.TryGetProperty("warehouse_name_or_id", out var w) ? w.GetString() : null;
        string? statusInput = arguments.TryGetProperty("status", out var s) ? s.GetString() : null;

        var allWarehouses = await _context.Warehouses.AsNoTracking().ToListAsync(ct);
        List<Guid> targetWarehouseIds;

        if (!string.IsNullOrWhiteSpace(warehouseInput))
        {
            var match = allWarehouses.FirstOrDefault(wh =>
                (Guid.TryParse(warehouseInput, out var wid) && wh.Id == wid) ||
                wh.Name.Contains(warehouseInput, StringComparison.OrdinalIgnoreCase) ||
                wh.Code.Equals(warehouseInput, StringComparison.OrdinalIgnoreCase));

            if (match == null) return $"Warehouse '{warehouseInput}' was not found.";

            if (!securityContext.HasAccessToWarehouse(match.Id))
            {
                var allowedNames = string.Join(", ", securityContext.AssignedWarehouseNames.Values);
                return $"[AUTHORIZATION DENIED]: You are not authorized to view stock count sessions for '{match.Name}'. Your authorized warehouses are: {(string.IsNullOrEmpty(allowedNames) ? "None assigned" : allowedNames)}.";
            }

            targetWarehouseIds = new List<Guid> { match.Id };
        }
        else
        {
            targetWarehouseIds = securityContext.IsAdmin
                ? allWarehouses.Select(wh => wh.Id).ToList()
                : allWarehouses.Where(wh => securityContext.AssignedWarehouseIds.Contains(wh.Id)).Select(wh => wh.Id).ToList();

            if (targetWarehouseIds.Count == 0)
            {
                return "[AUTHORIZATION NOTICE]: You have no active warehouse assignments to view stock count sessions.";
            }
        }

        var query = _context.StockCountSessions
            .AsNoTracking()
            .Include(sc => sc.Warehouse)
            .Include(sc => sc.Items)
            .Where(sc => targetWarehouseIds.Contains(sc.WarehouseId))
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(statusInput))
        {
            query = query.Where(sc => sc.Status.ToString().ToLower() == statusInput.Trim().ToLower());
        }

        var sessions = await query
            .OrderByDescending(sc => sc.CreatedAt)
            .Take(15)
            .Select(sc => new
            {
                sc.Id,
                sc.SessionNumber,
                Warehouse = sc.Warehouse.Name,
                Type = sc.CountType.ToString(),
                Status = sc.Status.ToString(),
                TotalItemsCounted = sc.Items.Count,
                DiscrepancyItemsCount = sc.Items.Count(i => i.DiscrepancyQuantity != 0),
                Date = sc.CreatedAt
            })
            .ToListAsync(ct);

        if (sessions.Count == 0) return "No stock count sessions found matching criteria.";

        return JsonSerializer.Serialize(new
        {
            TotalFound = sessions.Count,
            StockCountSessions = sessions
        });
    }
}
