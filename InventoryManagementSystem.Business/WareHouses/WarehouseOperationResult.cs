namespace InventoryManagementSystem.Business.Warehouses;

public class WarehouseOperationResult<T>
{
    public WarehouseOperationStatus Status { get; init; }

    public T? Data { get; init; }
}