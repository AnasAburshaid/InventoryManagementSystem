using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.StockCounting;
using InventoryManagementSystem.Business.StockCounting.DTOs;
using InventoryManagementSystem.Business.StockCounting.Services;
using InventoryManagementSystem.DataAccess.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace InventoryManagementSystem.API.Controllers;

[ApiController]
[Route("api/warehouses/{warehouseId:guid}/stock-counts")]
[Authorize]
public class StockCountsController : ControllerBase
{
    private readonly IStockCountService _stockCountService;

    public StockCountsController(IStockCountService stockCountService)
    {
        _stockCountService = stockCountService;
    }

    [HttpGet]
    [Authorize(Policy = "RequireWarehouseEmployee")]
    [ProducesResponseType(typeof(IReadOnlyCollection<StockCountSessionResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<StockCountSessionResponse>>> GetSessions(
        Guid warehouseId,
        [FromQuery] StockCountStatus? status = null)
    {
        var sessions = await _stockCountService.GetWarehouseSessionsAsync(warehouseId, status);
        return Ok(sessions);
    }

    [HttpGet("{sessionId:guid}")]
    [Authorize(Policy = "RequireWarehouseEmployee")]
    [ProducesResponseType(typeof(StockCountSessionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StockCountSessionResponse>> GetSessionById(
        Guid warehouseId,
        Guid sessionId)
    {
        var result = await _stockCountService.GetSessionByIdAsync(sessionId);
        if (result.Status == StockCountOperationStatus.SessionNotFound || result.Data == null)
        {
            return NotFound(new { message = result.ErrorMessage ?? "Stock count session not found." });
        }

        if (result.Data.WarehouseId != warehouseId)
        {
            return NotFound(new { message = "Stock count session does not belong to the specified warehouse." });
        }

        return Ok(result.Data);
    }

    [HttpPost]
    [Authorize(Policy = "RequireWarehouseEmployee")]
    [ProducesResponseType(typeof(StockCountSessionResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<StockCountSessionResponse>> CreateSession(
        Guid warehouseId,
        [FromBody] CreateStockCountSessionRequest request)
    {
        // Enforce warehouse ID from route to prevent bypass
        request.WarehouseId = warehouseId;

        var result = await _stockCountService.CreateSessionAsync(request);
        if (result.Status != StockCountOperationStatus.Success || result.Data == null)
        {
            return BadRequest(new { message = result.ErrorMessage ?? "Failed to create stock count session." });
        }

        return CreatedAtAction(
            nameof(GetSessionById),
            new { warehouseId = warehouseId, sessionId = result.Data.Id },
            result.Data);
    }

    [HttpPost("{sessionId:guid}/counts")]
    [Authorize(Policy = "RequireWarehouseEmployee")]
    [ProducesResponseType(typeof(StockCountSessionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StockCountSessionResponse>> RecordCounts(
        Guid warehouseId,
        Guid sessionId,
        [FromBody] RecordStockCountItemsRequest request)
    {
        var sessionCheck = await _stockCountService.GetSessionByIdAsync(sessionId);
        if (sessionCheck.Status == StockCountOperationStatus.SessionNotFound || sessionCheck.Data == null || sessionCheck.Data.WarehouseId != warehouseId)
        {
            return NotFound(new { message = "Stock count session not found in this warehouse." });
        }

        var result = await _stockCountService.RecordCountsAsync(sessionId, request);
        if (result.Status != StockCountOperationStatus.Success || result.Data == null)
        {
            return BadRequest(new { message = result.ErrorMessage ?? "Failed to record counts." });
        }

        return Ok(result.Data);
    }

    [HttpPost("{sessionId:guid}/submit")]
    [Authorize(Policy = "RequireWarehouseEmployee")]
    [ProducesResponseType(typeof(StockCountSessionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StockCountSessionResponse>> SubmitForReview(
        Guid warehouseId,
        Guid sessionId)
    {
        var sessionCheck = await _stockCountService.GetSessionByIdAsync(sessionId);
        if (sessionCheck.Status == StockCountOperationStatus.SessionNotFound || sessionCheck.Data == null || sessionCheck.Data.WarehouseId != warehouseId)
        {
            return NotFound(new { message = "Stock count session not found in this warehouse." });
        }

        var result = await _stockCountService.SubmitForReviewAsync(sessionId);
        if (result.Status != StockCountOperationStatus.Success || result.Data == null)
        {
            return BadRequest(new { message = result.ErrorMessage ?? "Failed to submit session for review." });
        }

        return Ok(result.Data);
    }

    [HttpPost("{sessionId:guid}/review")]
    [Authorize(Policy = "RequireWarehouseSupervisor")]
    [ProducesResponseType(typeof(StockCountSessionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StockCountSessionResponse>> ReviewSession(
        Guid warehouseId,
        Guid sessionId,
        [FromBody] ReviewStockCountSessionRequest request)
    {
        var sessionCheck = await _stockCountService.GetSessionByIdAsync(sessionId);
        if (sessionCheck.Status == StockCountOperationStatus.SessionNotFound || sessionCheck.Data == null || sessionCheck.Data.WarehouseId != warehouseId)
        {
            return NotFound(new { message = "Stock count session not found in this warehouse." });
        }

        var result = await _stockCountService.ReviewSessionAsync(sessionId, request);
        if (result.Status != StockCountOperationStatus.Success || result.Data == null)
        {
            return BadRequest(new { message = result.ErrorMessage ?? "Failed to review session." });
        }

        return Ok(result.Data);
    }

    [HttpPost("{sessionId:guid}/cancel")]
    [Authorize(Policy = "RequireWarehouseSupervisor")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> CancelSession(
        Guid warehouseId,
        Guid sessionId,
        [FromQuery] string? reason = null)
    {
        var sessionCheck = await _stockCountService.GetSessionByIdAsync(sessionId);
        if (sessionCheck.Status == StockCountOperationStatus.SessionNotFound || sessionCheck.Data == null || sessionCheck.Data.WarehouseId != warehouseId)
        {
            return NotFound(new { message = "Stock count session not found in this warehouse." });
        }

        var result = await _stockCountService.CancelSessionAsync(sessionId, reason);
        if (result.Status != StockCountOperationStatus.Success)
        {
            return BadRequest(new { message = result.ErrorMessage ?? "Failed to cancel session." });
        }

        return Ok(new { message = "Session cancelled successfully." });
    }
}
