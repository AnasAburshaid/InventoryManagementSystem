using System;
using System.Collections.Generic;

namespace InventoryManagementSystem.Business.Analytics.DTOs;

public class SupplierAnalyticsResponse
{
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = null!;
    public bool CanSupplyAllCategories { get; set; }
    public bool CanSupplyAllBrands { get; set; }

    public int TotalCatalogProductsCount { get; set; }
    public int PreferredProductsCount { get; set; }

    public decimal TotalOnHandStock { get; set; }
    public decimal TotalReservedStock { get; set; }
    public decimal TotalAvailableToPromise { get; set; }

    public decimal TotalUnitsSuppliedHistorically { get; set; }
    public decimal TotalPurchaseOrdersFulfilled { get; set; }
    public double AverageLeadTimeDays { get; set; }

    public IReadOnlyCollection<SupplierProductPerformanceDto> Products { get; set; } = new List<SupplierProductPerformanceDto>();
}

public class SupplierProductPerformanceDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = null!;
    public string ProductSku { get; set; } = null!;
    public string CategoryName { get; set; } = null!;
    public string? BrandName { get; set; }
    public decimal? LastPurchasePrice { get; set; }
    public int? LeadTimeDays { get; set; }
    public bool IsPreferred { get; set; }
    public decimal OnHand { get; set; }
    public decimal Reserved { get; set; }
    public decimal AvailableToPromise { get; set; }
    public decimal TotalSupplied { get; set; }
}
