using InventoryManagementSystem.Business.Categories;
using InventoryManagementSystem.Business.Categories.DTOs;
using InventoryManagementSystem.Business.Categories.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventoryManagementSystem.API.Controllers;

[ApiController]
[Route("api/categories")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly CategoryService _categoryService;

    public CategoriesController(CategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyCollection<CategoryResponse>),StatusCodes.Status200OK)]

    public async Task<ActionResult<IReadOnlyCollection<CategoryResponse>>> GetAll()
    {
        IReadOnlyCollection<CategoryResponse> categories =
            await _categoryService.GetAllAsync();

        return Ok(categories);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(CategoryResponse),StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CategoryResponse>> GetById(
        Guid id)
    {
        CategoryResponse? category =
            await _categoryService.GetByIdAsync(id);

        if (category is null)
        {
            return NotFound(new
            {
                message = "Category was not found."
            });
        }

        return Ok(category);
    }

    [Authorize(Roles = "Admin,WarehouseManager")]
    [HttpPost]
    [ProducesResponseType(typeof(CategoryResponse),StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<CategoryResponse>> Create(
      [FromBody] CreateCategoryRequest request)
    {
        CategoryOperationResult<CategoryResponse> result =
            await _categoryService.CreateAsync(request);

        if (result.Status == CategoryOperationStatus.DuplicateName)
        {
            return Conflict(new
            {
                message = "A category with this name already exists."
            });
        }

        if (result.Status != CategoryOperationStatus.Success ||
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
    [ProducesResponseType( typeof(CategoryResponse),StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CategoryResponse>> Update(
    Guid id,
    [FromBody] UpdateCategoryRequest request)
    {
        CategoryOperationResult<CategoryResponse> result =
            await _categoryService.UpdateAsync(id, request);

        if (result.Status == CategoryOperationStatus.NotFound)
        {
            return NotFound(new
            {
                message = "Category was not found."
            });
        }

        if (result.Status == CategoryOperationStatus.DuplicateName)
        {
            return Conflict(new
            {
                message = "A category with this name already exists."
            });
        }

        if (result.Status != CategoryOperationStatus.Success ||
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
    typeof(CategoryResponse),
    StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CategoryResponse>> ChangeStatus(
    Guid id,
    [FromBody] ChangeCategoryStatusRequest request)
    {
        CategoryOperationResult<CategoryResponse> result =
            await _categoryService.ChangeStatusAsync(id, request);

        if (result.Status == CategoryOperationStatus.NotFound)
        {
            return NotFound(new
            {
                message = "Category was not found."
            });
        }

        if (result.Status != CategoryOperationStatus.Success ||
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