using InventoryManagementSystem.Business.DTOs.WarehouseAssignment;
using InventoryManagementSystem.Business.WarehouseAssignments;
using InventoryManagementSystem.Business.WarehouseAssignments.DTOs;
using InventoryManagementSystem.Business.WarehouseAssignments.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace InventoryManagementSystem.API.Controllers;

[ApiController]
[Route("api/warehouse-assignments")]
[Authorize]
public class WarehouseAssignmentsController : ControllerBase
{
    private readonly IWarehouseAssignmentService _warehouseAssignmentService;

    public WarehouseAssignmentsController(IWarehouseAssignmentService warehouseAssignmentService)
    {
        _warehouseAssignmentService = warehouseAssignmentService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyCollection<WarehouseAssignmentResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<WarehouseAssignmentResponse>>> GetAll()
    {
        IReadOnlyCollection<WarehouseAssignmentResponse> assignments =
            await _warehouseAssignmentService.GetAllAsync();

        return Ok(assignments);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(WarehouseAssignmentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WarehouseAssignmentResponse>> GetById(Guid id)
    {
        WarehouseAssignmentResponse? assignment =
            await _warehouseAssignmentService.GetByIdAsync(id);

        if (assignment is null)
        {
            return NotFound(new
            {
                message = "Warehouse assignment was not found."
            });
        }

        return Ok(assignment);
    }

    [HttpGet("user/{userId}")]
    [ProducesResponseType(typeof(IReadOnlyCollection<WarehouseAssignmentResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<WarehouseAssignmentResponse>>> GetByUserId(string userId)
    {
        IReadOnlyCollection<WarehouseAssignmentResponse> assignments =
            await _warehouseAssignmentService.GetByUserIdAsync(userId);

        return Ok(assignments);
    }

    [HttpGet("warehouse/{warehouseId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyCollection<WarehouseAssignmentResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<WarehouseAssignmentResponse>>> GetByWarehouseId(Guid warehouseId)
    {
        IReadOnlyCollection<WarehouseAssignmentResponse> assignments =
            await _warehouseAssignmentService.GetByWarehouseIdAsync(warehouseId);

        return Ok(assignments);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    [ProducesResponseType(typeof(WarehouseAssignmentResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<WarehouseAssignmentResponse>> Create(
      [FromBody] CreateWarehouseAssignmentRequest request)
    {
        WarehouseAssignmentOperationResult<WarehouseAssignmentResponse> result =
            await _warehouseAssignmentService.CreateAsync(request);

        if (result.Status == WarehouseAssignmentOperationStatus.UserNotFound)
        {
            return NotFound(new
            {
                message = "User does not exist or is inactive."
            });
        }

        if (result.Status == WarehouseAssignmentOperationStatus.WarehouseNotFound)
        {
            return NotFound(new
            {
                message = "Warehouse does not exist or is inactive."
            });
        }

        if (result.Status == WarehouseAssignmentOperationStatus.DuplicateAssignment)
        {
            return Conflict(new
            {
                message = "This user is already assigned to this warehouse."
            });
        }

        if (result.Status != WarehouseAssignmentOperationStatus.Success ||
            result.Data is null)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    message = "An unexpected error occurred."
                });
        }

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.Data.Id },
            result.Data);
    }

    [Authorize(Roles = "Admin")]
    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(typeof(WarehouseAssignmentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<WarehouseAssignmentResponse>> ChangeStatus(
        Guid id,
        [FromBody] ChangeWarehouseAssignmentStatusRequest request)
    {
        WarehouseAssignmentOperationResult<WarehouseAssignmentResponse> result =
            await _warehouseAssignmentService.ChangeStatusAsync(id, request);

        if (result.Status == WarehouseAssignmentOperationStatus.NotFound)
        {
            return NotFound(new
            {
                message = "Warehouse assignment was not found."
            });
        }

        if (result.Status != WarehouseAssignmentOperationStatus.Success ||
            result.Data is null)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    message = "An unexpected error occurred."
                });
        }

        return Ok(result.Data);
    }
}