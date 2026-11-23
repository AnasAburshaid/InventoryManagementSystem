using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.PurchaseOrders;
using InventoryManagementSystem.Business.PurchaseOrders.DTOs;
using InventoryManagementSystem.Business.PurchaseOrders.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace InventoryManagementSystem.API.Controllers;

[ApiController]
[Authorize]
public class PurchaseOrderLinesController : ControllerBase
{
    private readonly IPurchaseOrderLineService _lineService;

    public PurchaseOrderLinesController(IPurchaseOrderLineService lineService)
    {
        _lineService = lineService;
    }

    [HttpGet("api/purchase-orders/{purchaseOrderId:guid}/lines")]
    [HttpGet("api/purchase-order-lines/by-order/{purchaseOrderId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyCollection<PurchaseOrderLineResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<PurchaseOrderLineResponse>>> GetLinesByOrderId(Guid purchaseOrderId)
    {
        var result = await _lineService.GetLinesByOrderIdAsync(purchaseOrderId);
        return Ok(result);
    }

    [HttpGet("api/purchase-order-lines/{id:guid}")]
    [ProducesResponseType(typeof(PurchaseOrderLineResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PurchaseOrderLineResponse>> GetById(Guid id)
    {
        var result = await _lineService.GetByIdAsync(id);
        if (result is null)
        {
            return NotFound(new { message = "Purchase order line was not found." });
        }

        return Ok(result);
    }

    [HttpPost("api/purchase-orders/{purchaseOrderId:guid}/lines")]
    [HttpPost("api/purchase-order-lines/by-order/{purchaseOrderId:guid}")]
    [ProducesResponseType(typeof(PurchaseOrderLineResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<PurchaseOrderLineResponse>> AddLine(
        Guid purchaseOrderId,
        [FromBody] CreatePurchaseOrderLineRequest request)
    {
        var result = await _lineService.AddLineAsync(purchaseOrderId, request);

        switch (result.Status)
        {
            case PurchaseOrderOperationStatus.Success when result.Data is not null:
                return CreatedAtAction(nameof(GetById), new { id = result.Data.Id }, result.Data);

            case PurchaseOrderOperationStatus.NotFound:
            case PurchaseOrderOperationStatus.ProductNotFound:
                return NotFound(new { message = result.Message ?? "Resource not found." });

            case PurchaseOrderOperationStatus.OrderNotEditable:
            case PurchaseOrderOperationStatus.ProductInactive:
            case PurchaseOrderOperationStatus.DuplicateProductInLines:
            case PurchaseOrderOperationStatus.InvalidLineQuantity:
            case PurchaseOrderOperationStatus.InvalidLineCost:
            case PurchaseOrderOperationStatus.ProductNotOfferedBySupplier:
            case PurchaseOrderOperationStatus.CategoryNotAllowedInWarehouse:
                return BadRequest(new { message = result.Message ?? "Validation failed." });

            default:
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }

    [HttpPut("api/purchase-order-lines/{id:guid}")]
    [ProducesResponseType(typeof(PurchaseOrderLineResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<PurchaseOrderLineResponse>> UpdateLine(
        Guid id,
        [FromBody] UpdatePurchaseOrderLineRequest request)
    {
        var result = await _lineService.UpdateLineAsync(id, request);

        switch (result.Status)
        {
            case PurchaseOrderOperationStatus.Success when result.Data is not null:
                return Ok(result.Data);

            case PurchaseOrderOperationStatus.NotFound:
                return NotFound(new { message = result.Message ?? "Purchase order line was not found." });

            case PurchaseOrderOperationStatus.OrderNotEditable:
            case PurchaseOrderOperationStatus.InvalidLineQuantity:
            case PurchaseOrderOperationStatus.InvalidLineCost:
                return BadRequest(new { message = result.Message ?? "Validation failed." });

            default:
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }

    [HttpDelete("api/purchase-order-lines/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeleteLine(Guid id)
    {
        var result = await _lineService.DeleteLineAsync(id);

        switch (result.Status)
        {
            case PurchaseOrderOperationStatus.Success:
                return NoContent();

            case PurchaseOrderOperationStatus.NotFound:
                return NotFound(new { message = result.Message ?? "Purchase order line was not found." });

            case PurchaseOrderOperationStatus.OrderNotEditable:
            case PurchaseOrderOperationStatus.EmptyLines:
                return BadRequest(new { message = result.Message ?? "Cannot delete purchase order line." });

            default:
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }
}
