namespace InventoryManagementSystem.Business.Warehouses.Services;

public class WarehouseCodeGenerator
{
    public string Generate()
    {
        string randomPart = Guid.NewGuid()
            .ToString("N")
            .Substring(0, 8)
            .ToUpperInvariant();

        return $"WH-{randomPart}";
    }
}