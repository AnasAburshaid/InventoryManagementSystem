using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.SalesOrders.DTOs;

namespace InventoryManagementSystem.Business.SalesOrders.Services;

public interface ISalesOrderLineService
{
    Task<IReadOnlyCollection<SalesOrderLineResponse>> GetLinesByOrderIdAsync(Guid salesOrderId);
    Task<SalesOrderLineResponse?> GetByIdAsync(Guid id);
    Task<SalesOrderOperationResult<SalesOrderLineResponse>> AddLineAsync(Guid salesOrderId, CreateSalesOrderLineRequest request);
    Task<SalesOrderOperationResult<SalesOrderLineResponse>> UpdateLineAsync(Guid id, UpdateSalesOrderLineRequest request);
    Task<SalesOrderOperationResult<bool>> DeleteLineAsync(Guid id);
}
