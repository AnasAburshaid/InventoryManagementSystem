using InventoryManagementSystem.Business.Warehouses;
using InventoryManagementSystem.Business.Warehouses.DTOs;
using InventoryManagementSystem.Business.Warehouses.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventoryManagementSystem.API.Controllers;

[ApiController]
[Route("api/warehouses")]
[Authorize]
public class WarehousesController : ControllerBase
{
    private readonly WarehouseService _warehouseService;

    public WarehousesController(WarehouseService warehouseService)
    {
        _warehouseService = warehouseService;
    }

    [HttpGet]
    [ProducesResponseType(
        typeof(IReadOnlyCollection<WarehouseResponse>),
        StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<WarehouseResponse>>> GetAll()
    {
        IReadOnlyCollection<WarehouseResponse> warehouses
            = await _warehouseService.GetAllAsync();
        return Ok(warehouses);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(
        typeof(WarehouseResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WarehouseResponse>> GetById(Guid id)
    {
        WarehouseResponse? warehouse =
            await _warehouseService.GetByIdAsync(id);

        if (warehouse is null)
        {
            return NotFound(new
            {
                message = "Warehouse was not found."
            });
        }

        return Ok(warehouse);
    }

    [Authorize(Roles = "Admin,WarehouseManager")]
    [HttpPost]
    [ProducesResponseType(
        typeof(WarehouseResponse),
        StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<WarehouseResponse>> Create(
        [FromBody] CreateWarehouseRequest request)
    {
        WarehouseOperationResult<WarehouseResponse> result =
            await _warehouseService.CreateAsync(request);

        if (result.Status == WarehouseOperationStatus.DuplicateWarehouse)
        {
            return Conflict(new
            {
                message ="A warehouse with the same name and address already exists."
            });
        }

        if (result.Status != WarehouseOperationStatus.Success ||
            result.Data is null)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { message = "An unexpected error occurred." });
        }

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.Data.Id },
            result.Data);
    }

    [Authorize(Roles = "Admin,WarehouseManager")]
    [HttpPut("{id:guid}")]
    [ProducesResponseType(
        typeof(WarehouseResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<WarehouseResponse>> Update(
        Guid id,
        [FromBody] UpdateWarehouseRequest request)
    {
        WarehouseOperationResult<WarehouseResponse> result =
            await _warehouseService.UpdateAsync(id, request);

        if (result.Status == WarehouseOperationStatus.NotFound)
        {
            return NotFound(new
            {
                message = "Warehouse was not found."
            });
        }

        if (result.Status == WarehouseOperationStatus.DuplicateWarehouse)
        {
            return Conflict(new
            {
                message = "A warehouse with the same name and address already exists."
            });
        }

        if (result.Status != WarehouseOperationStatus.Success ||
            result.Data is null)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { message = "An unexpected error occurred." });
        }

        return Ok(result.Data);
    }

    [Authorize(Roles = "Admin,WarehouseManager")]
    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(
        typeof(WarehouseResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<WarehouseResponse>> ChangeStatus(
        Guid id,
        [FromBody] ChangeWarehouseStatusRequest request)
    {
        WarehouseOperationResult<WarehouseResponse> result =
            await _warehouseService.ChangeStatusAsync(id, request);

        if (result.Status == WarehouseOperationStatus.NotFound)
        {
            return NotFound(new
            {
                message = "Warehouse was not found."
            });
        }

        if (result.Status != WarehouseOperationStatus.Success ||
            result.Data is null)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { message = "An unexpected error occurred." });
        }

        return Ok(result.Data);
    }
}