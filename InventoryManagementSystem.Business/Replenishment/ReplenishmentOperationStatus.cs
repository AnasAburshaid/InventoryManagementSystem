namespace InventoryManagementSystem.Business.Replenishment;

public enum ReplenishmentOperationStatus
{
    Success,
    SettingNotFound,
    WarehouseNotFoundOrInactive,
    ProductNotFoundOrInactive,
    SupplierNotFound,
    InvalidLevels,
    InvalidQuantity,
    PoCreationFailed
}
