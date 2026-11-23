using System;
using System.Collections.Generic;

namespace InventoryManagementSystem.Business.SalesOrders;

public static class SalesOrderStatuses
{
    public const string Draft = "Draft";
    public const string Confirmed = "Confirmed";
    public const string PartiallyFulfilled = "PartiallyFulfilled";
    public const string Fulfilled = "Fulfilled";
    public const string Cancelled = "Cancelled";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        Draft,
        Confirmed,
        PartiallyFulfilled,
        Fulfilled,
        Cancelled
    };

    public static bool IsValid(string? status)
    {
        return !string.IsNullOrWhiteSpace(status) && All.Contains(status);
    }
}
