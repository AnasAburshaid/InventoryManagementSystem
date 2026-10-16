using InventoryManagementSystem.Business.UnitOfMeasures.DTOs;

namespace InventoryManagementSystem.Business.UnitOfMeasures.Services;

public interface IUnitOfMeasureService
{
    Task<IReadOnlyCollection<UnitOfMeasureResponse>> GetAllAsync(bool activeOnly = true);
    Task<UnitOfMeasureResponse?> GetByIdAsync(Guid id);
}
