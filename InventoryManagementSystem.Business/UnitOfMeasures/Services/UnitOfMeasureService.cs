using InventoryManagementSystem.Business.UnitOfMeasures.DTOs;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.UnitOfMeasures.Services;

public class UnitOfMeasureService : IUnitOfMeasureService
{
    private readonly InventoryDbContext _context;

    public UnitOfMeasureService(InventoryDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyCollection<UnitOfMeasureResponse>> GetAllAsync(bool activeOnly = true)
    {
        var query = _context.UnitOfMeasures.AsNoTracking();

        if (activeOnly)
        {
            query = query.Where(u => u.IsActive);
        }

        return await query
            .OrderBy(u => u.Name)
            .Select(u => new UnitOfMeasureResponse
            {
                Id = u.Id,
                Name = u.Name,
                Code = u.Code,
                Description = u.Description,
                IsActive = u.IsActive
            })
            .ToListAsync();
    }

    public async Task<UnitOfMeasureResponse?> GetByIdAsync(Guid id)
    {
        return await _context.UnitOfMeasures
            .AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => new UnitOfMeasureResponse
            {
                Id = u.Id,
                Name = u.Name,
                Code = u.Code,
                Description = u.Description,
                IsActive = u.IsActive
            })
            .FirstOrDefaultAsync();
    }
}
