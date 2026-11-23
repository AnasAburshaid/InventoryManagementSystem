using System;

namespace InventoryManagementSystem.Business.PurchaseOrders.Services;

public class PurchaseOrderNumberGenerator
{
    public string Generate()
    {
        string datePart = DateTime.UtcNow.ToString("yyyyMMdd");
        string randomPart = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
        return $"PO-{datePart}-{randomPart}";
    }
}
