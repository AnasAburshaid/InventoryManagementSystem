using InventoryManagementSystem.Business.Brands.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.Brands.Services;

public class BrandService
{
    private readonly InventoryDbContext _context;

    public BrandService(InventoryDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyCollection<BrandResponse>> GetAllAsync()
    {
        return await _context.Brands
            .AsNoTracking()
            .OrderBy(brand => brand.Name)
            .Select(brand => new BrandResponse
            {
                Id = brand.Id,
                Name = brand.Name,
                CreatedAt = brand.CreatedAt,
                IsActive = brand.IsActive
            })
            .ToListAsync();
    }

    public async Task<BrandResponse?> GetByIdAsync(Guid id)
    {
        return await _context.Brands
            .AsNoTracking()
            .Where(brand => brand.Id == id)
            .Select(brand => new BrandResponse
            {
                Id = brand.Id,
                Name = brand.Name,
                CreatedAt = brand.CreatedAt,
                IsActive = brand.IsActive
            })
            .FirstOrDefaultAsync();
    }

    public async Task<BrandOperationResult<BrandResponse>> CreateAsync(
        CreateBrandRequest request)
    {
        string name = request.Name.Trim();

        bool nameExists = await _context.Brands
            .AnyAsync(brand => brand.Name == name);

        if (nameExists)
        {
            return new BrandOperationResult<BrandResponse>
            {
                Status = BrandOperationStatus.DuplicateName
            };
        }

        Brand brand = new()
        {
            Name = name,
            IsActive = true
        };

        _context.Brands.Add(brand);
        await _context.SaveChangesAsync();

        return Success(brand);
    }

    public async Task<BrandOperationResult<BrandResponse>> UpdateAsync(
        Guid id,
        UpdateBrandRequest request)
    {
        Brand? brand = await _context.Brands.FindAsync(id);

        if (brand is null)
        {
            return new BrandOperationResult<BrandResponse>
            {
                Status = BrandOperationStatus.NotFound
            };
        }

        string name = request.Name.Trim();

        bool duplicateName = await _context.Brands.AnyAsync(
            otherBrand =>
                otherBrand.Id != id &&
                otherBrand.Name == name);

        if (duplicateName)
        {
            return new BrandOperationResult<BrandResponse>
            {
                Status = BrandOperationStatus.DuplicateName
            };
        }

        brand.Name = name;

        await _context.SaveChangesAsync();

        return Success(brand);
    }

    public async Task<BrandOperationResult<BrandResponse>> ChangeStatusAsync(
        Guid id,
        ChangeBrandStatusRequest request)
    {
        Brand? brand = await _context.Brands.FindAsync(id);

        if (brand is null)
        {
            return new BrandOperationResult<BrandResponse>
            {
                Status = BrandOperationStatus.NotFound
            };
        }

        brand.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        return Success(brand);
    }

    private static BrandOperationResult<BrandResponse> Success(Brand brand)
    {
        return new BrandOperationResult<BrandResponse>
        {
            Status = BrandOperationStatus.Success,
            Data = new BrandResponse
            {
                Id = brand.Id,
                Name = brand.Name,
                CreatedAt = brand.CreatedAt,
                IsActive = brand.IsActive
            }
        };
    }
}