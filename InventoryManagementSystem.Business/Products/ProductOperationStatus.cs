namespace InventoryManagementSystem.Business.Products;

public enum ProductOperationStatus
{
    Success,
    NotFound,
    DuplicateSKU,
    CategoryNotFound,
    DuplicateProduct,
    CategoryInactive,
    BrandNotFound,
    BrandInactive,
    InvalidUnitOfMeasure
}