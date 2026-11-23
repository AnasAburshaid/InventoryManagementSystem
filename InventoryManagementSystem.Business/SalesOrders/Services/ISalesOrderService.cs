using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.SalesOrders.DTOs;

namespace InventoryManagementSystem.Business.SalesOrders.Services;

public interface ISalesOrderService
{
    Task<IReadOnlyCollection<SalesOrderResponse>> GetAllAsync(
        Guid? warehouseId = null,
        Guid? customerId = null,
        string? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null);

    Task<SalesOrderResponse?> GetByIdAsync(Guid id);

    Task<SalesOrderResponse?> GetByNumberAsync(string salesOrderNumber);

    Task<SalesOrderOperationResult<SalesOrderResponse>> CreateAsync(CreateSalesOrderRequest request);

    Task<SalesOrderOperationResult<SalesOrderResponse>> UpdateAsync(Guid id, UpdateSalesOrderRequest request);

    Task<SalesOrderOperationResult<SalesOrderResponse>> ConfirmAsync(Guid id);

    Task<SalesOrderOperationResult<SalesOrderResponse>> FulfillGoodsAsync(Guid id, FulfillSalesOrderRequest request);

    Task<SalesOrderOperationResult<SalesOrderResponse>> CancelAsync(Guid id, string? reason = null);

    Task<SalesOrderOperationResult<bool>> DeleteAsync(Guid id);
}
