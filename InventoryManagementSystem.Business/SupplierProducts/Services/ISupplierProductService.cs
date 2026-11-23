using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.SupplierProducts.DTOs;

namespace InventoryManagementSystem.Business.SupplierProducts.Services;

public interface ISupplierProductService
{
    Task<IReadOnlyCollection<SupplierProductResponse>> GetAllAsync(Guid? supplierId = null, Guid? productId = null);
    Task<SupplierProductResponse?> GetByIdAsync(Guid id);
    Task<IReadOnlyCollection<SupplierProductResponse>> GetBySupplierIdAsync(Guid supplierId);
    Task<IReadOnlyCollection<SupplierProductResponse>> GetByProductIdAsync(Guid productId);
    Task<SupplierProductResponse?> GetPreferredByProductIdAsync(Guid productId);
    Task<SupplierProductOperationResult<SupplierProductResponse>> CreateAsync(CreateSupplierProductRequest request);
    Task<SupplierProductOperationResult<SupplierProductResponse>> UpdateAsync(Guid id, UpdateSupplierProductRequest request);
    Task<SupplierProductOperationResult<SupplierProductResponse>> SetPreferredAsync(Guid id);
    Task<SupplierProductOperationResult<bool>> DeleteAsync(Guid id);
}
