using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.Suppliers.Stock.DTOs;
using InventoryManagementSystem.Business.Suppliers.Stock.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace InventoryManagementSystem.API.Controllers;

[ApiController]
[Route("api/suppliers/{supplierId:guid}/stock")]
[Authorize]
public class SupplierStockController : ControllerBase
{
    private readonly ISupplierStockService _stockService;

    public SupplierStockController(ISupplierStockService stockService)
    {
        _stockService = stockService;
    }

    private string GetCurrentUserId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? "system";
    }

    [HttpPost("replenish")]
    [HttpPost("replenishments")]
    [ProducesResponseType(typeof(SupplierStockMovementResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierStockMovementResponse>> Replenish(
        Guid supplierId,
        [FromBody] RecordSupplierReplenishmentRequest request)
    {
        string userId = GetCurrentUserId();
        var (isSuccess, error, data) = await _stockService.RecordReplenishmentAsync(supplierId, request, userId);
        if (!isSuccess)
        {
            return BadRequest(new { message = error });
        }

        return Ok(data);
    }

    [HttpPost("adjust")]
    [HttpPost("adjustments")]
    [ProducesResponseType(typeof(SupplierStockMovementResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierStockMovementResponse>> Adjust(
        Guid supplierId,
        [FromBody] SupplierStockAdjustmentRequest request)
    {
        string userId = GetCurrentUserId();
        var (isSuccess, error, data) = await _stockService.RecordAdjustmentAsync(supplierId, request, userId);
        if (!isSuccess)
        {
            return BadRequest(new { message = error });
        }

        return Ok(data);
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyCollection<SupplierStockSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<SupplierStockSummaryResponse>>> GetStockSummaries(Guid supplierId)
    {
        var result = await _stockService.GetSupplierStockSummariesAsync(supplierId);
        return Ok(result);
    }

    [HttpGet("{productId:guid}")]
    [HttpGet("products/{productId:guid}")]
    [ProducesResponseType(typeof(SupplierStockSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierStockSummaryResponse>> GetProductStockSummary(Guid supplierId, Guid productId)
    {
        var result = await _stockService.GetProductStockSummaryAsync(supplierId, productId);
        if (result == null)
        {
            return NotFound(new { message = "Stock summary not found for this product and supplier." });
        }

        return Ok(result);
    }

    [HttpGet("history")]
    [HttpGet("movements")]
    [HttpGet("products/{productId:guid}/movements")]
    [ProducesResponseType(typeof(IReadOnlyCollection<SupplierStockMovementResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<SupplierStockMovementResponse>>> GetHistory(
        Guid supplierId,
        [FromQuery] Guid? productId = null)
    {
        var result = await _stockService.GetLedgerHistoryAsync(supplierId, productId);
        return Ok(result);
    }
}
