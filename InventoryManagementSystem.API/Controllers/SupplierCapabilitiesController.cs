using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.Products.DTOs;
using InventoryManagementSystem.Business.Suppliers.Capabilities.DTOs;
using InventoryManagementSystem.Business.Suppliers.Capabilities.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace InventoryManagementSystem.API.Controllers;

[ApiController]
[Route("api/suppliers/{supplierId:guid}/capabilities")]
[Authorize]
public class SupplierCapabilitiesController : ControllerBase
{
    private readonly ISupplierCapabilityService _capabilityService;

    public SupplierCapabilitiesController(ISupplierCapabilityService capabilityService)
    {
        _capabilityService = capabilityService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(SupplierCapabilitiesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierCapabilitiesResponse>> GetCapabilities(Guid supplierId)
    {
        var result = await _capabilityService.GetCapabilitiesAsync(supplierId);
        if (result == null)
        {
            return NotFound(new { message = "Supplier was not found." });
        }

        return Ok(result);
    }

    [HttpPut("categories")]
    [ProducesResponseType(typeof(SupplierCapabilitiesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierCapabilitiesResponse>> SetCategories(
        Guid supplierId,
        [FromBody] SetSupplierCategoryCapabilitiesRequest request)
    {
        var (isSuccess, error, data) = await _capabilityService.SetCategoriesAsync(supplierId, request.CategoryIds);
        if (!isSuccess)
        {
            return BadRequest(new { message = error });
        }

        return Ok(data);
    }

    [HttpPut("brands")]
    [ProducesResponseType(typeof(SupplierCapabilitiesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierCapabilitiesResponse>> SetBrands(
        Guid supplierId,
        [FromBody] SetSupplierBrandCapabilitiesRequest request)
    {
        var (isSuccess, error, data) = await _capabilityService.SetBrandsAsync(supplierId, request.BrandIds);
        if (!isSuccess)
        {
            return BadRequest(new { message = error });
        }

        return Ok(data);
    }

    [HttpPut("flags")]
    [ProducesResponseType(typeof(SupplierCapabilitiesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierCapabilitiesResponse>> UpdateFlags(
        Guid supplierId,
        [FromBody] UpdateSupplierCapabilityFlagsRequest request)
    {
        var (isSuccess, error, data) = await _capabilityService.UpdateFlagsAsync(
            supplierId,
            request.CanSupplyAllCategories,
            request.CanSupplyAllBrands);

        if (!isSuccess)
        {
            return BadRequest(new { message = error });
        }

        return Ok(data);
    }

    [HttpGet("eligibility/{productId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> CheckEligibility(Guid supplierId, Guid productId)
    {
        var (isEligible, reason) = await _capabilityService.ValidateProductEligibilityAsync(supplierId, productId);
        return Ok(new { isEligible, reason });
    }

    [HttpGet("eligible-products")]
    [ProducesResponseType(typeof(IReadOnlyCollection<ProductResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<ProductResponse>>> GetEligibleProducts(Guid supplierId)
    {
        var products = await _capabilityService.GetEligibleProductsForSupplierAsync(supplierId);
        return Ok(products);
    }
}
