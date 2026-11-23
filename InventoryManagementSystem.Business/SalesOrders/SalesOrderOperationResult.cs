namespace InventoryManagementSystem.Business.SalesOrders;

public class SalesOrderOperationResult<T>
{
    public SalesOrderOperationStatus Status { get; set; }
    public T? Data { get; set; }
    public string? Message { get; set; }
}
