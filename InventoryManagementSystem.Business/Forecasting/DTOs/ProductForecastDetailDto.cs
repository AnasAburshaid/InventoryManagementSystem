namespace InventoryManagementSystem.Business.Forecasting.DTOs;

public class ProductDemandHistoryPointDto
{
    public DateTime Date { get; set; }
    public string PeriodLabel { get; set; } = string.Empty;
    public decimal ActualUnits { get; set; }
    public decimal? ForecastedUnits { get; set; }
}

public class ForecastBacktestDto
{
    public string TestPeriod { get; set; } = string.Empty;
    public int EvaluationPointsCount { get; set; }
    public decimal MeanAbsoluteError { get; set; }
    public decimal? WeightedAbsolutePercentageError { get; set; }
    public decimal? AccuracyPercentage { get; set; }
    public bool IsReliable { get; set; }
}

public class ProductForecastDetailDto
{
    public DemandForecastDto Forecast { get; set; } = new();
    public List<ProductDemandHistoryPointDto> HistoryTimeline { get; set; } = new();
    public List<ProductDemandHistoryPointDto> FutureProjectionTimeline { get; set; } = new();
    public ForecastBacktestDto? BacktestAccuracy { get; set; }
}
