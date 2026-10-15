using InventoryManagementSystem.Business.StockMovements.DTOs;

namespace InventoryManagementSystem.Business.StockMovements.Services;

public interface IStockMovementService
{
    Task<StockMovementOperationResult<StockMovementResponse>> RecordMovementAsync(RecordMovementRequest request);
    Task<IReadOnlyCollection<StockMovementResponse>> GetHistoryAsync(Guid warehouseId, Guid productId);
    Task<decimal> GetCurrentStockAsync(Guid warehouseId, Guid productId);
    Task<StockMovementOperationResult<List<StockMovementResponse>>> TransferStockAsync(Guid sourceWarehouseId, TransferStockRequest request);
}