namespace InventoryManagementSystem.Business.Forecasting.DTOs;

public class DemandForecastDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public Guid CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public decimal OnHandStock { get; set; }
    public decimal CommittedStock { get; set; }
    public decimal CurrentStock { get; set; }
    public decimal HistoricalUnitsSold { get; set; }
    public int HistoricalSalesCount { get; set; }
    public decimal AverageDailyDemand { get; set; }
    public int HorizonDays { get; set; } = 30;
    public decimal PredictedDemand { get; set; }
    public string DemandTrend { get; set; } = "Stable"; // "Increasing", "Stable", "Decreasing", "NoData"
    public decimal TrendPercentage { get; set; }
    public DateTime? EstimatedStockoutDate { get; set; }
    public int? DaysUntilStockout { get; set; }
    public string StockoutRisk { get; set; } = "Low"; // "Critical", "High", "Moderate", "Low", "NoDemand", "Overstocked"
    public string ForecastConfidence { get; set; } = "Medium"; // "High", "Medium", "Low", "InsufficientData"
    public decimal ConfidenceScore { get; set; } // 0 to 100
    public string AlgorithmUsed { get; set; } = "SimpleMovingAverage";
    public decimal RecommendedReplenishmentQty { get; set; }
    public decimal? Mae { get; set; }
    public decimal? Wape { get; set; }
}
