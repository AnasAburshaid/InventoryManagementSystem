using InventoryManagementSystem.Business.Brands;
using InventoryManagementSystem.Business.Brands.DTOs;
using InventoryManagementSystem.Business.Brands.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventoryManagementSystem.API.Controllers;

[ApiController]
[Route("api/brands")]
[Authorize]
public class BrandsController : ControllerBase
{
    private readonly BrandService _brandService;

    public BrandsController(BrandService brandService)
    {
        _brandService = brandService;
    }

    [HttpGet]
    [ProducesResponseType(
        typeof(IReadOnlyCollection<BrandResponse>),
        StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<BrandResponse>>> GetAll()
    {
        IReadOnlyCollection<BrandResponse> brands =
            await _brandService.GetAllAsync();

        return Ok(brands);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(
        typeof(BrandResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<BrandResponse>> GetById(Guid id)
    {
        BrandResponse? brand =
            await _brandService.GetByIdAsync(id);

        if (brand is null)
        {
            return NotFound(new
            {
                message = "Brand was not found."
            });
        }

        return Ok(brand);
    }

    [Authorize(Roles = "Admin,WarehouseManager")]
    [HttpPost]
    [ProducesResponseType(
        typeof(BrandResponse),
        StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<BrandResponse>> Create(
        [FromBody] CreateBrandRequest request)
    {
        BrandOperationResult<BrandResponse> result =
            await _brandService.CreateAsync(request);

        if (result.Status == BrandOperationStatus.DuplicateName)
        {
            return Conflict(new
            {
                message = "A brand with this name already exists."
            });
        }

        if (result.Status != BrandOperationStatus.Success ||
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

    [Authorize(Roles = "Admin,WarehouseManager")]
    [HttpPut("{id:guid}")]
    [ProducesResponseType(
        typeof(BrandResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<BrandResponse>> Update(
        Guid id,
        [FromBody] UpdateBrandRequest request)
    {
        BrandOperationResult<BrandResponse> result =
            await _brandService.UpdateAsync(id, request);

        if (result.Status == BrandOperationStatus.NotFound)
        {
            return NotFound(new
            {
                message = "Brand was not found."
            });
        }

        if (result.Status == BrandOperationStatus.DuplicateName)
        {
            return Conflict(new
            {
                message = "A brand with this name already exists."
            });
        }

        if (result.Status != BrandOperationStatus.Success ||
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

    [Authorize(Roles = "Admin,WarehouseManager")]
    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(
        typeof(BrandResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<BrandResponse>> ChangeStatus(
        Guid id,
        [FromBody] ChangeBrandStatusRequest request)
    {
        BrandOperationResult<BrandResponse> result =
            await _brandService.ChangeStatusAsync(id, request);

        if (result.Status == BrandOperationStatus.NotFound)
        {
            return NotFound(new
            {
                message = "Brand was not found."
            });
        }

        if (result.Status != BrandOperationStatus.Success ||
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