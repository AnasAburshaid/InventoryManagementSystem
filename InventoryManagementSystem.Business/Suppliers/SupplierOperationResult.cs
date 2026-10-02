namespace InventoryManagementSystem.Business.Suppliers;

public class SupplierOperationResult<T>
{
    public SupplierOperationStatus Status { get; init; }
    public T? Data { get; init; }
}