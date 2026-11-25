namespace InventoryManagementSystem.Business.Forecasting.DTOs;

public class ForecastSummaryDto
{
    public int TotalProductsTracked { get; set; }
    public decimal TotalPredictedDemand { get; set; }
    public int CriticalRiskCount { get; set; }
    public int HighRiskCount { get; set; }
    public int ModerateRiskCount { get; set; }
    public int LowRiskCount { get; set; }
    public int InsufficientDataCount { get; set; }
    public decimal AverageConfidenceScore { get; set; }
    public string? TopDemandProduct { get; set; }
    public string? TopDemandSku { get; set; }
    public int HorizonDays { get; set; } = 30;
}