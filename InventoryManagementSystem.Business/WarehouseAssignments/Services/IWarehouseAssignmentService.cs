using InventoryManagementSystem.Business.DTOs.WarehouseAssignment;
using InventoryManagementSystem.Business.WarehouseAssignments.DTOs;

namespace InventoryManagementSystem.Business.WarehouseAssignments.Services;

public interface IWarehouseAssignmentService
{
    Task<IReadOnlyCollection<WarehouseAssignmentResponse>> GetAllAsync();
    Task<WarehouseAssignmentResponse?> GetByIdAsync(Guid id);
    Task<IReadOnlyCollection<WarehouseAssignmentResponse>> GetByUserIdAsync(string userId);
    Task<IReadOnlyCollection<WarehouseAssignmentResponse>> GetByWarehouseIdAsync(Guid warehouseId);

    Task<WarehouseAssignmentOperationResult<WarehouseAssignmentResponse>> CreateAsync(CreateWarehouseAssignmentRequest request);
    Task<WarehouseAssignmentOperationResult<WarehouseAssignmentResponse>> ChangeStatusAsync(Guid id, ChangeWarehouseAssignmentStatusRequest request);
    Task<WarehouseAssignmentOperationResult<WarehouseAssignmentResponse>> ChangeRoleAsync(Guid id, ChangeWarehouseAssignmentRoleRequest request);
}