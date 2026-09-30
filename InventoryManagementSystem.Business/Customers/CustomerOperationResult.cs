namespace InventoryManagementSystem.Business.Customers;

public class CustomerOperationResult<T>
{
    public CustomerOperationStatus Status { get; init; }
    public T? Data { get; init; }
}