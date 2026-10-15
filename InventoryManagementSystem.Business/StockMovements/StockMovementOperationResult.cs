namespace InventoryManagementSystem.Business.StockMovements;

public class StockMovementOperationResult<T>
{
    public StockMovementOperationStatus Status { get; init; }
    public T? Data { get; init; }
}