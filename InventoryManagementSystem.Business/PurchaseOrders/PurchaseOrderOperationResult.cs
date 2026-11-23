namespace InventoryManagementSystem.Business.PurchaseOrders;

public class PurchaseOrderOperationResult<T>
{
    public PurchaseOrderOperationStatus Status { get; init; }
    public T? Data { get; init; }
    public string? Message { get; init; }
}
