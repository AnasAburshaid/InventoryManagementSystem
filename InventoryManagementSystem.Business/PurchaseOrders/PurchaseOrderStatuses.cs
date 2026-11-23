using System;
using System.Collections.Generic;

namespace InventoryManagementSystem.Business.PurchaseOrders;

public static class PurchaseOrderStatuses
{
    public const string Draft = "Draft";
    public const string Ordered = "Ordered";
    public const string PartiallyReceived = "PartiallyReceived";
    public const string Received = "Received";
    public const string Cancelled = "Cancelled";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        Draft,
        Ordered,
        PartiallyReceived,
        Received,
        Cancelled
    };

    public static bool IsValid(string? status)
    {
        return !string.IsNullOrWhiteSpace(status) && All.Contains(status);
    }
}
