namespace InventoryManagementSystem.Business.Products
{
    public class ProductOperationResult<T>
    {
        public ProductOperationStatus Status { get; init; }
        public T? Data { get; init; }
    }
}
