using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.PurchaseOrders.DTOs;
using InventoryManagementSystem.Business.Replenishment;
using InventoryManagementSystem.Business.Replenishment.DTOs;
using InventoryManagementSystem.Business.Replenishment.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace InventoryManagementSystem.API.Controllers;

[ApiController]
[Route("api/warehouses/{warehouseId:guid}/replenishment")]
[Authorize]
public class ReplenishmentController : ControllerBase
{
    private readonly IReplenishmentService _replenishmentService;

    public ReplenishmentController(IReplenishmentService replenishmentService)
    {
        _replenishmentService = replenishmentService;
    }

    [HttpGet("settings")]
    [Authorize(Policy = "RequireWarehouseEmployee")]
    [ProducesResponseType(typeof(IReadOnlyCollection<WarehouseProductSettingResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<WarehouseProductSettingResponse>>> GetSettings(Guid warehouseId)
    {
        var settings = await _replenishmentService.GetSettingsAsync(warehouseId);
        return Ok(settings);
    }

    [HttpPost("settings")]
    [Authorize(Policy = "RequireWarehouseSupervisor")]
    [ProducesResponseType(typeof(WarehouseProductSettingResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<WarehouseProductSettingResponse>> UpsertSetting(
        Guid warehouseId,
        [FromBody] UpsertWarehouseProductSettingRequest request)
    {
        // Enforce warehouse ID from route to prevent tampering
        request.WarehouseId = warehouseId;

        var result = await _replenishmentService.UpsertSettingAsync(request);
        if (result.Status != ReplenishmentOperationStatus.Success || result.Data == null)
        {
            return BadRequest(new { message = result.ErrorMessage ?? "Failed to update replenishment setting." });
        }

        return Ok(result.Data);
    }

    [HttpGet("suggestions")]
    [Authorize(Policy = "RequireWarehouseEmployee")]
    [ProducesResponseType(typeof(IReadOnlyCollection<ReplenishmentSuggestionResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<ReplenishmentSuggestionResponse>>> GetSuggestions(
        Guid warehouseId,
        [FromQuery] bool onlyBelowReorderPoint = true)
    {
        var suggestions = await _replenishmentService.GetSuggestionsAsync(warehouseId, onlyBelowReorderPoint);
        return Ok(suggestions);
    }

    [HttpPost("convert-to-po")]
    [Authorize(Policy = "RequireWarehouseSupervisor")]
    [ProducesResponseType(typeof(PurchaseOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PurchaseOrderResponse>> ConvertToPo(
        Guid warehouseId,
        [FromBody] ConvertSuggestionToPoRequest request)
    {
        // Enforce warehouse ID from route
        request.WarehouseId = warehouseId;

        var result = await _replenishmentService.ConvertSuggestionToPoAsync(request);
        if (result.Status != ReplenishmentOperationStatus.Success || result.Data == null)
        {
            return BadRequest(new { message = result.ErrorMessage ?? "Failed to convert suggestion to Purchase Order." });
        }

        return Ok(result.Data);
    }
}
