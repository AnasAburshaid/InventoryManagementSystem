namespace InventoryManagementSystem.Business.WarehouseAssignments;

public class WarehouseAssignmentOperationResult<T>
{
    public WarehouseAssignmentOperationStatus Status { get; init; }
    public T? Data { get; init; }
}