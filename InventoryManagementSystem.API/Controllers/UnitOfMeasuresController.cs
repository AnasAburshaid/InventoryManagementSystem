using InventoryManagementSystem.Business.UnitOfMeasures.DTOs;
using InventoryManagementSystem.Business.UnitOfMeasures.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventoryManagementSystem.API.Controllers;

[ApiController]
[Route("api/unit-of-measures")]
[Authorize]
public class UnitOfMeasuresController : ControllerBase
{
    private readonly IUnitOfMeasureService _unitOfMeasureService;

    public UnitOfMeasuresController(IUnitOfMeasureService unitOfMeasureService)
    {
        _unitOfMeasureService = unitOfMeasureService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyCollection<UnitOfMeasureResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<UnitOfMeasureResponse>>> GetAll([FromQuery] bool activeOnly = true)
    {
        var units = await _unitOfMeasureService.GetAllAsync(activeOnly);
        return Ok(units);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(UnitOfMeasureResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UnitOfMeasureResponse>> GetById(Guid id)
    {
        var unit = await _unitOfMeasureService.GetByIdAsync(id);
        if (unit is null)
        {
            return NotFound(new
            {
                message = "Unit of measure was not found."
            });
        }

        return Ok(unit);
    }
}
