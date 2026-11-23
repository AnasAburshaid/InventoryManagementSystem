namespace InventoryManagementSystem.Business.SupplierProducts;

public class SupplierProductOperationResult<T>
{
    public SupplierProductOperationStatus Status { get; init; }
    public T? Data { get; init; }
    public string? Message { get; init; }
}
