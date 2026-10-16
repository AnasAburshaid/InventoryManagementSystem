using InventoryManagementSystem.Business.StockMovements;
using InventoryManagementSystem.Business.StockMovements.DTOs;
using InventoryManagementSystem.Business.StockMovements.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace InventoryManagementSystem.API.Controllers;

[ApiController]
// The route MUST contain {warehouseId} so our custom Authorization Handler can intercept it
[Route("api/warehouses/{warehouseId:guid}/stock-movements")]
[Authorize]
public class StockMovementsController : ControllerBase
{
    private readonly IStockMovementService _stockMovementService;

    public StockMovementsController(IStockMovementService stockMovementService)
    {
        _stockMovementService = stockMovementService;
    }

    // Requires the user to be at least a Supervisor in THIS specific warehouse
    [Authorize(Policy = "RequireWarehouseSupervisor")]
    [HttpGet("products/{productId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyCollection<StockMovementResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<StockMovementResponse>>> GetHistory(
        Guid warehouseId,
        Guid productId)
    {
        IReadOnlyCollection<StockMovementResponse> history =
            await _stockMovementService.GetHistoryAsync(warehouseId, productId);

        return Ok(history);
    }

    // Requires the user to be at least a Supervisor in THIS specific warehouse
    [Authorize(Policy = "RequireWarehouseSupervisor")]
    [HttpPost]
    [ProducesResponseType(typeof(StockMovementResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<StockMovementResponse>> RecordMovement(
        Guid warehouseId,
        [FromBody] RecordMovementRequest request)
    {
        // CRITICAL SECURITY MEASURE:
        // A malicious user might pass an authorized Warehouse A in the URL, 
        // but try to manipulate Warehouse B in the JSON body. 
        // We forcibly override the DTO's WarehouseId with the validated URL parameter.
        request.WarehouseId = warehouseId;

        StockMovementOperationResult<StockMovementResponse> result =
            await _stockMovementService.RecordMovementAsync(request);

        if (result.Status == StockMovementOperationStatus.InvalidQuantity)
            return BadRequest(new { message = "Quantity must be greater than zero." });

        if (result.Status == StockMovementOperationStatus.ProductNotFoundOrInactive)
            return NotFound(new { message = "Product was not found or is inactive." });

        if (result.Status == StockMovementOperationStatus.WarehouseNotFoundOrInactive)
            return NotFound(new { message = "Warehouse was not found or is inactive." });

        if (result.Status == StockMovementOperationStatus.AdjustmentReasonRequired)
            return BadRequest(new { message = "An adjustment reason or explanatory note is required for this adjustment." });

        if (result.Status == StockMovementOperationStatus.AdjustmentReasonNotFound)
            return NotFound(new { message = "The specified adjustment reason was not found or is inactive." });

        if (result.Status == StockMovementOperationStatus.UnauthorizedActor)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "User identity could not be verified." });

        if (result.Status == StockMovementOperationStatus.InsufficientStock)
            return BadRequest(new { message = "Insufficient physical stock for this outgoing movement." });

        if (result.Status != StockMovementOperationStatus.Success || result.Data is null)
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });

      

        return StatusCode(StatusCodes.Status201Created, result.Data);
    }

    // Anyone with Employee access or higher can check stock levels
    [Authorize(Policy = "RequireWarehouseEmployee")]
    [HttpGet("products/{productId:guid}/current-stock")]
    [ProducesResponseType(typeof(decimal), StatusCodes.Status200OK)]
    public async Task<ActionResult<decimal>> GetCurrentStock(Guid warehouseId, Guid productId)
    {
        decimal currentStock = await _stockMovementService.GetCurrentStockAsync(warehouseId, productId);
        return Ok(currentStock);
    }


    [Authorize(Policy = "RequireWarehouseSupervisor")]
    [HttpPost("transfers")]
    [ProducesResponseType(typeof(List<StockMovementResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<StockMovementResponse>>> TransferStock(
        Guid warehouseId,
        [FromBody] TransferStockRequest request)
    {
        StockMovementOperationResult<List<StockMovementResponse>> result =
            await _stockMovementService.TransferStockAsync(warehouseId, request);

        if (result.Status == StockMovementOperationStatus.InvalidQuantity)
            return BadRequest(new { message = "Quantity must be greater than zero." });

        if (result.Status == StockMovementOperationStatus.SameSourceAndDestination)
            return BadRequest(new { message = "Source and destination warehouses cannot be the same." });

        if (result.Status == StockMovementOperationStatus.InsufficientStock)
            return BadRequest(new { message = "Insufficient physical stock in the source warehouse to complete this transfer." });

        if (result.Status == StockMovementOperationStatus.DestinationWarehouseNotFoundOrInactive)
            return NotFound(new { message = "Destination warehouse was not found or is inactive." });

        if (result.Status == StockMovementOperationStatus.UnauthorizedActor)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "User identity could not be verified." });

        if (result.Status != StockMovementOperationStatus.Success || result.Data is null)
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });

        return Ok(result.Data);
    }
}