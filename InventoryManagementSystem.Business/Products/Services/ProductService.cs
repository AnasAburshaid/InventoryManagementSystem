using InventoryManagementSystem.Business.Products.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.Products.Services
{
    public class ProductService
    {

        private readonly InventoryDbContext _context;
        private readonly SkuGenerator _skuGenerator;

        private static readonly string[] AllowedUnits =
        {
        "Piece",
        "Box",
        "Kg",
        "Liter",
        "Pack"
        };
        public ProductService(InventoryDbContext context , SkuGenerator skuGenerator)
        {
            _context = context;
            _skuGenerator = skuGenerator;
        }

        private async Task<string> GenerateUniqueSkuAsync()
        {
            string sku;

            do
            {
                sku = _skuGenerator.Generate();
            }
            while (await _context.Products
                .AnyAsync(product => product.Sku == sku));

            return sku;
        }

        private async Task<bool> IsDuplicateProductAsync(string name, Guid categoryId, Guid? brandId, string unitOfMeasure)
        {
            return await _context.Products
                .AnyAsync(product =>
                    product.Name == name &&
                    product.CategoryId == categoryId &&
                    product.BrandId == brandId &&
                    product.UnitOfMeasure == unitOfMeasure);
        }

        public async Task<IReadOnlyCollection<ProductResponse>> GetAllAsync()
        {
            return await _context.Products
                .AsNoTracking()
                .OrderBy(product => product.Name)
                .Select(product => new ProductResponse
                {
                    Id = product.Id,
                    SKU = product.Sku,
                    Name = product.Name,
                    UnitOfMeasure = product.UnitOfMeasure,
                    ReorderThreshold = product.ReorderThreshold,
                    SellingPrice = product.SellingPrice,

                    CategoryId = product.CategoryId,
                    CategoryName = product.Category.Name,

                    BrandId = product.BrandId,
                    BrandName = product.Brand != null
                        ? product.Brand.Name
                        : null,

                    CreatedAt = product.CreatedAt,
                    IsActive = product.IsActive
                })
                .ToListAsync();
        }
        public async Task<ProductResponse?> GetByIdAsync(Guid id)
        {
            return await _context.Products
                .AsNoTracking()
                .Where(product => product.Id == id)
                .Select(product => new ProductResponse
                {
                    Id = product.Id,
                    SKU = product.Sku,
                    Name = product.Name,
                    UnitOfMeasure = product.UnitOfMeasure,
                    ReorderThreshold = product.ReorderThreshold,
                    SellingPrice = product.SellingPrice,

                    CategoryId = product.CategoryId,
                    CategoryName = product.Category.Name,

                    BrandId = product.BrandId,
                    BrandName = product.Brand != null
                        ? product.Brand.Name
                        : null,

                    CreatedAt = product.CreatedAt,
                    IsActive = product.IsActive
                })
                .FirstOrDefaultAsync();
        }

        public async Task<ProductOperationResult<ProductResponse>> CreateAsync(CreateProductRequest request)
        {
            string sku = await GenerateUniqueSkuAsync();
            string name = request.Name.Trim();
            string unitOfMeasure = request.UnitOfMeasure.Trim();

            string? validUnit =
            AllowedUnits.FirstOrDefault(unit =>
            string.Equals(
                unit,
                unitOfMeasure,
                StringComparison.OrdinalIgnoreCase));

            if (validUnit is null)
            {
                return new ProductOperationResult<ProductResponse>
                {
                    Status = ProductOperationStatus.InvalidUnitOfMeasure
                };
            }


            Category? category =
                await _context.Categories
                    .AsNoTracking()
                    .FirstOrDefaultAsync(
                        category => category.Id == request.CategoryId);

            if (category is null)
            {
                return new ProductOperationResult<ProductResponse>
                {
                    Status = ProductOperationStatus.CategoryNotFound
                };
            }

            if (!category.IsActive)
            {
                return new ProductOperationResult<ProductResponse>
                {
                    Status = ProductOperationStatus.CategoryInactive
                };
            }

            Brand? brand = null;

            if (request.BrandId.HasValue)
            {
                brand = await _context.Brands
                    .AsNoTracking()
                    .FirstOrDefaultAsync(
                        brand => brand.Id == request.BrandId.Value);

                if (brand is null)
                {
                    return new ProductOperationResult<ProductResponse>
                    {
                        Status = ProductOperationStatus.BrandNotFound
                    };
                }

                if (!brand.IsActive)
                {
                    return new ProductOperationResult<ProductResponse>
                    {
                        Status = ProductOperationStatus.BrandInactive
                    };
                }
              
                if (await IsDuplicateProductAsync(
                    request.Name,request.CategoryId,
                    request.BrandId,request.UnitOfMeasure))
                {
                    return new ProductOperationResult<ProductResponse>
                    {
                        Status = ProductOperationStatus.DuplicateProduct
                    };
                }
            }

            Product product = new()
            {
                Sku = sku,
                Name = name,
                UnitOfMeasure = validUnit,
                ReorderThreshold = request.ReorderThreshold,
                CategoryId = request.CategoryId,
                BrandId = request.BrandId,
                SellingPrice = request.SellingPrice,
                IsActive = true
            };

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            return new ProductOperationResult<ProductResponse>
            {
                Status = ProductOperationStatus.Success,
                Data = new ProductResponse
                {
                    Id = product.Id,
                    SKU = product.Sku,
                    Name = product.Name,
                    UnitOfMeasure = product.UnitOfMeasure,
                    ReorderThreshold = product.ReorderThreshold,
                    SellingPrice = product.SellingPrice,

                    CategoryId = product.CategoryId,
                    CategoryName = category.Name,

                    BrandId = product.BrandId,
                    BrandName = brand?.Name,

                    CreatedAt = product.CreatedAt,
                    IsActive = product.IsActive
                }
            };
        }

        public async Task<ProductOperationResult<ProductResponse>> UpdateAsync(Guid id,UpdateProductRequest request)
        {
            Product? product =
                await _context.Products.FindAsync(id);

            if (product is null)
            {
                return new ProductOperationResult<ProductResponse>
                {
                    Status = ProductOperationStatus.NotFound
                };
            }

            string name = request.Name.Trim();
            string unitOfMeasure = request.UnitOfMeasure.Trim();

            string? validUnit =
                AllowedUnits.FirstOrDefault(unit =>
                    string.Equals(
                        unit,
                        unitOfMeasure,
                        StringComparison.OrdinalIgnoreCase));

            if (validUnit is null)
            {
                return new ProductOperationResult<ProductResponse>
                {
                    Status = ProductOperationStatus.InvalidUnitOfMeasure
                };
            }

            Category? category =
                await _context.Categories
                    .AsNoTracking()
                    .FirstOrDefaultAsync(
                        category => category.Id == request.CategoryId);

            if (category is null)
            {
                return new ProductOperationResult<ProductResponse>
                {
                    Status = ProductOperationStatus.CategoryNotFound
                };
            }

            if (!category.IsActive)
            {
                return new ProductOperationResult<ProductResponse>
                {
                    Status = ProductOperationStatus.CategoryInactive
                };
            }

            Brand? brand = null;

            if (request.BrandId.HasValue)
            {
                brand = await _context.Brands
                    .AsNoTracking()
                    .FirstOrDefaultAsync(
                        brand => brand.Id == request.BrandId.Value);

                if (brand is null)
                {
                    return new ProductOperationResult<ProductResponse>
                    {
                        Status = ProductOperationStatus.BrandNotFound
                    };
                }

                if (!brand.IsActive)
                {
                    return new ProductOperationResult<ProductResponse>
                    {
                        Status = ProductOperationStatus.BrandInactive
                    };
                }
            }

             if (await IsDuplicateProductAsync(
                    request.Name,request.CategoryId,
                    request.BrandId,request.UnitOfMeasure))
                {
                    return new ProductOperationResult<ProductResponse>
                    {
                        Status = ProductOperationStatus.DuplicateProduct
                    };
                }

            product.Name = name;
            product.UnitOfMeasure = validUnit;
            product.ReorderThreshold = request.ReorderThreshold;
            product.CategoryId = request.CategoryId;
            product.BrandId = request.BrandId;
            product.SellingPrice = request.SellingPrice;

            await _context.SaveChangesAsync();

            return new ProductOperationResult<ProductResponse>
            {
                Status = ProductOperationStatus.Success,
                Data = new ProductResponse
                {
                    Id = product.Id,
                    SKU = product.Sku,
                    Name = product.Name,
                    UnitOfMeasure = product.UnitOfMeasure,
                    ReorderThreshold = product.ReorderThreshold,
                    SellingPrice = product.SellingPrice,
                    CategoryId = product.CategoryId,
                    CategoryName = category.Name,
                    BrandId = product.BrandId,
                    BrandName = brand?.Name,
                    CreatedAt = product.CreatedAt,
                    IsActive = product.IsActive
                }
            };
        }

        public async Task<ProductOperationResult<ProductResponse>> ChangeStatusAsync(Guid id,ChangeProductStatusRequest request)
        {
            Product? product = await _context.Products.FindAsync(id);

            if (product is null)
            {
                return new ProductOperationResult<ProductResponse>
                {
                    Status = ProductOperationStatus.NotFound
                };
            }

            product.IsActive = request.IsActive;

            await _context.SaveChangesAsync();

            ProductResponse? response =
                await GetByIdAsync(product.Id);

            return new ProductOperationResult<ProductResponse>
            {
                Status = ProductOperationStatus.Success,
                Data = response
            };
        }
    }


}
