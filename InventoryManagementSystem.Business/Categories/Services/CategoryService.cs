using InventoryManagementSystem.Business.Categories.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.Categories.Services;

public class CategoryService
{
    private readonly InventoryDbContext _context;

    public CategoryService(InventoryDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyCollection<CategoryResponse>> GetAllAsync()
    {
        return await _context.Categories
            .AsNoTracking()
            .OrderBy(category => category.Name)
            .Select(category => new CategoryResponse
            {
                Id = category.Id,
                Name = category.Name,
                CreatedAt = category.CreatedAt,
                IsActive = category.IsActive
            })
            .ToListAsync();
    }

    public async Task<CategoryResponse?> GetByIdAsync(Guid id)
    {
        return await _context.Categories
            .AsNoTracking()
            .Where(category => category.Id == id)
            .Select(category => new CategoryResponse
            {
                Id = category.Id,
                Name = category.Name,
                CreatedAt = category.CreatedAt,
                IsActive = category.IsActive
            })
            .FirstOrDefaultAsync();
    }

    public async Task<CategoryOperationResult<CategoryResponse>> CreateAsync(
        CreateCategoryRequest request)
    {
        string normalizedName = request.Name.Trim();

        bool nameExists = await _context.Categories
            .AnyAsync(category => category.Name == normalizedName);

        if (nameExists)
        {
            return new CategoryOperationResult<CategoryResponse>
            {
                Status = CategoryOperationStatus.DuplicateName
            };
        }

        Category category = new()
        {
            Name = normalizedName,
            IsActive = true
        };

        _context.Categories.Add(category); 
        await _context.SaveChangesAsync();

        CategoryResponse response = new()
        {
            Id = category.Id,
            Name = category.Name,
            CreatedAt = category.CreatedAt,
            IsActive = category.IsActive
        };

        return new CategoryOperationResult<CategoryResponse>
        {
            Status = CategoryOperationStatus.Success,
            Data = response
        };
    }

    public async Task<CategoryOperationResult<CategoryResponse>> UpdateAsync(Guid id,UpdateCategoryRequest request)
    {
        Category? category = await _context.Categories.FindAsync(id);

        if (category is null)
        {
            return new CategoryOperationResult<CategoryResponse>
            {
                Status = CategoryOperationStatus.NotFound
            };
        }

        string normalizedName = request.Name.Trim();

        bool duplicateName = await _context.Categories.AnyAsync(
            otherCategory =>
                otherCategory.Id != id &&
                otherCategory.Name == normalizedName);

        if (duplicateName)
        {
            return new CategoryOperationResult<CategoryResponse>
            {
                Status = CategoryOperationStatus.DuplicateName
            };
        }

        category.Name = normalizedName;

        await _context.SaveChangesAsync();

        return new CategoryOperationResult<CategoryResponse>
        {
            Status = CategoryOperationStatus.Success,
            Data = new CategoryResponse
            {
                Id = category.Id,
                Name = category.Name,
                CreatedAt = category.CreatedAt,
                IsActive = category.IsActive
            }
        };
    }

    public async Task<CategoryOperationResult<CategoryResponse>>
    ChangeStatusAsync(Guid id,ChangeCategoryStatusRequest request)
    {
        Category? category =
            await _context.Categories.FindAsync(id);

        if (category is null)
        {
            return new CategoryOperationResult<CategoryResponse>
            {
                Status = CategoryOperationStatus.NotFound
            };
        }

        category.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        return new CategoryOperationResult<CategoryResponse>
        {
            Status = CategoryOperationStatus.Success,
            Data = new CategoryResponse
            {
                Id = category.Id,
                Name = category.Name,
                CreatedAt = category.CreatedAt,
                IsActive = category.IsActive
            }
        };
    }
}   