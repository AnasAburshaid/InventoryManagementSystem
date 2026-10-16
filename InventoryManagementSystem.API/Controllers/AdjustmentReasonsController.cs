using InventoryManagementSystem.Business.StockMovements.DTOs;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.API.Controllers;

[ApiController]
[Route("api/adjustment-reasons")]
[Authorize]
public class AdjustmentReasonsController : ControllerBase
{
    private readonly InventoryDbContext _context;

    public AdjustmentReasonsController(InventoryDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyCollection<AdjustmentReasonResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<AdjustmentReasonResponse>>> GetAll([FromQuery] bool activeOnly = true)
    {
        var query = _context.AdjustmentReasons.AsNoTracking();

        if (activeOnly)
        {
            query = query.Where(r => r.IsActive);
        }

        var reasons = await query
            .OrderBy(r => r.Name)
            .Select(r => new AdjustmentReasonResponse
            {
                Id = r.Id,
                Name = r.Name,
                Description = r.Description,
                IsActive = r.IsActive
            })
            .ToListAsync();

        return Ok(reasons);
    }
}
