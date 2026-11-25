using InventoryManagementSystem.Business.Forecasting.Services;
using Xunit;

namespace InventoryManagementSystem.IntegrationTests;

public class ForecastingEngineTests
{
    private static readonly DateTime AsOf = new(2026, 11, 15, 0, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void SingleSaleDoesNotProduceAStockoutPrediction()
    {
        var result = ForecastingEngine.CalculateForecast([Sale(10, 90)], 2, 30, AsOf);

        Assert.Equal("InsufficientData", result.ForecastConfidence);
        Assert.Null(result.EstimatedStockoutDate);
        Assert.Empty(result.FutureProjection);
    }

    [Theory]
    [InlineData(7)]
    [InlineData(30)]
    [InlineData(90)]
    public void ProjectionCoversTheFullHorizonAndMatchesForecast(int horizon)
    {
        var sales = Enumerable.Range(5, 6).Select(month => Sale(month, 30)).ToList();
        var result = ForecastingEngine.CalculateForecast(sales, 5, horizon, AsOf);

        Assert.Equal(horizon, result.PredictedDemand);
        Assert.Equal(result.PredictedDemand, result.FutureProjection.Sum(p => p.ForecastedUnits));
        Assert.Equal(AsOf.AddDays(horizon), result.FutureProjection.Last().Date);
        Assert.Equal(AsOf.AddDays(5), result.EstimatedStockoutDate);
        Assert.Equal("Critical", result.StockoutRisk);
        Assert.Equal(0, result.Wape);
    }

    [Fact]
    public void HoltCarriesTheProjectedTrendAcrossTheFullHorizon()
    {
        var sales = Enumerable.Range(5, 6).Select(month => Sale(month, (month - 4) * 30)).ToList();
        var result = ForecastingEngine.CalculateForecast(sales, 450, 90, AsOf);

        Assert.Equal(new decimal?[] { 210, 240, 270 }, result.FutureProjection.Select(point => point.ForecastedUnits));
        Assert.Equal(720m, result.PredictedDemand);
        Assert.Equal(60, result.DaysUntilStockout);
    }

    [Fact]
    public void HistoryFillsGapsAndDoesNotTrainOnPartialOrFutureMonths()
    {
        var result = ForecastingEngine.CalculateForecast(
            [Sale(7, 30), Sale(9, 30), Sale(11, 900), Sale(12, 900)], 30, 30, AsOf);

        Assert.Equal(new decimal[] { 30, 0, 30, 0 }, result.MonthlyHistory.Select(p => p.ActualUnits));
        Assert.Equal(15, result.PredictedDemand);
    }

    private static HistoricalSalePoint Sale(int month, decimal quantity) =>
        new() { Date = new DateTime(2026, month, 5), Quantity = quantity };
}
