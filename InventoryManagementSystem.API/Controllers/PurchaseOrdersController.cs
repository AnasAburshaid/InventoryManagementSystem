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
[Route("api/purchase-orders")]
[Authorize]
public class PurchaseOrdersController : ControllerBase
{
    private readonly IPurchaseOrderService _purchaseOrderService;

    public PurchaseOrdersController(IPurchaseOrderService purchaseOrderService)
    {
        _purchaseOrderService = purchaseOrderService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyCollection<PurchaseOrderResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<PurchaseOrderResponse>>> GetAll(
        [FromQuery] Guid? warehouseId = null,
        [FromQuery] Guid? supplierId = null,
        [FromQuery] string? status = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var result = await _purchaseOrderService.GetAllAsync(warehouseId, supplierId, status, fromDate, toDate);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(PurchaseOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PurchaseOrderResponse>> GetById(Guid id)
    {
        var result = await _purchaseOrderService.GetByIdAsync(id);
        if (result is null)
        {
            return NotFound(new { message = "Purchase order was not found." });
        }

        return Ok(result);
    }

    [HttpGet("by-number/{purchaseOrderNumber}")]
    [ProducesResponseType(typeof(PurchaseOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PurchaseOrderResponse>> GetByNumber(string purchaseOrderNumber)
    {
        var result = await _purchaseOrderService.GetByNumberAsync(purchaseOrderNumber);
        if (result is null)
        {
            return NotFound(new { message = $"Purchase order '{purchaseOrderNumber}' was not found." });
        }

        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(PurchaseOrderResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<PurchaseOrderResponse>> Create([FromBody] CreatePurchaseOrderRequest request)
    {
        var result = await _purchaseOrderService.CreateAsync(request);

        switch (result.Status)
        {
            case PurchaseOrderOperationStatus.Success when result.Data is not null:
                return CreatedAtAction(nameof(GetById), new { id = result.Data.Id }, result.Data);

            case PurchaseOrderOperationStatus.SupplierNotFound:
            case PurchaseOrderOperationStatus.WarehouseNotFound:
            case PurchaseOrderOperationStatus.ProductNotFound:
                return NotFound(new { message = result.Message ?? "Referenced entity was not found." });

            case PurchaseOrderOperationStatus.SupplierInactive:
            case PurchaseOrderOperationStatus.WarehouseInactive:
            case PurchaseOrderOperationStatus.ProductInactive:
            case PurchaseOrderOperationStatus.ProductNotOfferedBySupplier:
            case PurchaseOrderOperationStatus.CategoryNotAllowedInWarehouse:
            case PurchaseOrderOperationStatus.InvalidDeliveryDate:
            case PurchaseOrderOperationStatus.EmptyLines:
            case PurchaseOrderOperationStatus.DuplicateProductInLines:
            case PurchaseOrderOperationStatus.InvalidLineQuantity:
            case PurchaseOrderOperationStatus.InvalidLineCost:
                return BadRequest(new { message = result.Message ?? "Validation failed." });

            default:
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(PurchaseOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<PurchaseOrderResponse>> Update(Guid id, [FromBody] UpdatePurchaseOrderRequest request)
    {
        var result = await _purchaseOrderService.UpdateAsync(id, request);

        switch (result.Status)
        {
            case PurchaseOrderOperationStatus.Success when result.Data is not null:
                return Ok(result.Data);

            case PurchaseOrderOperationStatus.NotFound:
            case PurchaseOrderOperationStatus.ProductNotFound:
                return NotFound(new { message = result.Message ?? "Resource not found." });

            case PurchaseOrderOperationStatus.OrderNotEditable:
            case PurchaseOrderOperationStatus.InvalidDeliveryDate:
            case PurchaseOrderOperationStatus.EmptyLines:
            case PurchaseOrderOperationStatus.DuplicateProductInLines:
            case PurchaseOrderOperationStatus.InvalidLineQuantity:
            case PurchaseOrderOperationStatus.InvalidLineCost:
            case PurchaseOrderOperationStatus.ProductInactive:
                return BadRequest(new { message = result.Message ?? "Validation failed." });

            default:
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }

    [HttpPost("{id:guid}/submit")]
    [ProducesResponseType(typeof(PurchaseOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<PurchaseOrderResponse>> Submit(Guid id)
    {
        var result = await _purchaseOrderService.SubmitAsync(id);

        switch (result.Status)
        {
            case PurchaseOrderOperationStatus.Success when result.Data is not null:
                return Ok(result.Data);

            case PurchaseOrderOperationStatus.NotFound:
                return NotFound(new { message = result.Message ?? "Purchase order was not found." });

            case PurchaseOrderOperationStatus.InvalidStatusTransition:
            case PurchaseOrderOperationStatus.EmptyLines:
            case PurchaseOrderOperationStatus.InsufficientSupplierStock:
            case PurchaseOrderOperationStatus.ProductNotOfferedBySupplier:
                return BadRequest(new { message = result.Message ?? "Cannot submit purchase order." });

            case PurchaseOrderOperationStatus.ConcurrencyConflict:
                return Conflict(new { message = result.Message ?? "A concurrency conflict occurred. Please retry." });

            default:
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }

    [HttpPost("{id:guid}/receive")]
    [ProducesResponseType(typeof(PurchaseOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<PurchaseOrderResponse>> ReceiveGoods(Guid id, [FromBody] ReceivePurchaseOrderRequest request)
    {
        var result = await _purchaseOrderService.ReceiveGoodsAsync(id, request);

        switch (result.Status)
        {
            case PurchaseOrderOperationStatus.Success when result.Data is not null:
                return Ok(result.Data);

            case PurchaseOrderOperationStatus.NotFound:
                return NotFound(new { message = result.Message ?? "Resource not found." });

            case PurchaseOrderOperationStatus.CannotReceiveDraftOrder:
            case PurchaseOrderOperationStatus.OrderAlreadyReceived:
            case PurchaseOrderOperationStatus.OrderAlreadyCancelled:
            case PurchaseOrderOperationStatus.InvalidLineQuantity:
            case PurchaseOrderOperationStatus.OverReceiptNotAllowed:
            case PurchaseOrderOperationStatus.InvalidStatusTransition:
                return BadRequest(new { message = result.Message ?? "Receipt validation failed." });

            default:
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }

    [HttpPost("{id:guid}/cancel")]
    [ProducesResponseType(typeof(PurchaseOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<PurchaseOrderResponse>> Cancel(Guid id, [FromQuery] string? reason = null)
    {
        var result = await _purchaseOrderService.CancelAsync(id, reason);

        switch (result.Status)
        {
            case PurchaseOrderOperationStatus.Success when result.Data is not null:
                return Ok(result.Data);

            case PurchaseOrderOperationStatus.NotFound:
                return NotFound(new { message = result.Message ?? "Purchase order was not found." });

            case PurchaseOrderOperationStatus.OrderAlreadyCancelled:
            case PurchaseOrderOperationStatus.InvalidStatusTransition:
                return BadRequest(new { message = result.Message ?? "Cannot cancel purchase order." });

            case PurchaseOrderOperationStatus.ConcurrencyConflict:
                return Conflict(new { message = result.Message ?? "A concurrency conflict occurred. Please retry." });

            default:
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _purchaseOrderService.DeleteAsync(id);

        switch (result.Status)
        {
            case PurchaseOrderOperationStatus.Success:
                return NoContent();

            case PurchaseOrderOperationStatus.NotFound:
                return NotFound(new { message = result.Message ?? "Purchase order was not found." });

            case PurchaseOrderOperationStatus.OrderNotEditable:
                return BadRequest(new { message = result.Message ?? "Cannot delete purchase order." });

            default:
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }
}
