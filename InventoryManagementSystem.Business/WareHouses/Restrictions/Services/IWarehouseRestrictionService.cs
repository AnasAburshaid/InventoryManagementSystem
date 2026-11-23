using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.Products.DTOs;
using InventoryManagementSystem.Business.Warehouses.Restrictions.DTOs;

namespace InventoryManagementSystem.Business.Warehouses.Restrictions.Services;

public interface IWarehouseRestrictionService
{
    Task<WarehouseCategoryRestrictionsResponse?> GetRestrictionsAsync(Guid warehouseId);
    Task<(bool isSuccess, string? error, WarehouseCategoryRestrictionsResponse? data)> SetCategoriesAsync(Guid warehouseId, IEnumerable<Guid> categoryIds);
    Task<(bool isSuccess, string? error, WarehouseCategoryRestrictionsResponse? data)> UpdateFlagAsync(Guid warehouseId, bool canAcceptAllCategories);
    Task<(bool isEligible, string? reason)> ValidateCategoryEligibilityAsync(Guid warehouseId, Guid categoryId);
    Task<(bool isEligible, string? reason)> ValidateProductEligibilityAsync(Guid warehouseId, Guid productId);
    Task<IReadOnlyCollection<ProductResponse>> GetEligibleProductsAsync(Guid warehouseId);
}
