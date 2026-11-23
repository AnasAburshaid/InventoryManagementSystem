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
[Route("api/sales-orders")]
[Authorize]
public class SalesOrdersController : ControllerBase
{
    private readonly ISalesOrderService _salesOrderService;

    public SalesOrdersController(ISalesOrderService salesOrderService)
    {
        _salesOrderService = salesOrderService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyCollection<SalesOrderResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<SalesOrderResponse>>> GetAll(
        [FromQuery] Guid? warehouseId = null,
        [FromQuery] Guid? customerId = null,
        [FromQuery] string? status = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var result = await _salesOrderService.GetAllAsync(warehouseId, customerId, status, fromDate, toDate);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(SalesOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SalesOrderResponse>> GetById(Guid id)
    {
        var result = await _salesOrderService.GetByIdAsync(id);
        if (result is null)
        {
            return NotFound(new { message = "Sales order was not found." });
        }

        return Ok(result);
    }

    [HttpGet("by-number/{salesOrderNumber}")]
    [ProducesResponseType(typeof(SalesOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SalesOrderResponse>> GetByNumber(string salesOrderNumber)
    {
        var result = await _salesOrderService.GetByNumberAsync(salesOrderNumber);
        if (result is null)
        {
            return NotFound(new { message = $"Sales order '{salesOrderNumber}' was not found." });
        }

        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(SalesOrderResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SalesOrderResponse>> Create([FromBody] CreateSalesOrderRequest request)
    {
        var result = await _salesOrderService.CreateAsync(request);

        switch (result.Status)
        {
            case SalesOrderOperationStatus.Success when result.Data is not null:
                return CreatedAtAction(nameof(GetById), new { id = result.Data.Id }, result.Data);

            case SalesOrderOperationStatus.CustomerNotFound:
            case SalesOrderOperationStatus.WarehouseNotFound:
            case SalesOrderOperationStatus.ProductNotFound:
                return NotFound(new { message = result.Message ?? "Referenced entity was not found." });

            case SalesOrderOperationStatus.CustomerInactive:
            case SalesOrderOperationStatus.WarehouseInactive:
            case SalesOrderOperationStatus.ProductInactive:
            case SalesOrderOperationStatus.EmptyLines:
            case SalesOrderOperationStatus.DuplicateProductInLines:
            case SalesOrderOperationStatus.InvalidLineQuantity:
            case SalesOrderOperationStatus.InvalidLinePrice:
                return BadRequest(new { message = result.Message ?? "Validation failed." });

            default:
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(SalesOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SalesOrderResponse>> Update(Guid id, [FromBody] UpdateSalesOrderRequest request)
    {
        var result = await _salesOrderService.UpdateAsync(id, request);

        switch (result.Status)
        {
            case SalesOrderOperationStatus.Success when result.Data is not null:
                return Ok(result.Data);

            case SalesOrderOperationStatus.NotFound:
            case SalesOrderOperationStatus.ProductNotFound:
                return NotFound(new { message = result.Message ?? "Resource not found." });

            case SalesOrderOperationStatus.OrderNotEditable:
            case SalesOrderOperationStatus.EmptyLines:
            case SalesOrderOperationStatus.DuplicateProductInLines:
            case SalesOrderOperationStatus.InvalidLineQuantity:
            case SalesOrderOperationStatus.InvalidLinePrice:
            case SalesOrderOperationStatus.ProductInactive:
                return BadRequest(new { message = result.Message ?? "Validation failed." });

            default:
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }

    [HttpPost("{id:guid}/confirm")]
    [ProducesResponseType(typeof(SalesOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SalesOrderResponse>> Confirm(Guid id)
    {
        var result = await _salesOrderService.ConfirmAsync(id);

        switch (result.Status)
        {
            case SalesOrderOperationStatus.Success when result.Data is not null:
                return Ok(result.Data);

            case SalesOrderOperationStatus.NotFound:
                return NotFound(new { message = result.Message ?? "Sales order was not found." });

            case SalesOrderOperationStatus.InvalidStatusTransition:
            case SalesOrderOperationStatus.EmptyLines:
                return BadRequest(new { message = result.Message ?? "Cannot confirm sales order." });

            default:
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }

    [HttpPost("{id:guid}/fulfill")]
    [ProducesResponseType(typeof(SalesOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SalesOrderResponse>> FulfillGoods(Guid id, [FromBody] FulfillSalesOrderRequest request)
    {
        var result = await _salesOrderService.FulfillGoodsAsync(id, request);

        switch (result.Status)
        {
            case SalesOrderOperationStatus.Success when result.Data is not null:
                return Ok(result.Data);

            case SalesOrderOperationStatus.NotFound:
                return NotFound(new { message = result.Message ?? "Resource not found." });

            case SalesOrderOperationStatus.CannotFulfillDraftOrder:
            case SalesOrderOperationStatus.OrderAlreadyFulfilled:
            case SalesOrderOperationStatus.OrderAlreadyCancelled:
            case SalesOrderOperationStatus.InvalidLineQuantity:
            case SalesOrderOperationStatus.OverFulfillmentNotAllowed:
            case SalesOrderOperationStatus.InsufficientStock:
            case SalesOrderOperationStatus.InvalidStatusTransition:
                return BadRequest(new { message = result.Message ?? "Fulfillment validation failed." });

            default:
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }

    [HttpPost("{id:guid}/cancel")]
    [ProducesResponseType(typeof(SalesOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SalesOrderResponse>> Cancel(Guid id, [FromQuery] string? reason = null)
    {
        var result = await _salesOrderService.CancelAsync(id, reason);

        switch (result.Status)
        {
            case SalesOrderOperationStatus.Success when result.Data is not null:
                return Ok(result.Data);

            case SalesOrderOperationStatus.NotFound:
                return NotFound(new { message = result.Message ?? "Sales order was not found." });

            case SalesOrderOperationStatus.OrderAlreadyCancelled:
            case SalesOrderOperationStatus.InvalidStatusTransition:
                return BadRequest(new { message = result.Message ?? "Cannot cancel sales order." });

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
        var result = await _salesOrderService.DeleteAsync(id);

        switch (result.Status)
        {
            case SalesOrderOperationStatus.Success:
                return NoContent();

            case SalesOrderOperationStatus.NotFound:
                return NotFound(new { message = result.Message ?? "Sales order was not found." });

            case SalesOrderOperationStatus.OrderNotEditable:
                return BadRequest(new { message = result.Message ?? "Cannot delete sales order." });

            default:
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }
}
