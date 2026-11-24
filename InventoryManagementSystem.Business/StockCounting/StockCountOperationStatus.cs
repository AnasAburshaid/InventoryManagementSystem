namespace InventoryManagementSystem.Business.StockCounting;

public enum StockCountOperationStatus
{
    Success,
    SessionNotFound,
    WarehouseNotFoundOrInactive,
    InvalidSessionState,
    EmptyProductList,
    UnauthorizedActor,
    InvalidQuantity,
    ConcurrencyError,
    NoDiscrepanciesToReconcile,
    AdjustmentFailed
}
