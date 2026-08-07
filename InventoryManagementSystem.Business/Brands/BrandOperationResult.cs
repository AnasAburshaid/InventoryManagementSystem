namespace InventoryManagementSystem.Business.Brands;

public class BrandOperationResult<T>
{
    public BrandOperationStatus Status { get; init; }

    public T? Data { get; init; }
} 