namespace InventoryManagementSystem.Business.SupplierProducts;

public enum SupplierProductOperationStatus
{
    Success,
    NotFound,
    SupplierNotFound,
    SupplierInactive,
    ProductNotFound,
    ProductInactive,
    DuplicateSupplierProduct,
    DuplicateSupplierProductCode,
    InvalidPrice,
    InvalidLeadTimeDays,
    InvalidProductCode,
    IneligibleProductForSupplier
}
