namespace InventoryManagementSystem.Business.StockCounting;

public class StockCountOperationResult<T>
{
    public StockCountOperationStatus Status { get; set; }
    public T? Data { get; set; }
    public string? ErrorMessage { get; set; }
}
