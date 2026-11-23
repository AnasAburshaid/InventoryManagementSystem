using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.Suppliers.Stock.DTOs;
using InventoryManagementSystem.DataAccess.Entities;

namespace InventoryManagementSystem.Business.Suppliers.Stock.Services;

public interface ISupplierStockService
{
    Task<(bool isSuccess, string? error, SupplierStockMovementResponse? data)> RecordReplenishmentAsync(
        Guid supplierId,
        RecordSupplierReplenishmentRequest request,
        string userId);

    Task<(bool isSuccess, string? error, SupplierStockMovementResponse? data)> RecordAdjustmentAsync(
        Guid supplierId,
        SupplierStockAdjustmentRequest request,
        string userId);

    Task<SupplierStockSummaryResponse?> GetProductStockSummaryAsync(Guid supplierId, Guid productId);

    Task<IReadOnlyCollection<SupplierStockSummaryResponse>> GetSupplierStockSummariesAsync(Guid supplierId);

    Task<IReadOnlyCollection<SupplierStockMovementResponse>> GetLedgerHistoryAsync(Guid supplierId, Guid? productId = null);

    // Purchase Order Reservation & Fulfillment hooks
    Task<(bool isSuccess, string? error)> ReserveStockForPurchaseOrderAsync(PurchaseOrder po, string userId);
    Task<(bool isSuccess, string? error)> ReleaseReservationForPurchaseOrderAsync(PurchaseOrder po, string userId);
    Task<(bool isSuccess, string? error)> FulfillStockForReceiptAsync(Guid supplierId, Guid productId, decimal quantity, string poNumber, int lineNumber, string userId);
}
