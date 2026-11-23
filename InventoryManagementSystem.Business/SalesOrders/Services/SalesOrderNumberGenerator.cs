using System;

namespace InventoryManagementSystem.Business.SalesOrders.Services;

public class SalesOrderNumberGenerator
{
    public string Generate()
    {
        string datePart = DateTime.UtcNow.ToString("yyyyMMdd");
        string randomPart = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
        return $"SO-{datePart}-{randomPart}";
    }
}
