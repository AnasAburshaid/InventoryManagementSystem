namespace InventoryManagementSystem.Business.Products.Services;

public class SkuGenerator
{
    public string Generate()
    {
        string randomPart = Guid.NewGuid()
            .ToString("N")
            .Substring(0, 8)
            .ToUpperInvariant();

        return $"PRD-{randomPart}";
    }
}