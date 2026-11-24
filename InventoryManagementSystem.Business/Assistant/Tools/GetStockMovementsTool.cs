using System.Text.Json;
using InventoryManagementSystem.Business.Assistant.Security;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.Assistant.Tools;

public class GetStockMovementsTool : IAssistantTool
{
    private readonly InventoryDbContext _context;

    public GetStockMovementsTool(InventoryDbContext context)
    {
        _context = context;
    }

    public string Name => "get_stock_movements";

    public string Description => "Inspect the immutable stock movement audit ledger. Returns recent stock movements (Purchases, Sales, Adjustments, Transfers) for authorized warehouses.";

    public object ParametersSchema => new
    {
        type = "object",
        properties = new
        {
            warehouse_name_or_id = new { type = "string", description = "Optional warehouse name or UUID filter" },
            product_name_or_sku = new { type = "string", description = "Optional product name or SKU filter" },
            movement_type = new { type = "string", description = "Optional movement type: Purchase, Sale, AdjustmentIn, AdjustmentOut, TransferIn, TransferOut" },
            limit = new { type = "integer", description = "Maximum records to return (1-25, default 15)" }
        }
    };

    public async Task<string> ExecuteAsync(JsonElement arguments, AssistantSecurityContext securityContext, CancellationToken ct = default)
    {
        string? warehouseInput = arguments.TryGetProperty("warehouse_name_or_id", out var w) ? w.GetString() : null;
        string? productInput = arguments.TryGetProperty("product_name_or_sku", out var p) ? p.GetString() : null;
        string? typeInput = arguments.TryGetProperty("movement_type", out var t) ? t.GetString() : null;
        int limit = arguments.TryGetProperty("limit", out var l) && l.TryGetInt32(out var lim) ? Math.Clamp(lim, 1, 25) : 15;

        var allWarehouses = await _context.Warehouses.AsNoTracking().ToListAsync(ct);
        List<Guid> targetWarehouseIds;

        if (!string.IsNullOrWhiteSpace(warehouseInput))
        {
            var match = allWarehouses.FirstOrDefault(wh =>
                (Guid.TryParse(warehouseInput, out var wid) && wh.Id == wid) ||
                wh.Name.Contains(warehouseInput, StringComparison.OrdinalIgnoreCase) ||
                wh.Code.Equals(warehouseInput, StringComparison.OrdinalIgnoreCase));

            if (match == null)
            {
                return $"Warehouse '{warehouseInput}' was not found.";
            }

            if (!securityContext.HasAccessToWarehouse(match.Id))
            {
                var allowedNames = string.Join(", ", securityContext.AssignedWarehouseNames.Values);
                return $"[AUTHORIZATION DENIED]: You are not authorized to view stock movements for '{match.Name}'. Your authorized warehouses are: {(string.IsNullOrEmpty(allowedNames) ? "None assigned" : allowedNames)}.";
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
                return "[AUTHORIZATION NOTICE]: You have no active warehouse assignments to view stock movements.";
            }
        }

        var dbQuery = _context.StockMovements
            .AsNoTracking()
            .Include(m => m.Warehouse)
            .Include(m => m.Product)
            .Where(m => targetWarehouseIds.Contains(m.WarehouseId))
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(productInput))
        {
            var pLower = productInput.Trim().ToLower();
            dbQuery = dbQuery.Where(m => m.Product.Name.ToLower().Contains(pLower) || m.Product.Sku.ToLower().Contains(pLower));
        }

        if (!string.IsNullOrWhiteSpace(typeInput) && Enum.TryParse<StockMovementType>(typeInput, true, out var movementEnum))
        {
            dbQuery = dbQuery.Where(m => m.Type == movementEnum);
        }

        var records = await dbQuery
            .OrderByDescending(m => m.CreatedAt)
            .Take(limit)
            .Select(m => new
            {
                Timestamp = m.CreatedAt,
                Warehouse = m.Warehouse.Name,
                Product = m.Product.Name,
                SKU = m.Product.Sku,
                Type = m.Type.ToString(),
                Quantity = m.Quantity,
                Reference = m.ReferenceId,
                ReferenceType = m.ReferenceType
            })
            .ToListAsync(ct);

        if (records.Count == 0)
        {
            return "No stock movement ledger records found matching the criteria.";
        }

        return JsonSerializer.Serialize(new
        {
            TotalRecords = records.Count,
            Movements = records
        });
    }
}
