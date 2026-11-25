using System.Security.Claims;
using System.Text.Json;
using InventoryManagementSystem.Business.Assistant.Security;
using InventoryManagementSystem.Business.Forecasting.DTOs;
using InventoryManagementSystem.Business.Forecasting.Services;

namespace InventoryManagementSystem.Business.Assistant.Tools;

public class GetDemandForecastsTool(IForecastingService forecasting) : IAssistantTool
{
    public string Name => "get_demand_forecasts";

    public string Description => "Read statistical forecasts, stockout risk, forecast confidence, and suggested replenishment for authorized product and warehouse pairs.";

    public object ParametersSchema => new
    {
        type = "object",
        properties = new
        {
            horizon_days = new { type = "integer", @enum = new[] { 7, 30, 90 }, description = "Defaults to 30." },
            warehouse_id = new { type = "string", description = "Optional warehouse GUID." },
            product_id = new { type = "string", description = "Optional product GUID." },
            product_query = new { type = "string", description = "Optional product name or SKU." },
            risk_level = new { type = "string", description = "Optional filter: Critical, High, Moderate, Low, Overstocked, NoDemand, or Unknown." },
            confidence = new { type = "string", description = "Optional filter: High, Medium, Low, or InsufficientData." },
            demand_trend = new { type = "string", description = "Optional filter: Increasing, Stable, or Decreasing." }
        }
    };

    public async Task<string> ExecuteAsync(JsonElement arguments, AssistantSecurityContext securityContext, CancellationToken ct = default)
    {
        if (arguments.ValueKind != JsonValueKind.Object)
            return Error("Forecast arguments must be a JSON object.");

        var request = new DemandForecastQueryRequest();
        if (arguments.TryGetProperty("horizon_days", out var horizon))
        {
            if (horizon.ValueKind != JsonValueKind.Number || !horizon.TryGetInt32(out var days) || !ForecastingEngine.SupportsHorizon(days))
                return Error("Horizon must be 7, 30, or 90 days.");

            request.HorizonDays = days;
        }

        if (arguments.TryGetProperty("warehouse_id", out var warehouse))
        {
            if (warehouse.ValueKind != JsonValueKind.String || !warehouse.TryGetGuid(out var warehouseId))
                return Error("warehouse_id must be a valid GUID.");

            if (!securityContext.HasAccessToWarehouse(warehouseId))
                return Error("Access denied for this warehouse.");

            request.WarehouseId = warehouseId;
        }

        if (arguments.TryGetProperty("product_id", out var product))
        {
            if (product.ValueKind != JsonValueKind.String || !product.TryGetGuid(out var productId))
                return Error("product_id must be a valid GUID.");

            request.ProductId = productId;
        }

        request.Search = ReadString(arguments, "product_query");
        request.RiskLevel = ReadString(arguments, "risk_level");
        request.Confidence = ReadString(arguments, "confidence");
        request.DemandTrend = ReadString(arguments, "demand_trend");

        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, securityContext.UserId) };
        if (securityContext.IsAdmin)
            claims.Add(new Claim(ClaimTypes.Role, "Admin"));

        var user = new ClaimsPrincipal(new ClaimsIdentity(claims, "Assistant"));
        var rows = await forecasting.GetForecastsAsync(request, user, ct);
        return JsonSerializer.Serialize(new
        {
            totalMatches = rows.Count,
            isTruncated = rows.Count > 12,
            horizonDays = request.HorizonDays,
            warehouseSummaries = rows.GroupBy(row => new { row.WarehouseId, row.WarehouseName })
                .OrderBy(group => group.Key.WarehouseName).Take(12).Select(group => new
            {
                group.Key.WarehouseId,
                group.Key.WarehouseName,
                MatchingPairs = group.Count(),
                ModeledPairs = group.Count(row => row.ForecastConfidence != "InsufficientData"),
                PredictedUnits = group.Sum(row => row.PredictedDemand),
                CriticalOrHighRiskPairs = group.Count(row => row.StockoutRisk is "Critical" or "High")
            }),
            forecasts = rows.Take(12).Select(row => new
            {
                row.ProductName,
                row.ProductSku,
                row.WarehouseName,
                row.CurrentStock,
                PredictedDemand = row.ForecastConfidence == "InsufficientData" ? (decimal?)null : row.PredictedDemand,
                row.DemandTrend,
                row.EstimatedStockoutDate,
                row.StockoutRisk,
                row.ForecastConfidence,
                row.RecommendedReplenishmentQty
            })
        }, new JsonSerializerOptions(JsonSerializerDefaults.Web));
    }

    private static string? ReadString(JsonElement arguments, string name) =>
        arguments.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;

    private static string Error(string message) => JsonSerializer.Serialize(new { error = message });
}

