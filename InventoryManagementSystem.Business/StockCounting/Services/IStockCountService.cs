using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.StockCounting.DTOs;
using InventoryManagementSystem.DataAccess.Enums;

namespace InventoryManagementSystem.Business.StockCounting.Services;

public interface IStockCountService
{
    Task<StockCountOperationResult<StockCountSessionResponse>> CreateSessionAsync(
        CreateStockCountSessionRequest request,
        CancellationToken cancellationToken = default);

    Task<StockCountOperationResult<StockCountSessionResponse>> GetSessionByIdAsync(
        Guid sessionId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<StockCountSessionResponse>> GetWarehouseSessionsAsync(
        Guid warehouseId,
        StockCountStatus? status = null,
        CancellationToken cancellationToken = default);

    Task<StockCountOperationResult<StockCountSessionResponse>> RecordCountsAsync(
        Guid sessionId,
        RecordStockCountItemsRequest request,
        CancellationToken cancellationToken = default);

    Task<StockCountOperationResult<StockCountSessionResponse>> SubmitForReviewAsync(
        Guid sessionId,
        CancellationToken cancellationToken = default);

    Task<StockCountOperationResult<StockCountSessionResponse>> ReviewSessionAsync(
        Guid sessionId,
        ReviewStockCountSessionRequest request,
        CancellationToken cancellationToken = default);

    Task<StockCountOperationResult<bool>> CancelSessionAsync(
        Guid sessionId,
        string? reason = null,
        CancellationToken cancellationToken = default);
}
