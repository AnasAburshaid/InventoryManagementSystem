using System.Text.Json;
using InventoryManagementSystem.Business.Assistant.Security;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.Assistant.Tools;

public class GetSalesOrdersTool : IAssistantTool
{
    private readonly InventoryDbContext _context;

    public GetSalesOrdersTool(InventoryDbContext context)
    {
        _context = context;
    }

    public string Name => "get_sales_orders";

    public string Description => "Retrieve recent Sales Orders, client details, order status, total revenues, and source warehouses.";

    public object ParametersSchema => new
    {
        type = "object",
        properties = new
        {
            status = new { type = "string", description = "Optional status filter: Draft, Confirmed, Shipped, Cancelled" },
            customer_name = new { type = "string", description = "Optional customer/client name filter" },
            warehouse_name_or_id = new { type = "string", description = "Optional warehouse name or UUID filter" },
            limit = new { type = "integer", description = "Max results (1-20, default 10)" }
        }
    };

    public async Task<string> ExecuteAsync(JsonElement arguments, AssistantSecurityContext securityContext, CancellationToken ct = default)
    {
        string? statusInput = arguments.TryGetProperty("status", out var s) ? s.GetString() : null;
        string? customerInput = arguments.TryGetProperty("customer_name", out var cust) ? cust.GetString() : null;
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
                return $"[AUTHORIZATION DENIED]: You are not authorized to view sales orders for '{match.Name}'. Your authorized warehouses are: {(string.IsNullOrEmpty(allowedNames) ? "None assigned" : allowedNames)}.";
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
                return "[AUTHORIZATION NOTICE]: You have no active warehouse assignments to view sales orders.";
            }
        }

        var query = _context.SalesOrders
            .AsNoTracking()
            .Include(so => so.Customer)
            .Include(so => so.Warehouse)
            .Include(so => so.SalesOrderLines)
            .Where(so => targetWarehouseIds.Contains(so.WarehouseId))
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(statusInput))
        {
            query = query.Where(so => so.Status.ToLower() == statusInput.Trim().ToLower());
        }

        if (!string.IsNullOrWhiteSpace(customerInput))
        {
            var cLower = customerInput.Trim().ToLower();
            query = query.Where(so => so.Customer != null && so.Customer.Name.ToLower().Contains(cLower));
        }

        var orders = await query
            .OrderByDescending(so => so.CreatedAt)
            .Take(limit)
            .Select(so => new
            {
                so.Id,
                OrderNumber = so.SalesOrderNumber,
                Customer = so.Customer != null ? so.Customer.Name : "Unknown Client",
                Warehouse = so.Warehouse != null ? so.Warehouse.Name : "Unknown Warehouse",
                so.Status,
                TotalAmount = so.SalesOrderLines.Sum(l => l.QuantityOrdered * l.UnitPrice),
                ItemCount = so.SalesOrderLines.Count,
                Date = so.CreatedAt
            })
            .ToListAsync(ct);

        if (orders.Count == 0) return "No sales orders found matching the criteria.";

        return JsonSerializer.Serialize(new
        {
            TotalFound = orders.Count,
            SalesOrders = orders
        });
    }
}
