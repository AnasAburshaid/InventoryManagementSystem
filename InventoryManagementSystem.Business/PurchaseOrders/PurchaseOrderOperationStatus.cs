namespace InventoryManagementSystem.Business.PurchaseOrders;

public enum PurchaseOrderOperationStatus
{
    Success,
    NotFound,
    SupplierNotFound,
    SupplierInactive,
    WarehouseNotFound,
    WarehouseInactive,
    ProductNotFound,
    ProductInactive,
    InvalidDeliveryDate,
    InvalidStatusTransition,
    InvalidLineQuantity,
    InvalidLineCost,
    EmptyLines,
    DuplicateProductInLines,
    OrderNotEditable,
    OrderAlreadyCancelled,
    OrderAlreadyReceived,
    UnauthorizedActor,
    CannotReceiveDraftOrder,
    OverReceiptNotAllowed,
    ProductNotOfferedBySupplier,
    InsufficientSupplierStock,
    ConcurrencyConflict,
    CategoryNotAllowedInWarehouse
}
