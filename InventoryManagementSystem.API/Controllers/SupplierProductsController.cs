using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.SupplierProducts;
using InventoryManagementSystem.Business.SupplierProducts.DTOs;
using InventoryManagementSystem.Business.SupplierProducts.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace InventoryManagementSystem.API.Controllers;

[ApiController]
[Route("api/supplier-products")]
[Authorize]
public class SupplierProductsController : ControllerBase
{
    private readonly ISupplierProductService _supplierProductService;

    public SupplierProductsController(ISupplierProductService supplierProductService)
    {
        _supplierProductService = supplierProductService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyCollection<SupplierProductResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<SupplierProductResponse>>> GetAll(
        [FromQuery] Guid? supplierId = null,
        [FromQuery] Guid? productId = null)
    {
        var result = await _supplierProductService.GetAllAsync(supplierId, productId);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(SupplierProductResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierProductResponse>> GetById(Guid id)
    {
        var result = await _supplierProductService.GetByIdAsync(id);
        if (result is null)
        {
            return NotFound(new { message = "Supplier product mapping was not found." });
        }

        return Ok(result);
    }

    [HttpGet("supplier/{supplierId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyCollection<SupplierProductResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<SupplierProductResponse>>> GetBySupplier(Guid supplierId)
    {
        var result = await _supplierProductService.GetBySupplierIdAsync(supplierId);
        return Ok(result);
    }

    [HttpGet("product/{productId:guid}/preferred")]
    [ProducesResponseType(typeof(SupplierProductResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierProductResponse>> GetPreferredByProduct(Guid productId)
    {
        var result = await _supplierProductService.GetPreferredByProductIdAsync(productId);
        if (result is null)
        {
            return NotFound(new { message = "No preferred supplier found for this product." });
        }

        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    [ProducesResponseType(typeof(SupplierProductResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SupplierProductResponse>> Create([FromBody] CreateSupplierProductRequest request)
    {
        var result = await _supplierProductService.CreateAsync(request);

        switch (result.Status)
        {
            case SupplierProductOperationStatus.Success when result.Data is not null:
                return CreatedAtAction(nameof(GetById), new { id = result.Data.Id }, result.Data);

            case SupplierProductOperationStatus.SupplierNotFound:
            case SupplierProductOperationStatus.ProductNotFound:
                return NotFound(new { message = result.Message ?? "Referenced entity was not found." });

            case SupplierProductOperationStatus.SupplierInactive:
            case SupplierProductOperationStatus.ProductInactive:
            case SupplierProductOperationStatus.InvalidPrice:
            case SupplierProductOperationStatus.InvalidLeadTimeDays:
            case SupplierProductOperationStatus.InvalidProductCode:
            case SupplierProductOperationStatus.IneligibleProductForSupplier:
                return BadRequest(new { message = result.Message ?? "Validation failed." });

            case SupplierProductOperationStatus.DuplicateSupplierProduct:
            case SupplierProductOperationStatus.DuplicateSupplierProductCode:
                return Conflict(new { message = result.Message ?? "Duplicate supplier product mapping." });

            default:
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(SupplierProductResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SupplierProductResponse>> Update(Guid id, [FromBody] UpdateSupplierProductRequest request)
    {
        var result = await _supplierProductService.UpdateAsync(id, request);

        switch (result.Status)
        {
            case SupplierProductOperationStatus.Success when result.Data is not null:
                return Ok(result.Data);

            case SupplierProductOperationStatus.NotFound:
                return NotFound(new { message = result.Message ?? "Supplier product mapping was not found." });

            case SupplierProductOperationStatus.InvalidPrice:
            case SupplierProductOperationStatus.InvalidLeadTimeDays:
            case SupplierProductOperationStatus.InvalidProductCode:
            case SupplierProductOperationStatus.IneligibleProductForSupplier:
                return BadRequest(new { message = result.Message ?? "Validation failed." });

            case SupplierProductOperationStatus.DuplicateSupplierProductCode:
                return Conflict(new { message = result.Message ?? "Supplier product code already exists for this supplier." });

            default:
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpPatch("{id:guid}/preferred")]
    [ProducesResponseType(typeof(SupplierProductResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SupplierProductResponse>> SetPreferred(Guid id)
    {
        var result = await _supplierProductService.SetPreferredAsync(id);

        switch (result.Status)
        {
            case SupplierProductOperationStatus.Success when result.Data is not null:
                return Ok(result.Data);

            case SupplierProductOperationStatus.NotFound:
                return NotFound(new { message = result.Message ?? "Supplier product mapping was not found." });

            case SupplierProductOperationStatus.SupplierInactive:
            case SupplierProductOperationStatus.ProductInactive:
            case SupplierProductOperationStatus.IneligibleProductForSupplier:
                return BadRequest(new { message = result.Message ?? "Product cannot be designated as preferred." });

            default:
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = result.Message ?? "An unexpected error occurred." });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _supplierProductService.DeleteAsync(id);

        if (result.Status == SupplierProductOperationStatus.NotFound)
        {
            return NotFound(new { message = result.Message ?? "Supplier product mapping was not found." });
        }

        if (result.Status != SupplierProductOperationStatus.Success)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }

        return NoContent();
    }
}
