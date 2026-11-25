using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.Forecasting.DTOs;
using InventoryManagementSystem.Business.Forecasting.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventoryManagementSystem.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ForecastingController : ControllerBase
{
    private readonly IForecastingService _forecastingService;

    public ForecastingController(IForecastingService forecastingService)
    {
        _forecastingService = forecastingService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<DemandForecastDto>>> GetForecasts(
        [FromQuery] DemandForecastQueryRequest request,
        CancellationToken ct)
    {
        if (!ForecastingEngine.SupportsHorizon(request.HorizonDays))
            return BadRequest(new { message = "Horizon must be 7, 30, or 90 days." });

        var result = await _forecastingService.GetForecastsAsync(request, User, ct);
        return Ok(result);
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ForecastSummaryDto>> GetSummary(
        [FromQuery] DemandForecastQueryRequest request,
        CancellationToken ct)
    {
        if (!ForecastingEngine.SupportsHorizon(request.HorizonDays))
            return BadRequest(new { message = "Horizon must be 7, 30, or 90 days." });

        var result = await _forecastingService.GetSummaryAsync(request, User, ct);
        return Ok(result);
    }

    [HttpGet("products/{productId:guid}")]
    public async Task<ActionResult<ProductForecastDetailDto>> GetProductForecastDetail(
        Guid productId,
        [FromQuery] Guid? warehouseId,
        [FromQuery] int horizonDays = 30,
        CancellationToken ct = default)
    {
        if (!ForecastingEngine.SupportsHorizon(horizonDays))
            return BadRequest(new { message = "Horizon must be 7, 30, or 90 days." });
        if (!warehouseId.HasValue)
            return BadRequest(new { message = "Select a warehouse to view product forecast details." });

        var result = await _forecastingService.GetProductForecastDetailAsync(productId, warehouseId, horizonDays, User, ct);
        if (result == null)
        {
            return NotFound(new { message = "Product or authorized warehouse forecast not found." });
        }
        return Ok(result);
    }

    [HttpPost("ai-insights")]
    public async Task<ActionResult<ForecastingAiInsightResponse>> GenerateAiInsights(
        [FromBody] ForecastingAiInsightRequest request,
        CancellationToken ct)
    {
        if (!ForecastingEngine.SupportsHorizon(request.HorizonDays))
            return BadRequest(new { message = "Horizon must be 7, 30, or 90 days." });

        var result = await _forecastingService.GenerateAiInsightsAsync(request, User, ct);
        return Ok(result);
    }
}
