namespace InventoryManagementSystem.Business.Assistant.Security;

public class AssistantSecurityContext
{
    public string UserId { get; set; } = string.Empty;
    public string? UserEmail { get; set; }
    public bool IsAdmin { get; set; }
    public IReadOnlySet<Guid> AssignedWarehouseIds { get; set; } = new HashSet<Guid>();
    public IReadOnlyDictionary<Guid, string> AssignedWarehouseNames { get; set; } = new Dictionary<Guid, string>();

    public bool HasAccessToWarehouse(Guid warehouseId)
    {
        return IsAdmin || AssignedWarehouseIds.Contains(warehouseId);
    }
}
