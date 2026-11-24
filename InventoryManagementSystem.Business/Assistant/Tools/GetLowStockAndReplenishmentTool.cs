using System.Text.Json;
using InventoryManagementSystem.Business.Assistant.Security;
using InventoryManagementSystem.Business.Replenishment.Services;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.Assistant.Tools;

public class GetLowStockAndReplenishmentTool : IAssistantTool
{
    private readonly InventoryDbContext _context;
    private readonly IReplenishmentService _replenishmentService;

    public GetLowStockAndReplenishmentTool(InventoryDbContext context, IReplenishmentService replenishmentService)
    {
        _context = context;
        _replenishmentService = replenishmentService;
    }

    public string Name => "get_low_stock_and_replenishment";

    public string Description => "Find products that have reached or fallen below their reorder points and view calculated replenishment suggestions for authorized warehouses.";

    public object ParametersSchema => new
    {
        type = "object",
        properties = new
        {
            warehouse_name_or_id = new { type = "string", description = "Optional warehouse name or UUID to check" }
        }
    };

    public async Task<string> ExecuteAsync(JsonElement arguments, AssistantSecurityContext securityContext, CancellationToken ct = default)
    {
        string? warehouseInput = arguments.TryGetProperty("warehouse_name_or_id", out var w) ? w.GetString() : null;

        var allWarehouses = await _context.Warehouses
            .AsNoTracking()
            .Where(wh => wh.IsActive)
            .ToListAsync(ct);

        List<Guid> targetWarehouseIds = new();

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
                return $"[AUTHORIZATION DENIED]: You do not have permission to inspect warehouse '{match.Name}'. Your authorized warehouses are: {(string.IsNullOrEmpty(allowedNames) ? "None assigned" : allowedNames)}.";
            }

            targetWarehouseIds.Add(match.Id);
        }
        else
        {
            targetWarehouseIds = securityContext.IsAdmin
                ? allWarehouses.Select(wh => wh.Id).ToList()
                : allWarehouses.Where(wh => securityContext.AssignedWarehouseIds.Contains(wh.Id)).Select(wh => wh.Id).ToList();

            if (targetWarehouseIds.Count == 0)
            {
                return "[AUTHORIZATION NOTICE]: You have no active warehouse assignments to inspect replenishment.";
            }
        }

        var allSuggestions = new List<object>();

        foreach (var warehouseId in targetWarehouseIds)
        {
            var wh = allWarehouses.FirstOrDefault(x => x.Id == warehouseId);
            var suggestions = await _replenishmentService.GetSuggestionsAsync(warehouseId, true, ct);
            if (suggestions != null)
            {
                foreach (var item in suggestions)
                {
                    allSuggestions.Add(new
                    {
                        Warehouse = wh?.Name ?? item.WarehouseName,
                        ProductName = item.ProductName,
                        SKU = item.ProductSku,
                        CurrentStock = item.CurrentStock,
                        OnOrderStock = item.OnOrderStock,
                        EffectiveStock = item.EffectiveStock,
                        ReorderPoint = item.ReorderPoint,
                        TargetStockLevel = item.TargetStockLevel,
                        SuggestedQuantity = item.SuggestedQuantity,
                        PreferredSupplier = item.PreferredSupplierName ?? "None",
                        IsCriticallyLow = item.IsCriticallyLow
                    });
                }
            }
        }

        if (allSuggestions.Count == 0)
        {
            return "No products are currently below their reorder points in the authorized warehouses.";
        }

        return JsonSerializer.Serialize(new
        {
            TotalLowStockItems = allSuggestions.Count,
            Suggestions = allSuggestions.Take(25).ToList()
        });
    }
}
