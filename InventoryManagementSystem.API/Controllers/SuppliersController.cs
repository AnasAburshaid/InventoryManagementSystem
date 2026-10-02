using InventoryManagementSystem.Business.Suppliers;
using InventoryManagementSystem.Business.Suppliers.DTOs;
using InventoryManagementSystem.Business.Suppliers.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace InventoryManagementSystem.API.Controllers;

[ApiController]
[Route("api/suppliers")]
[Authorize]
public class SuppliersController : ControllerBase
{
    private readonly ISupplierService _supplierService;

    public SuppliersController(ISupplierService supplierService)
    {
        _supplierService = supplierService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyCollection<SupplierResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<SupplierResponse>>> GetAll()
    {
        IReadOnlyCollection<SupplierResponse> suppliers = await _supplierService.GetAllAsync();
        return Ok(suppliers);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(SupplierResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierResponse>> GetById(Guid id)
    {
        SupplierResponse? supplier = await _supplierService.GetByIdAsync(id);

        if (supplier is null)
        {
            return NotFound(new { message = "Supplier was not found." });
        }

        return Ok(supplier);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    [ProducesResponseType(typeof(SupplierResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SupplierResponse>> Create([FromBody] CreateSupplierRequest request)
    {
        SupplierOperationResult<SupplierResponse> result = await _supplierService.CreateAsync(request);

        if (result.Status == SupplierOperationStatus.InvalidPhone)
            return BadRequest(new { message = "Phone number must be exactly 10 digits and start with '07'." });

        if (result.Status == SupplierOperationStatus.InvalidEmail)
            return BadRequest(new { message = "The provided email format is invalid." });

        if (result.Status == SupplierOperationStatus.DuplicateEmail)
            return Conflict(new { message = "A supplier with this email already exists." });

        if (result.Status != SupplierOperationStatus.Success || result.Data is null)
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });

        return CreatedAtAction(nameof(GetById), new { id = result.Data.Id }, result.Data);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(SupplierResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SupplierResponse>> Update(Guid id, [FromBody] UpdateSupplierRequest request)
    {
        SupplierOperationResult<SupplierResponse> result = await _supplierService.UpdateAsync(id, request);

        if (result.Status == SupplierOperationStatus.NotFound)
            return NotFound(new { message = "Supplier was not found." });

        if (result.Status == SupplierOperationStatus.InvalidPhone)
            return BadRequest(new { message = "Phone number must be exactly 10 digits and start with '07'." });

        if (result.Status == SupplierOperationStatus.InvalidEmail)
            return BadRequest(new { message = "The provided email format is invalid." });

        if (result.Status == SupplierOperationStatus.DuplicateEmail)
            return Conflict(new { message = "A supplier with this email already exists." });

        if (result.Status != SupplierOperationStatus.Success || result.Data is null)
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });

        return Ok(result.Data);
    }

    [Authorize(Roles = "Admin")]
    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(typeof(SupplierResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SupplierResponse>> ChangeStatus(Guid id, [FromBody] ChangeSupplierStatusRequest request)
    {
        SupplierOperationResult<SupplierResponse> result = await _supplierService.ChangeStatusAsync(id, request);

        if (result.Status == SupplierOperationStatus.NotFound)
            return NotFound(new { message = "Supplier was not found." });

        if (result.Status != SupplierOperationStatus.Success || result.Data is null)
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });

        return Ok(result.Data);
    }
}