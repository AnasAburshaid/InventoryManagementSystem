using System.Text.Json;
using InventoryManagementSystem.Business.Assistant.Security;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.Assistant.Tools;

public class GetPurchaseOrdersTool : IAssistantTool
{
    private readonly InventoryDbContext _context;

    public GetPurchaseOrdersTool(InventoryDbContext context)
    {
        _context = context;
    }

    public string Name => "get_purchase_orders";

    public string Description => "Retrieve recent Purchase Orders, supplier details, statuses, total amounts, and destination warehouses.";

    public object ParametersSchema => new
    {
        type = "object",
        properties = new
        {
            status = new { type = "string", description = "Optional status filter: Draft, Submitted, Approved, Received, Cancelled" },
            supplier_name = new { type = "string", description = "Optional supplier name filter" },
            warehouse_name_or_id = new { type = "string", description = "Optional warehouse name or UUID filter" },
            limit = new { type = "integer", description = "Max results (1-20, default 10)" }
        }
    };

    public async Task<string> ExecuteAsync(JsonElement arguments, AssistantSecurityContext securityContext, CancellationToken ct = default)
    {
        string? statusInput = arguments.TryGetProperty("status", out var s) ? s.GetString() : null;
        string? supplierInput = arguments.TryGetProperty("supplier_name", out var sup) ? sup.GetString() : null;
        string? warehouseInput = arguments.TryGetProperty("warehouse_name_or_id", out var w) ? w.GetString() : null;
        int limit = arguments.TryGetProperty("limit", out var l) && l.TryGetInt32(out var lim) ? Math.Clamp(lim, 1, 20) : 10;

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
                return $"[AUTHORIZATION DENIED]: You are not authorized to view purchase orders for '{match.Name}'. Your authorized warehouses are: {(string.IsNullOrEmpty(allowedNames) ? "None assigned" : allowedNames)}.";
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
                return "[AUTHORIZATION NOTICE]: You have no active warehouse assignments to view purchase orders.";
            }
        }

        var query = _context.PurchaseOrders
            .AsNoTracking()
            .Include(po => po.Supplier)
            .Include(po => po.Warehouse)
            .Include(po => po.PurchaseOrderLines)
            .Where(po => targetWarehouseIds.Contains(po.WarehouseId))
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(statusInput))
        {
            query = query.Where(po => po.Status.ToLower() == statusInput.Trim().ToLower());
        }

        if (!string.IsNullOrWhiteSpace(supplierInput))
        {
            var sLower = supplierInput.Trim().ToLower();
            query = query.Where(po => po.Supplier != null && po.Supplier.Name.ToLower().Contains(sLower));
        }

        var orders = await query
            .OrderByDescending(po => po.CreatedAt)
            .Take(limit)
            .Select(po => new
            {
                po.Id,
                OrderNumber = po.PurchaseOrderNumber,
                Supplier = po.Supplier != null ? po.Supplier.Name : "Unknown Supplier",
                Warehouse = po.Warehouse != null ? po.Warehouse.Name : "Unknown Warehouse",
                po.Status,
                TotalAmount = po.PurchaseOrderLines.Sum(l => l.QuantityOrdered * l.UnitCost),
                ItemCount = po.PurchaseOrderLines.Count,
                Date = po.CreatedAt
            })
            .ToListAsync(ct);

        if (orders.Count == 0) return "No purchase orders found matching the criteria.";

        return JsonSerializer.Serialize(new
        {
            TotalFound = orders.Count,
            PurchaseOrders = orders
        });
    }
}
