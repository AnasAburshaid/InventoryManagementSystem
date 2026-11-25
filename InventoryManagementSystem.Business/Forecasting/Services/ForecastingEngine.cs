using InventoryManagementSystem.Business.Forecasting.DTOs;

namespace InventoryManagementSystem.Business.Forecasting.Services;

public class HistoricalSalePoint
{
    public DateTime Date { get; set; }
    public decimal Quantity { get; set; }
}

public class ForecastCalculationResult
{
    public decimal AverageDailyDemand { get; set; }
    public decimal PredictedDemand { get; set; }
    public string DemandTrend { get; set; } = "NoData";
    public decimal TrendPercentage { get; set; }
    public DateTime? EstimatedStockoutDate { get; set; }
    public int? DaysUntilStockout { get; set; }
    public string StockoutRisk { get; set; } = "Unknown";
    public string ForecastConfidence { get; set; } = "InsufficientData";
    public decimal ConfidenceScore { get; set; }
    public string AlgorithmUsed { get; set; } = "None";
    public decimal RecommendedReplenishmentQty { get; set; }
    public decimal? Mae { get; set; }
    public decimal? Wape { get; set; }
    public List<ProductDemandHistoryPointDto> MonthlyHistory { get; set; } = [];
    public List<ProductDemandHistoryPointDto> FutureProjection { get; set; } = [];
    public ForecastBacktestDto? Backtest { get; set; }
}

public static class ForecastingEngine
{
    private const decimal StandardMonthDays = 30m;
    private const int MaxStockoutDays = 3650;

    public static bool SupportsHorizon(int days) => days is 7 or 30 or 90;

    public static ForecastCalculationResult CalculateForecast(
        List<HistoricalSalePoint> sales,
        decimal currentStock,
        int horizonDays,
        DateTime? asOfDate = null)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(horizonDays);
        var now = asOfDate ?? DateTime.UtcNow;
        var currentMonth = StartOfMonth(now);
        var oldestMonth = currentMonth.AddMonths(-12);
        var totals = sales.Where(s => s.Quantity > 0 && s.Date >= oldestMonth && s.Date < currentMonth)
            .GroupBy(s => StartOfMonth(s.Date))
            .ToDictionary(g => g.Key, g => g.Sum(s => s.Quantity));

        var result = new ForecastCalculationResult();
        if (totals.Count == 0)
            return result;

        for (var month = totals.Keys.Min(); month < currentMonth; month = month.AddMonths(1))
        {
            result.MonthlyHistory.Add(new ProductDemandHistoryPointDto
            {
                Date = month,
                PeriodLabel = month.ToString("yyyy-MM"),
                ActualUnits = totals.GetValueOrDefault(month)
            });
        }

        // Require demand in two completed months before publishing a rate.
        if (totals.Count < 2)
            return result;

        var monthly = result.MonthlyHistory.Select(point => point.ActualUnits).ToArray();
        var model = Predict(monthly);
        result.AlgorithmUsed = model.Algorithm;
        var horizonDemand = ProjectDemand(model.NextMonth, model.MonthlySlope, horizonDays);
        result.AverageDailyDemand = Math.Round(horizonDemand / horizonDays, 4);
        result.PredictedDemand = Math.Round(horizonDemand, 2);
        result.TrendPercentage = Math.Round(model.Trend * 100, 1);
        result.DemandTrend = model.Trend > 0.08m ? "Increasing" : model.Trend < -0.08m ? "Decreasing" : "Stable";
        result.ForecastConfidence = "Low";

        Backtest(result, monthly);

        var available = Math.Max(0m, currentStock);
        result.StockoutRisk = "NoDemand";
        if (ProjectDemand(model.NextMonth, model.MonthlySlope, 90) > 0)
        {
            var coverage = DaysOfCoverage(model.NextMonth, model.MonthlySlope, available);
            if (coverage < MaxStockoutDays)
            {
                result.DaysUntilStockout = coverage;
                result.EstimatedStockoutDate = now.AddDays(coverage);
            }

            result.StockoutRisk = coverage switch
            {
                <= 7 => "Critical",
                <= 30 => "High",
                <= 90 => "Moderate",
                > 180 => "Overstocked",
                _ => "Low"
            };
            result.RecommendedReplenishmentQty = Math.Max(0m, Math.Ceiling(horizonDemand * 1.15m - available));
        }

        var step = horizonDays switch { 7 => 1, 30 => 7, _ => 30 };
        var projected = 0m;
        for (var day = Math.Min(step, horizonDays); ; day = Math.Min(day + step, horizonDays))
        {
            var cumulative = Math.Round(ProjectDemand(model.NextMonth, model.MonthlySlope, day), 2);
            result.FutureProjection.Add(new ProductDemandHistoryPointDto
            {
                Date = now.AddDays(day),
                PeriodLabel = $"Day {day}",
                ForecastedUnits = cumulative - projected
            });

            if (day == horizonDays)
                break;

            projected = cumulative;
        }

        return result;
    }

    internal static DateTime StartOfMonth(DateTime date) =>
        new(date.Year, date.Month, 1, 0, 0, 0, date.Kind);

    private static (decimal NextMonth, decimal MonthlySlope, decimal Trend, string Algorithm) Predict(decimal[] monthly)
    {
        var activeMonths = monthly.Count(value => value > 0);
        if (activeMonths >= 5)
        {
            const decimal alpha = 0.35m;
            const decimal beta = 0.15m;
            var level = monthly[0];
            var trend = monthly[1] - monthly[0];
            foreach (var actual in monthly.Skip(1))
            {
                var previous = level;
                level = alpha * actual + (1m - alpha) * (level + trend);
                trend = beta * (level - previous) + (1m - beta) * trend;
            }

            return (level + trend, trend, level > 0 ? trend / level : 0m, "HoltLinearTrend");
        }

        var first = monthly.Take(monthly.Length / 2).Average();
        var last = monthly.Skip(monthly.Length / 2).Average();
        var change = first > 0 ? (last - first) / first : 0m;

        if (activeMonths < 3)
            return (monthly.Average(), 0m, change, "SimpleMovingAverage");

        var weighted = monthly.Select((value, index) => value * (index + 1)).Sum();
        var weights = monthly.Length * (monthly.Length + 1) / 2;
        return (weighted / weights, 0m, change, "WeightedMovingAverage");
    }

    private static decimal ProjectDemand(decimal nextMonth, decimal slope, int days)
    {
        var demand = 0m;
        for (var remaining = days; remaining > 0; remaining -= (int)StandardMonthDays)
        {
            demand += Math.Max(0m, nextMonth) * Math.Min(remaining, StandardMonthDays) / StandardMonthDays;
            nextMonth += slope;
        }

        return demand;
    }

    private static int DaysOfCoverage(decimal nextMonth, decimal slope, decimal available)
    {
        if (available == 0)
            return 0;

        var low = 0;
        var high = MaxStockoutDays;
        while (low < high)
        {
            var day = (low + high) / 2;
            if (ProjectDemand(nextMonth, slope, day) < available)
                low = day + 1;
            else
                high = day;
        }

        return ProjectDemand(nextMonth, slope, low) > available ? low - 1 : low;
    }

    private static void Backtest(ForecastCalculationResult result, decimal[] monthly)
    {
        var error = 0m;
        var actual = 0m;
        var periods = new List<string>();
        for (var i = Math.Max(3, monthly.Length - 3); i < monthly.Length; i++)
        {
            var training = monthly[..i];
            if (training.Count(value => value > 0) < 2)
                continue;

            error += Math.Abs(monthly[i] - Math.Max(0m, Predict(training).NextMonth));
            actual += monthly[i];
            periods.Add(result.MonthlyHistory[i].PeriodLabel);
        }

        if (periods.Count == 0)
            return;

        result.Mae = Math.Round(error / periods.Count, 2);
        result.Wape = actual > 0 ? Math.Round(error / actual * 100, 2) : null;
        result.ConfidenceScore = result.Wape is { } wape
            ? Math.Clamp(100m - wape, 0m, periods.Count < 3 ? 69m : 90m)
            : 0m;
        result.ForecastConfidence = result.ConfidenceScore >= 80 ? "High" :
            result.ConfidenceScore >= 60 ? "Medium" : "Low";
        result.Backtest = new ForecastBacktestDto
        {
            TestPeriod = periods.Count == 1 ? periods[0] : $"{periods[0]} to {periods[^1]}",
            EvaluationPointsCount = periods.Count,
            MeanAbsoluteError = result.Mae.Value,
            WeightedAbsolutePercentageError = result.Wape,
            AccuracyPercentage = result.Wape is { } percentage ? Math.Max(0m, 100m - percentage) : null,
            IsReliable = result.ForecastConfidence == "High"
        };
    }
}

