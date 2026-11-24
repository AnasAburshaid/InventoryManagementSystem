namespace InventoryManagementSystem.Business.Replenishment;

public class ReplenishmentOperationResult<T>
{
    public ReplenishmentOperationStatus Status { get; set; }
    public T? Data { get; set; }
    public string? ErrorMessage { get; set; }
}
