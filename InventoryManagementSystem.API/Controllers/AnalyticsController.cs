using System;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.Analytics.DTOs;
using InventoryManagementSystem.Business.Analytics.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace InventoryManagementSystem.API.Controllers;

[ApiController]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _analyticsService;

    public AnalyticsController(IAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    /// <summary>
    /// Paginated, filterable movement history for a warehouse with server-side date presets.
    /// </summary>
    [HttpGet("api/warehouses/{warehouseId:guid}/movement-history")]
    [ProducesResponseType(typeof(PagedResult<WarehouseMovementHistoryItem>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<WarehouseMovementHistoryItem>>> GetWarehouseMovementHistory(
        Guid warehouseId,
        [FromQuery] WarehouseMovementHistoryFilter filter)
    {
        filter.WarehouseId = warehouseId;
        var result = await _analyticsService.GetWarehouseMovementHistoryAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Aggregate physical stock movements, net change vs gross volume for a selected period.
    /// </summary>
    [HttpGet("api/warehouses/{warehouseId:guid}/activity-summary")]
    [ProducesResponseType(typeof(WarehouseActivitySummary), StatusCodes.Status200OK)]
    public async Task<ActionResult<WarehouseActivitySummary>> GetWarehouseActivitySummary(
        Guid warehouseId,
        [FromQuery] string? datePreset,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var result = await _analyticsService.GetWarehouseActivitySummaryAsync(warehouseId, datePreset, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Current physical inventory for a warehouse with server-side pagination, stock alerts, and dormancy flags.
    /// </summary>
    [HttpGet("api/warehouses/{warehouseId:guid}/inventory")]
    [ProducesResponseType(typeof(PagedResult<WarehouseInventoryItem>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<WarehouseInventoryItem>>> GetWarehouseInventory(
        Guid warehouseId,
        [FromQuery] WarehouseInventoryFilter filter)
    {
        filter.WarehouseId = warehouseId;
        var result = await _analyticsService.GetWarehouseInventoryAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Complete warehouse analytics: activity throughput, top moving products, dormant inventory, low-stock alerts.
    /// </summary>
    [HttpGet("api/warehouses/{warehouseId:guid}/analytics")]
    [ProducesResponseType(typeof(WarehouseAnalyticsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WarehouseAnalyticsResponse>> GetWarehouseAnalytics(
        Guid warehouseId,
        [FromQuery] string? datePreset,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var result = await _analyticsService.GetWarehouseAnalyticsAsync(warehouseId, datePreset, fromDate, toDate);
        if (result == null)
            return NotFound(new { message = "Warehouse was not found." });

        return Ok(result);
    }

    /// <summary>
    /// Comprehensive supplier performance analytics: catalog breadth, preferred status, stock availability, historical fulfillment.
    /// </summary>
    [HttpGet("api/suppliers/{supplierId:guid}/analytics")]
    [ProducesResponseType(typeof(SupplierAnalyticsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierAnalyticsResponse>> GetSupplierAnalytics(Guid supplierId)
    {
        var result = await _analyticsService.GetSupplierAnalyticsAsync(supplierId);
        if (result == null)
            return NotFound(new { message = "Supplier was not found." });

        return Ok(result);
    }
}
