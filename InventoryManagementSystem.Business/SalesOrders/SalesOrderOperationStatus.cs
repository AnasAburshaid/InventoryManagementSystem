namespace InventoryManagementSystem.Business.SalesOrders;

public enum SalesOrderOperationStatus
{
    Success,
    NotFound,
    CustomerNotFound,
    CustomerInactive,
    WarehouseNotFound,
    WarehouseInactive,
    ProductNotFound,
    ProductInactive,
    OrderNotEditable,
    OrderAlreadyFulfilled,
    OrderAlreadyCancelled,
    CannotFulfillDraftOrder,
    InvalidStatusTransition,
    EmptyLines,
    DuplicateProductInLines,
    InvalidLineQuantity,
    InvalidLinePrice,
    OverFulfillmentNotAllowed,
    InsufficientStock,
    UnauthorizedActor
}
