using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.SupplierProducts.DTOs;
using InventoryManagementSystem.Business.Suppliers.Capabilities.Services;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.SupplierProducts.Services;

public class SupplierProductService : ISupplierProductService
{
    private readonly InventoryDbContext _context;
    private readonly ISupplierCapabilityService _capabilityService;

    public SupplierProductService(InventoryDbContext context, ISupplierCapabilityService capabilityService)
    {
        _context = context;
        _capabilityService = capabilityService;
    }

    public async Task<IReadOnlyCollection<SupplierProductResponse>> GetAllAsync(Guid? supplierId = null, Guid? productId = null)
    {
        var query = _context.SupplierProducts
            .AsNoTracking()
            .AsQueryable();

        if (supplierId.HasValue)
        {
            query = query.Where(sp => sp.SupplierId == supplierId.Value);
        }

        if (productId.HasValue)
        {
            query = query.Where(sp => sp.ProductId == productId.Value);
        }

        return await query
            .OrderBy(sp => sp.Product.Name)
            .ThenBy(sp => sp.Supplier.Name)
            .Select(sp => new SupplierProductResponse
            {
                Id = sp.Id,
                SupplierId = sp.SupplierId,
                SupplierName = sp.Supplier.Name,
                ProductId = sp.ProductId,
                ProductName = sp.Product.Name,
                ProductSku = sp.Product.Sku,
                CategoryName = sp.Product.Category != null ? sp.Product.Category.Name : string.Empty,
                SupplierProductCode = sp.SupplierProductCode,
                LastPurchasePrice = sp.LastPurchasePrice,
                LeadTimeDays = sp.LeadTimeDays,
                IsPreferred = sp.IsPreferred,
                IsActive = sp.IsActive,
                CreatedAt = sp.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<SupplierProductResponse?> GetByIdAsync(Guid id)
    {
        return await _context.SupplierProducts
            .AsNoTracking()
            .Where(sp => sp.Id == id)
            .Select(sp => new SupplierProductResponse
            {
                Id = sp.Id,
                SupplierId = sp.SupplierId,
                SupplierName = sp.Supplier.Name,
                ProductId = sp.ProductId,
                ProductName = sp.Product.Name,
                ProductSku = sp.Product.Sku,
                CategoryName = sp.Product.Category != null ? sp.Product.Category.Name : string.Empty,
                SupplierProductCode = sp.SupplierProductCode,
                LastPurchasePrice = sp.LastPurchasePrice,
                LeadTimeDays = sp.LeadTimeDays,
                IsPreferred = sp.IsPreferred,
                IsActive = sp.IsActive,
                CreatedAt = sp.CreatedAt
            })
            .FirstOrDefaultAsync();
    }

    public async Task<IReadOnlyCollection<SupplierProductResponse>> GetBySupplierIdAsync(Guid supplierId)
    {
        return await GetAllAsync(supplierId: supplierId);
    }

    public async Task<IReadOnlyCollection<SupplierProductResponse>> GetByProductIdAsync(Guid productId)
    {
        return await GetAllAsync(productId: productId);
    }

    public async Task<SupplierProductResponse?> GetPreferredByProductIdAsync(Guid productId)
    {
        return await _context.SupplierProducts
            .AsNoTracking()
            .Where(sp => sp.ProductId == productId && sp.IsPreferred && sp.IsActive)
            .Select(sp => new SupplierProductResponse
            {
                Id = sp.Id,
                SupplierId = sp.SupplierId,
                SupplierName = sp.Supplier.Name,
                ProductId = sp.ProductId,
                ProductName = sp.Product.Name,
                ProductSku = sp.Product.Sku,
                CategoryName = sp.Product.Category != null ? sp.Product.Category.Name : string.Empty,
                SupplierProductCode = sp.SupplierProductCode,
                LastPurchasePrice = sp.LastPurchasePrice,
                LeadTimeDays = sp.LeadTimeDays,
                IsPreferred = sp.IsPreferred,
                IsActive = sp.IsActive,
                CreatedAt = sp.CreatedAt
            })
            .FirstOrDefaultAsync();
    }

    public async Task<SupplierProductOperationResult<SupplierProductResponse>> CreateAsync(CreateSupplierProductRequest request)
    {
        if (request.LastPurchasePrice.HasValue && request.LastPurchasePrice.Value < 0)
        {
            return new SupplierProductOperationResult<SupplierProductResponse>
            {
                Status = SupplierProductOperationStatus.InvalidPrice,
                Message = "Last purchase price cannot be negative."
            };
        }

        if (request.LeadTimeDays.HasValue && request.LeadTimeDays.Value < 0)
        {
            return new SupplierProductOperationResult<SupplierProductResponse>
            {
                Status = SupplierProductOperationStatus.InvalidLeadTimeDays,
                Message = "Lead time days cannot be negative."
            };
        }

        string? trimmedCode = string.IsNullOrWhiteSpace(request.SupplierProductCode)
            ? null
            : request.SupplierProductCode.Trim();

        if (trimmedCode != null && trimmedCode.Length > 100)
        {
            return new SupplierProductOperationResult<SupplierProductResponse>
            {
                Status = SupplierProductOperationStatus.InvalidProductCode,
                Message = "Supplier product code cannot exceed 100 characters."
            };
        }

        var supplier = await _context.Suppliers
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == request.SupplierId);

        if (supplier == null)
        {
            return new SupplierProductOperationResult<SupplierProductResponse>
            {
                Status = SupplierProductOperationStatus.SupplierNotFound,
                Message = "Supplier not found."
            };
        }

        if (!supplier.IsActive)
        {
            return new SupplierProductOperationResult<SupplierProductResponse>
            {
                Status = SupplierProductOperationStatus.SupplierInactive,
                Message = "Supplier is inactive."
            };
        }

        var product = await _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Id == request.ProductId);

        if (product == null)
        {
            return new SupplierProductOperationResult<SupplierProductResponse>
            {
                Status = SupplierProductOperationStatus.ProductNotFound,
                Message = "Product not found."
            };
        }

        if (!product.IsActive)
        {
            return new SupplierProductOperationResult<SupplierProductResponse>
            {
                Status = SupplierProductOperationStatus.ProductInactive,
                Message = "Product is inactive."
            };
        }

        // Capability Validation: Check if supplier is authorized to offer this product
        var (isEligible, reason) = await _capabilityService.ValidateProductEligibilityAsync(request.SupplierId, request.ProductId);
        if (!isEligible)
        {
            return new SupplierProductOperationResult<SupplierProductResponse>
            {
                Status = SupplierProductOperationStatus.IneligibleProductForSupplier,
                Message = reason ?? "Product violates supplier capability rules."
            };
        }

        bool combinationExists = await _context.SupplierProducts
            .AnyAsync(sp => sp.SupplierId == request.SupplierId && sp.ProductId == request.ProductId);

        if (combinationExists)
        {
            return new SupplierProductOperationResult<SupplierProductResponse>
            {
                Status = SupplierProductOperationStatus.DuplicateSupplierProduct,
                Message = "This supplier is already linked to this product."
            };
        }

        // Auto-generate code if left blank or whitespace, else enforce uniqueness
        if (string.IsNullOrWhiteSpace(trimmedCode))
        {
            var supClean = new string(supplier.Name.Where(char.IsLetterOrDigit).Take(4).ToArray()).ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(supClean)) supClean = "VND";
            var skuPart = !string.IsNullOrWhiteSpace(product.Sku) ? product.Sku.Trim().ToUpperInvariant() : "PRD";
            var baseCode = $"SUP-{supClean}-{skuPart}";

            trimmedCode = baseCode;
            int suffix = 1;
            while (await _context.SupplierProducts.AnyAsync(sp => sp.SupplierId == request.SupplierId && sp.SupplierProductCode == trimmedCode))
            {
                trimmedCode = $"{baseCode}-{suffix++}";
            }
        }
        else
        {
            bool codeExists = await _context.SupplierProducts
                .AnyAsync(sp => sp.SupplierId == request.SupplierId && sp.SupplierProductCode == trimmedCode);

            if (codeExists)
            {
                return new SupplierProductOperationResult<SupplierProductResponse>
                {
                    Status = SupplierProductOperationStatus.DuplicateSupplierProductCode,
                    Message = "Supplier product code already exists for this supplier."
                };
            }
        }

        if (request.IsPreferred)
        {
            var otherPreferred = await _context.SupplierProducts
                .Where(sp => sp.ProductId == request.ProductId && sp.IsPreferred)
                .ToListAsync();

            foreach (var existingPreferred in otherPreferred)
            {
                existingPreferred.IsPreferred = false;
            }
        }

        var supplierProduct = new SupplierProduct
        {
            Id = Guid.NewGuid(),
            SupplierId = request.SupplierId,
            ProductId = request.ProductId,
            SupplierProductCode = trimmedCode,
            LastPurchasePrice = request.LastPurchasePrice,
            LeadTimeDays = request.LeadTimeDays,
            IsPreferred = request.IsPreferred,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.SupplierProducts.Add(supplierProduct);
        await _context.SaveChangesAsync();

        var response = new SupplierProductResponse
        {
            Id = supplierProduct.Id,
            SupplierId = supplier.Id,
            SupplierName = supplier.Name,
            ProductId = product.Id,
            ProductName = product.Name,
            ProductSku = product.Sku,
            CategoryName = product.Category?.Name ?? string.Empty,
            SupplierProductCode = supplierProduct.SupplierProductCode,
            LastPurchasePrice = supplierProduct.LastPurchasePrice,
            LeadTimeDays = supplierProduct.LeadTimeDays,
            IsPreferred = supplierProduct.IsPreferred,
            IsActive = supplierProduct.IsActive,
            CreatedAt = supplierProduct.CreatedAt
        };

        return new SupplierProductOperationResult<SupplierProductResponse>
        {
            Status = SupplierProductOperationStatus.Success,
            Data = response
        };
    }

    public async Task<SupplierProductOperationResult<SupplierProductResponse>> UpdateAsync(Guid id, UpdateSupplierProductRequest request)
    {
        var supplierProduct = await _context.SupplierProducts
            .Include(sp => sp.Supplier)
            .Include(sp => sp.Product)
                .ThenInclude(p => p.Category)
            .FirstOrDefaultAsync(sp => sp.Id == id);

        if (supplierProduct == null)
        {
            return new SupplierProductOperationResult<SupplierProductResponse>
            {
                Status = SupplierProductOperationStatus.NotFound,
                Message = "Supplier product mapping not found."
            };
        }

        if (request.LastPurchasePrice.HasValue && request.LastPurchasePrice.Value < 0)
        {
            return new SupplierProductOperationResult<SupplierProductResponse>
            {
                Status = SupplierProductOperationStatus.InvalidPrice,
                Message = "Last purchase price cannot be negative."
            };
        }

        if (request.LeadTimeDays.HasValue && request.LeadTimeDays.Value < 0)
        {
            return new SupplierProductOperationResult<SupplierProductResponse>
            {
                Status = SupplierProductOperationStatus.InvalidLeadTimeDays,
                Message = "Lead time days cannot be negative."
            };
        }

        string? trimmedCode = string.IsNullOrWhiteSpace(request.SupplierProductCode)
            ? supplierProduct.SupplierProductCode
            : request.SupplierProductCode.Trim();

        if (trimmedCode != null && trimmedCode.Length > 100)
        {
            return new SupplierProductOperationResult<SupplierProductResponse>
            {
                Status = SupplierProductOperationStatus.InvalidProductCode,
                Message = "Supplier product code cannot exceed 100 characters."
            };
        }

        if (trimmedCode != null && trimmedCode != supplierProduct.SupplierProductCode)
        {
            bool codeExists = await _context.SupplierProducts
                .AnyAsync(sp => sp.SupplierId == supplierProduct.SupplierId && sp.SupplierProductCode == trimmedCode && sp.Id != id);

            if (codeExists)
            {
                return new SupplierProductOperationResult<SupplierProductResponse>
                {
                    Status = SupplierProductOperationStatus.DuplicateSupplierProductCode,
                    Message = "Supplier product code already exists for this supplier."
                };
            }
        }

        if (request.IsActive || request.IsPreferred)
        {
            var (isEligible, reason) = await _capabilityService.ValidateProductEligibilityAsync(supplierProduct.SupplierId, supplierProduct.ProductId);
            if (!isEligible)
            {
                return new SupplierProductOperationResult<SupplierProductResponse>
                {
                    Status = SupplierProductOperationStatus.IneligibleProductForSupplier,
                    Message = reason ?? "Product violates supplier capability rules."
                };
            }
        }

        if (request.IsPreferred && !supplierProduct.IsPreferred)
        {
            var otherPreferred = await _context.SupplierProducts
                .Where(sp => sp.ProductId == supplierProduct.ProductId && sp.Id != id && sp.IsPreferred)
                .ToListAsync();

            foreach (var existingPreferred in otherPreferred)
            {
                existingPreferred.IsPreferred = false;
            }
        }

        supplierProduct.SupplierProductCode = trimmedCode;
        supplierProduct.LastPurchasePrice = request.LastPurchasePrice;
        supplierProduct.LeadTimeDays = request.LeadTimeDays;
        supplierProduct.IsPreferred = request.IsPreferred;
        supplierProduct.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        var response = new SupplierProductResponse
        {
            Id = supplierProduct.Id,
            SupplierId = supplierProduct.SupplierId,
            SupplierName = supplierProduct.Supplier.Name,
            ProductId = supplierProduct.ProductId,
            ProductName = supplierProduct.Product.Name,
            ProductSku = supplierProduct.Product.Sku,
            CategoryName = supplierProduct.Product.Category?.Name ?? string.Empty,
            SupplierProductCode = supplierProduct.SupplierProductCode,
            LastPurchasePrice = supplierProduct.LastPurchasePrice,
            LeadTimeDays = supplierProduct.LeadTimeDays,
            IsPreferred = supplierProduct.IsPreferred,
            IsActive = supplierProduct.IsActive,
            CreatedAt = supplierProduct.CreatedAt
        };

        return new SupplierProductOperationResult<SupplierProductResponse>
        {
            Status = SupplierProductOperationStatus.Success,
            Data = response
        };
    }

    public async Task<SupplierProductOperationResult<SupplierProductResponse>> SetPreferredAsync(Guid id)
    {
        var supplierProduct = await _context.SupplierProducts
            .Include(sp => sp.Supplier)
            .Include(sp => sp.Product)
                .ThenInclude(p => p.Category)
            .FirstOrDefaultAsync(sp => sp.Id == id);

        if (supplierProduct == null)
        {
            return new SupplierProductOperationResult<SupplierProductResponse>
            {
                Status = SupplierProductOperationStatus.NotFound,
                Message = "Supplier product mapping not found."
            };
        }

        if (!supplierProduct.Supplier.IsActive)
        {
            return new SupplierProductOperationResult<SupplierProductResponse>
            {
                Status = SupplierProductOperationStatus.SupplierInactive,
                Message = $"Supplier '{supplierProduct.Supplier.Name}' is inactive."
            };
        }

        if (!supplierProduct.Product.IsActive)
        {
            return new SupplierProductOperationResult<SupplierProductResponse>
            {
                Status = SupplierProductOperationStatus.ProductInactive,
                Message = $"Product '{supplierProduct.Product.Name}' is inactive."
            };
        }

        var (isEligible, reason) = await _capabilityService.ValidateProductEligibilityAsync(supplierProduct.SupplierId, supplierProduct.ProductId);
        if (!isEligible)
        {
            return new SupplierProductOperationResult<SupplierProductResponse>
            {
                Status = SupplierProductOperationStatus.IneligibleProductForSupplier,
                Message = reason ?? "Product violates supplier capability rules."
            };
        }

        if (!supplierProduct.IsPreferred)
        {
            var otherPreferred = await _context.SupplierProducts
                .Where(sp => sp.ProductId == supplierProduct.ProductId && sp.Id != id && sp.IsPreferred)
                .ToListAsync();

            foreach (var existingPreferred in otherPreferred)
            {
                existingPreferred.IsPreferred = false;
            }

            supplierProduct.IsPreferred = true;
            supplierProduct.IsActive = true;
            await _context.SaveChangesAsync();
        }

        var response = new SupplierProductResponse
        {
            Id = supplierProduct.Id,
            SupplierId = supplierProduct.SupplierId,
            SupplierName = supplierProduct.Supplier.Name,
            ProductId = supplierProduct.ProductId,
            ProductName = supplierProduct.Product.Name,
            ProductSku = supplierProduct.Product.Sku,
            CategoryName = supplierProduct.Product.Category?.Name ?? string.Empty,
            SupplierProductCode = supplierProduct.SupplierProductCode,
            LastPurchasePrice = supplierProduct.LastPurchasePrice,
            LeadTimeDays = supplierProduct.LeadTimeDays,
            IsPreferred = supplierProduct.IsPreferred,
            IsActive = supplierProduct.IsActive,
            CreatedAt = supplierProduct.CreatedAt
        };

        return new SupplierProductOperationResult<SupplierProductResponse>
        {
            Status = SupplierProductOperationStatus.Success,
            Data = response
        };
    }

    public async Task<SupplierProductOperationResult<bool>> DeleteAsync(Guid id)
    {
        var supplierProduct = await _context.SupplierProducts
            .FirstOrDefaultAsync(sp => sp.Id == id);

        if (supplierProduct == null)
        {
            return new SupplierProductOperationResult<bool>
            {
                Status = SupplierProductOperationStatus.NotFound,
                Data = false,
                Message = "Supplier product mapping not found."
            };
        }

        _context.SupplierProducts.Remove(supplierProduct);
        await _context.SaveChangesAsync();

        return new SupplierProductOperationResult<bool>
        {
            Status = SupplierProductOperationStatus.Success,
            Data = true
        };
    }
}
