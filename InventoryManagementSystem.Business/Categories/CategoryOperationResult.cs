namespace InventoryManagementSystem.Business.Categories;

public class CategoryOperationResult<T>
{
    public CategoryOperationStatus Status { get; init; }

    public T? Data { get; init; }
}