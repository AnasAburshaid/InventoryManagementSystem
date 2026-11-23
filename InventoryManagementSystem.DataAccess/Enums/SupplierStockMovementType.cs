namespace InventoryManagementSystem.DataAccess.Enums;

public enum SupplierStockMovementType
{
    ExternalReplenishment = 1,
    OrderReserved = 2,
    OrderReleased = 3,
    OrderFulfilledToWarehouse = 4,
    AdjustmentIn = 5,
    AdjustmentOut = 6
}
