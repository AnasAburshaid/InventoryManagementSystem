using InventoryManagementSystem.Business.Customers.DTOs;

namespace InventoryManagementSystem.Business.Customers.Services;

public interface ICustomerService
{
    Task<IReadOnlyCollection<CustomerResponse>> GetAllAsync();
    Task<CustomerResponse?> GetByIdAsync(Guid id);
    Task<CustomerOperationResult<CustomerResponse>> CreateAsync(CreateCustomerRequest request);
    Task<CustomerOperationResult<CustomerResponse>> UpdateAsync(Guid id, UpdateCustomerRequest request);
    Task<CustomerOperationResult<CustomerResponse>> ChangeStatusAsync(Guid id, ChangeCustomerStatusRequest request);
}