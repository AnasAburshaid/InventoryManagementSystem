using InventoryManagementSystem.Business.Products;
using InventoryManagementSystem.Business.Products.DTOs;
using InventoryManagementSystem.Business.Products.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventoryManagementSystem.API.Controllers;

[ApiController]
[Route("api/products")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly ProductService _productService;

    public ProductsController(ProductService productService)
    {
        _productService = productService;
    }

    [HttpGet]
    [ProducesResponseType(
        typeof(IReadOnlyCollection<ProductResponse>),
        StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<ProductResponse>>> GetAll()
    {
        IReadOnlyCollection<ProductResponse> products =
            await _productService.GetAllAsync();

        return Ok(products);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(
        typeof(ProductResponse),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductResponse>> GetById(Guid id)
    {
        ProductResponse? product =
            await _productService.GetByIdAsync(id);

        if (product is null)
        {
            return NotFound(new
            {
                message = "Product was not found."
            });
        }

        return Ok(product);
    }

    [Authorize(Roles = "Admin,WarehouseManager")]
    [HttpPost]
    [ProducesResponseType(
        typeof(ProductResponse),
        StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ProductResponse>> Create(
        [FromBody] CreateProductRequest request)
    {
        ProductOperationResult<ProductResponse> result =
            await _productService.CreateAsync(request);

        switch (result.Status)
        {
            case ProductOperationStatus.DuplicateSKU:
                return Conflict(new
                {
                    message = "A product with this SKU already exists."
                });

            case ProductOperationStatus.CategoryNotFound:
                return NotFound(new
                {
                    message = "Category was not found."
                });

            case ProductOperationStatus.CategoryInactive:
                return BadRequest(new
                {
                    message = "The selected category is inactive."
                });

            case ProductOperationStatus.BrandNotFound:
                return NotFound(new
                {
                    message = "Brand was not found."
                });

            case ProductOperationStatus.BrandInactive:
                return BadRequest(new
                {
                    message = "The selected brand is inactive."
                });

            case ProductOperationStatus.InvalidUnitOfMeasure:
                return BadRequest(new
                {
                    message =
                        "Invalid unit of measure. Allowed values are: Piece, Box, Kg, Liter, Pack."
                });
            case ProductOperationStatus.DuplicateProduct:
                return Conflict(new
                {
                    message = "A product with the same name, category, brand, and unit of measure already exists."
                });
        }

        if (result.Status != ProductOperationStatus.Success ||
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
    typeof(ProductResponse),
    StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ProductResponse>> Update(
    Guid id,
    [FromBody] UpdateProductRequest request)
    {
        ProductOperationResult<ProductResponse> result =
            await _productService.UpdateAsync(id, request);

        switch (result.Status)
        {
            case ProductOperationStatus.NotFound:
                return NotFound(new
                {
                    message = "Product was not found."
                });

            case ProductOperationStatus.DuplicateProduct:
                return Conflict(new
                {
                    message =
                        "A product with the same name, category, brand, and unit of measure already exists."
                });

            case ProductOperationStatus.CategoryNotFound:
                return NotFound(new
                {
                    message = "Category was not found."
                });

            case ProductOperationStatus.CategoryInactive:
                return BadRequest(new
                {
                    message = "The selected category is inactive."
                });

            case ProductOperationStatus.BrandNotFound:
                return NotFound(new
                {
                    message = "Brand was not found."
                });

            case ProductOperationStatus.BrandInactive:
                return BadRequest(new
                {
                    message = "The selected brand is inactive."
                });

            case ProductOperationStatus.InvalidUnitOfMeasure:
                return BadRequest(new
                {
                    message =
                        "Invalid unit of measure. Allowed values are: Piece, Box, Kg, Liter, Pack."
                });
        }

        if (result.Status != ProductOperationStatus.Success ||
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
    typeof(ProductResponse),
    StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ProductResponse>> ChangeStatus(
    Guid id,
    [FromBody] ChangeProductStatusRequest request)
    {
        ProductOperationResult<ProductResponse> result =
            await _productService.ChangeStatusAsync(id, request);

        if (result.Status == ProductOperationStatus.NotFound)
        {
            return NotFound(new
            {
                message = "Product was not found."
            });
        }

        if (result.Status != ProductOperationStatus.Success ||
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