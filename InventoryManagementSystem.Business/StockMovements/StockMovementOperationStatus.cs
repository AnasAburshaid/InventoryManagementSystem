namespace InventoryManagementSystem.Business.StockMovements;

public enum StockMovementOperationStatus
{
    Success,
    InvalidQuantity,
    ProductNotFoundOrInactive,
    WarehouseNotFoundOrInactive,
    AdjustmentReasonRequired,
    AdjustmentReasonNotFound,
    UnauthorizedActor,
    InsufficientStock,
    DestinationWarehouseNotFoundOrInactive,
    SameSourceAndDestination
}