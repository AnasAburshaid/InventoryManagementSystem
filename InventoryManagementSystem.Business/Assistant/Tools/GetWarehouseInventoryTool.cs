using System.Text.Json;
using InventoryManagementSystem.Business.Assistant.Security;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.Assistant.Tools;

public class GetWarehouseInventoryTool : IAssistantTool
{
    private readonly InventoryDbContext _context;

    public GetWarehouseInventoryTool(InventoryDbContext context)
    {
        _context = context;
    }

    public string Name => "get_warehouse_inventory";

    public string Description => "Get current on-hand stock and inventory valuations for warehouses and products. Supports querying a specific warehouse, product, or finding which warehouse holds the highest stock/valuation.";

    public object ParametersSchema => new
    {
        type = "object",
        properties = new
        {
            warehouse_name_or_id = new { type = "string", description = "Optional warehouse name or UUID to check" },
            product_name_or_sku = new { type = "string", description = "Optional product name or SKU to check" }
        }
    };

    public async Task<string> ExecuteAsync(JsonElement arguments, AssistantSecurityContext securityContext, CancellationToken ct = default)
    {
        string? warehouseInput = arguments.TryGetProperty("warehouse_name_or_id", out var w) ? w.GetString() : null;
        string? productInput = arguments.TryGetProperty("product_name_or_sku", out var p) ? p.GetString() : null;

        // Resolve warehouses
        var allWarehouses = await _context.Warehouses
            .AsNoTracking()
            .Where(w => w.IsActive)
            .ToListAsync(ct);

        List<Guid> targetWarehouseIds;

        if (!string.IsNullOrWhiteSpace(warehouseInput))
        {
            var match = allWarehouses.FirstOrDefault(wh =>
                (Guid.TryParse(warehouseInput, out var wid) && wh.Id == wid) ||
                wh.Name.Contains(warehouseInput, StringComparison.OrdinalIgnoreCase) ||
                wh.Code.Equals(warehouseInput, StringComparison.OrdinalIgnoreCase));

            if (match == null)
            {
                return $"Warehouse '{warehouseInput}' was not found in the system.";
            }

            // Security authorization check
            if (!securityContext.HasAccessToWarehouse(match.Id))
            {
                var allowedNames = string.Join(", ", securityContext.AssignedWarehouseNames.Values);
                return $"[AUTHORIZATION DENIED]: You are not authorized to access warehouse '{match.Name}'. Your authorized warehouses are: {(string.IsNullOrEmpty(allowedNames) ? "None assigned" : allowedNames)}.";
            }

            targetWarehouseIds = new List<Guid> { match.Id };
        }
        else
        {
            // If user did not specify warehouse, filter by user's authorized scope
            if (securityContext.IsAdmin)
            {
                targetWarehouseIds = allWarehouses.Select(wh => wh.Id).ToList();
            }
            else
            {
                targetWarehouseIds = allWarehouses
                    .Where(wh => securityContext.AssignedWarehouseIds.Contains(wh.Id))
                    .Select(wh => wh.Id)
                    .ToList();

                if (targetWarehouseIds.Count == 0)
                {
                    return "[AUTHORIZATION NOTICE]: You have no active warehouse assignments, so no warehouse stock can be viewed.";
                }
            }
        }

        // Resolve product filter if provided
        Guid? targetProductId = null;
        string? targetProductName = null;
        if (!string.IsNullOrWhiteSpace(productInput))
        {
            var pLower = productInput.Trim().ToLower();
            var prod = await _context.Products
                .AsNoTracking()
                .FirstOrDefaultAsync(pr => pr.Name.ToLower().Contains(pLower) || pr.Sku.ToLower().Contains(pLower), ct);

            if (prod != null)
            {
                targetProductId = prod.Id;
                targetProductName = prod.Name;
            }
            else
            {
                return $"Product '{productInput}' was not found.";
            }
        }

        // Calculate ledger-based stock
        var movementQuery = _context.StockMovements
            .AsNoTracking()
            .Where(m => targetWarehouseIds.Contains(m.WarehouseId));

        if (targetProductId.HasValue)
        {
            movementQuery = movementQuery.Where(m => m.ProductId == targetProductId.Value);
        }

        var stockGrouping = await movementQuery
            .GroupBy(m => new { m.WarehouseId, m.ProductId })
            .Select(g => new
            {
                g.Key.WarehouseId,
                g.Key.ProductId,
                CurrentStock = g.Sum(m =>
                    (m.Type == StockMovementType.Purchase || m.Type == StockMovementType.AdjustmentIn || m.Type == StockMovementType.TransferIn)
                        ? m.Quantity
                        : -m.Quantity)
            })
            .Where(s => s.CurrentStock > 0)
            .ToListAsync(ct);

        if (stockGrouping.Count == 0)
        {
            return targetProductId.HasValue
                ? $"Product '{targetProductName}' has 0 stock across the requested authorized warehouses."
                : "No positive inventory found in the specified authorized warehouses.";
        }

        var productIds = stockGrouping.Select(s => s.ProductId).Distinct().ToList();
        var productsDict = await _context.Products
            .AsNoTracking()
            .Include(p => p.UnitOfMeasure)
            .Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, ct);

        var warehousesDict = allWarehouses.ToDictionary(wh => wh.Id);

        var inventoryRows = stockGrouping
            .OrderByDescending(s => s.CurrentStock)
            .Take(25)
            .Select(s =>
            {
                var prod = productsDict.GetValueOrDefault(s.ProductId);
                var wh = warehousesDict.GetValueOrDefault(s.WarehouseId);
                var unitPrice = prod?.SellingPrice ?? 0;
                var totalValuation = s.CurrentStock * unitPrice;

                return new
                {
                    WarehouseName = wh?.Name ?? "Unknown",
                    WarehouseCode = wh?.Code ?? "-",
                    ProductName = prod?.Name ?? "Unknown",
                    SKU = prod?.Sku ?? "-",
                    Stock = s.CurrentStock,
                    Unit = prod?.UnitOfMeasure?.Name ?? "Units",
                    UnitPrice = unitPrice,
                    EstimatedValuation = totalValuation
                };
            })
            .ToList();

        decimal totalValueAcrossResults = inventoryRows.Sum(r => r.EstimatedValuation);

        return JsonSerializer.Serialize(new
        {
            AuthorizedWarehousesIncluded = targetWarehouseIds.Select(id => warehousesDict.GetValueOrDefault(id)?.Name).Where(n => n != null).ToList(),
            TotalStockEntries = inventoryRows.Count,
            TotalEstimatedValuation = totalValueAcrossResults,
            Inventory = inventoryRows
        });
    }
}
