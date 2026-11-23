using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.Products.DTOs;
using InventoryManagementSystem.Business.Suppliers.Capabilities.DTOs;
using InventoryManagementSystem.Business.Suppliers.DTOs;

namespace InventoryManagementSystem.Business.Suppliers.Capabilities.Services;

public interface ISupplierCapabilityService
{
    Task<SupplierCapabilitiesResponse?> GetCapabilitiesAsync(Guid supplierId);
    Task<(bool isSuccess, string? error, SupplierCapabilitiesResponse? data)> SetCategoriesAsync(Guid supplierId, IEnumerable<Guid> categoryIds);
    Task<(bool isSuccess, string? error, SupplierCapabilitiesResponse? data)> SetBrandsAsync(Guid supplierId, IEnumerable<Guid> brandIds);
    Task<(bool isSuccess, string? error, SupplierCapabilitiesResponse? data)> UpdateFlagsAsync(Guid supplierId, bool canSupplyAllCategories, bool canSupplyAllBrands);
    Task<(bool isEligible, string? reason)> ValidateProductEligibilityAsync(Guid supplierId, Guid productId);
    Task<IReadOnlyCollection<EligibleSupplierDto>> GetEligibleSuppliersForProductAsync(Guid productId);
    Task<IReadOnlyCollection<ProductResponse>> GetEligibleProductsForSupplierAsync(Guid supplierId);
}
