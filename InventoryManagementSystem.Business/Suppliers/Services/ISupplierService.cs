using InventoryManagementSystem.Business.Suppliers.DTOs;

namespace InventoryManagementSystem.Business.Suppliers.Services;

public interface ISupplierService
{
    Task<IReadOnlyCollection<SupplierResponse>> GetAllAsync();
    Task<SupplierResponse?> GetByIdAsync(Guid id);
    Task<SupplierOperationResult<SupplierResponse>> CreateAsync(CreateSupplierRequest request);
    Task<SupplierOperationResult<SupplierResponse>> UpdateAsync(Guid id, UpdateSupplierRequest request);
    Task<SupplierOperationResult<SupplierResponse>> ChangeStatusAsync(Guid id, ChangeSupplierStatusRequest request);
}