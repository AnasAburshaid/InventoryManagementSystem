using System.Security.Claims;
using InventoryManagementSystem.Business.Forecasting.DTOs;

namespace InventoryManagementSystem.Business.Forecasting.Services;

public interface IForecastingService
{
    Task<IReadOnlyCollection<DemandForecastDto>> GetForecastsAsync(
        DemandForecastQueryRequest request,
        ClaimsPrincipal user,
        CancellationToken ct = default);

    Task<ForecastSummaryDto> GetSummaryAsync(
        DemandForecastQueryRequest request,
        ClaimsPrincipal user,
        CancellationToken ct = default);

    Task<ProductForecastDetailDto?> GetProductForecastDetailAsync(
        Guid productId,
        Guid? warehouseId,
        int horizonDays,
        ClaimsPrincipal user,
        CancellationToken ct = default);

    Task<ForecastingAiInsightResponse> GenerateAiInsightsAsync(
        ForecastingAiInsightRequest request,
        ClaimsPrincipal user,
        CancellationToken ct = default);
}