namespace InventoryManagementSystem.Business.Forecasting.DTOs;

public class DemandForecastQueryRequest
{
    public Guid? WarehouseId { get; set; }
    public Guid? ProductId { get; set; }
    public Guid? CategoryId { get; set; }
    public int HorizonDays { get; set; } = 30; // 7, 30, 90
    public string? RiskLevel { get; set; } // "Critical", "High", "Moderate", "Low", "All"
    public string? Search { get; set; }
    public string? Confidence { get; set; }
    public string? DemandTrend { get; set; }
}

public class ForecastingAiInsightRequest : DemandForecastQueryRequest;

public class ForecastingAiInsightResponse
{
    public string Source { get; set; } = string.Empty;
    public string ExecutiveSummary { get; set; } = string.Empty;
    public List<string> CriticalStockoutRisks { get; set; } = new();
    public List<string> DemandSurgeAlerts { get; set; } = new();
    public List<string> PurchasingRecommendations { get; set; } = new();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}
