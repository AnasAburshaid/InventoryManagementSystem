using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.PurchaseOrders.DTOs;

namespace InventoryManagementSystem.Business.PurchaseOrders.Services;

public interface IPurchaseOrderLineService
{
    Task<IReadOnlyCollection<PurchaseOrderLineResponse>> GetLinesByOrderIdAsync(Guid purchaseOrderId);
    Task<PurchaseOrderLineResponse?> GetByIdAsync(Guid id);
    Task<PurchaseOrderOperationResult<PurchaseOrderLineResponse>> AddLineAsync(Guid purchaseOrderId, CreatePurchaseOrderLineRequest request);
    Task<PurchaseOrderOperationResult<PurchaseOrderLineResponse>> UpdateLineAsync(Guid id, UpdatePurchaseOrderLineRequest request);
    Task<PurchaseOrderOperationResult<bool>> DeleteLineAsync(Guid id);
}
