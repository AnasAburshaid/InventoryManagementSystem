using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.SalesOrders;
using InventoryManagementSystem.Business.SalesOrders.DTOs;
using InventoryManagementSystem.Business.SalesOrders.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace InventoryManagementSystem.API.Controllers;

[ApiController]
[Authorize]
public class SalesOrderLinesController : ControllerBase
{
    private readonly ISalesOrderLineService _lineService;

    public SalesOrderLinesController(ISalesOrderLineService lineService)
    {
        _lineService = lineService;
    }

    [HttpGet("api/sales-orders/{salesOrderId:guid}/lines")]
    [HttpGet("api/sales-order-lines/by-order/{salesOrderId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyCollection<SalesOrderLineResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<SalesOrderLineResponse>>> GetLinesByOrderId(Guid salesOrderId)
    {
        var result = await _lineService.GetLinesByOrderIdAsync(salesOrderId);
        return Ok(result);
    }

    [HttpGet("api/sales-order-lines/{id:guid}")]
    [ProducesResponseType(typeof(SalesOrderLineResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SalesOrderLineResponse>> GetById(Guid id)
    {
        var result = await _lineService.GetByIdAsync(id);
        if (result is null)
        {
            return NotFound(new { message = "Sales order line was not found." });
        }

        return Ok(result);
    }

    [HttpPost("api/sales-orders/{salesOrderId:guid}/lines")]
    [HttpPost("api/sales-order-lines/by-order/{salesOrderId:guid}")]
    [ProducesResponseType(typeof(SalesOrderLineResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SalesOrderLineResponse>> AddLine(
        Guid salesOrderId,
        [FromBody] CreateSalesOrderLineRequest request)
    {
        var result = await _lineService.AddLineAsync(salesOrderId, request);

        switch (result.Status)
        {
            case SalesOrderOperationStatus.Success when result.Data is not null:
                return CreatedAtAction(nameof(GetById), new { id = result.Data.Id }, result.Data);

            case SalesOrderOperationStatus.NotFound:
            case SalesOrderOperationStatus.ProductNotFound:
                return NotFound(new { message = result.Message ?? "Resource not found." });

            case SalesOrderOperationStatus.OrderNotEditable:
            case SalesOrderOperationStatus.ProductInactive:
            case SalesOrderOperationStatus.DuplicateProductInLines:
            case SalesOrderOperationStatus.InvalidLineQuantity:
            case SalesOrderOperationStatus.InvalidLinePrice:
                return BadRequest(new { message = result.Message ?? "Validation failed." });

            default:
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }

    [HttpPut("api/sales-order-lines/{id:guid}")]
    [ProducesResponseType(typeof(SalesOrderLineResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SalesOrderLineResponse>> UpdateLine(
        Guid id,
        [FromBody] UpdateSalesOrderLineRequest request)
    {
        var result = await _lineService.UpdateLineAsync(id, request);

        switch (result.Status)
        {
            case SalesOrderOperationStatus.Success when result.Data is not null:
                return Ok(result.Data);

            case SalesOrderOperationStatus.NotFound:
                return NotFound(new { message = result.Message ?? "Sales order line was not found." });

            case SalesOrderOperationStatus.OrderNotEditable:
            case SalesOrderOperationStatus.InvalidLineQuantity:
            case SalesOrderOperationStatus.InvalidLinePrice:
                return BadRequest(new { message = result.Message ?? "Validation failed." });

            default:
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }

    [HttpDelete("api/sales-order-lines/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeleteLine(Guid id)
    {
        var result = await _lineService.DeleteLineAsync(id);

        switch (result.Status)
        {
            case SalesOrderOperationStatus.Success:
                return NoContent();

            case SalesOrderOperationStatus.NotFound:
                return NotFound(new { message = result.Message ?? "Sales order line was not found." });

            case SalesOrderOperationStatus.OrderNotEditable:
            case SalesOrderOperationStatus.EmptyLines:
                return BadRequest(new { message = result.Message ?? "Cannot delete sales order line." });

            default:
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }
}
