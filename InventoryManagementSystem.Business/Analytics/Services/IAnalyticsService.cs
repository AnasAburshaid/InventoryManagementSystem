using System;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.Analytics.DTOs;

namespace InventoryManagementSystem.Business.Analytics.Services;

public interface IAnalyticsService
{
    Task<PagedResult<WarehouseMovementHistoryItem>> GetWarehouseMovementHistoryAsync(WarehouseMovementHistoryFilter filter);
    Task<WarehouseActivitySummary> GetWarehouseActivitySummaryAsync(Guid warehouseId, string? datePreset, DateTime? fromDate, DateTime? toDate);
    Task<PagedResult<WarehouseInventoryItem>> GetWarehouseInventoryAsync(WarehouseInventoryFilter filter);
    Task<WarehouseAnalyticsResponse?> GetWarehouseAnalyticsAsync(Guid warehouseId, string? datePreset, DateTime? fromDate, DateTime? toDate);
    Task<SupplierAnalyticsResponse?> GetSupplierAnalyticsAsync(Guid supplierId);
}
