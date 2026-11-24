using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.PurchaseOrders.DTOs;
using InventoryManagementSystem.Business.Replenishment.DTOs;

namespace InventoryManagementSystem.Business.Replenishment.Services;

public interface IReplenishmentService
{
    Task<IReadOnlyCollection<WarehouseProductSettingResponse>> GetSettingsAsync(
        Guid warehouseId,
        CancellationToken cancellationToken = default);

    Task<ReplenishmentOperationResult<WarehouseProductSettingResponse>> UpsertSettingAsync(
        UpsertWarehouseProductSettingRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<ReplenishmentSuggestionResponse>> GetSuggestionsAsync(
        Guid warehouseId,
        bool onlyBelowReorderPoint = true,
        CancellationToken cancellationToken = default);

    Task<ReplenishmentOperationResult<PurchaseOrderResponse>> ConvertSuggestionToPoAsync(
        ConvertSuggestionToPoRequest request,
        CancellationToken cancellationToken = default);
}
