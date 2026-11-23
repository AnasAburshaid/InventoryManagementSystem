using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.PurchaseOrders.DTOs;

namespace InventoryManagementSystem.Business.PurchaseOrders.Services;

public interface IPurchaseOrderService
{
    Task<IReadOnlyCollection<PurchaseOrderResponse>> GetAllAsync(
        Guid? warehouseId = null,
        Guid? supplierId = null,
        string? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null);
    Task<PurchaseOrderResponse?> GetByIdAsync(Guid id);
    Task<PurchaseOrderResponse?> GetByNumberAsync(string purchaseOrderNumber);
    Task<PurchaseOrderOperationResult<PurchaseOrderResponse>> CreateAsync(CreatePurchaseOrderRequest request);
    Task<PurchaseOrderOperationResult<PurchaseOrderResponse>> UpdateAsync(Guid id, UpdatePurchaseOrderRequest request);
    Task<PurchaseOrderOperationResult<PurchaseOrderResponse>> SubmitAsync(Guid id);
    Task<PurchaseOrderOperationResult<PurchaseOrderResponse>> ReceiveGoodsAsync(Guid id, ReceivePurchaseOrderRequest request);
    Task<PurchaseOrderOperationResult<PurchaseOrderResponse>> CancelAsync(Guid id, string? reason = null);
    Task<PurchaseOrderOperationResult<bool>> DeleteAsync(Guid id);
}
