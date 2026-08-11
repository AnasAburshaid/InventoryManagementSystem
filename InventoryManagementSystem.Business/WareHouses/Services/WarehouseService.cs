using InventoryManagementSystem.Business.Warehouses.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.Warehouses.Services;

public class WarehouseService
{
    private readonly InventoryDbContext _context;
    private readonly WarehouseCodeGenerator _codeGenerator;

    public WarehouseService(
        InventoryDbContext context,
        WarehouseCodeGenerator codeGenerator)
    {
        _context = context;
        _codeGenerator = codeGenerator;
    }

    private async Task<string> GenerateUniqueCodeAsync()
    {
        string code;

        do
        {
            code = _codeGenerator.Generate();
        }
        while (await _context.Warehouses
            .AnyAsync(warehouse => warehouse.Code == code));

        return code;
    }

    private async Task<bool> IsDuplicateWarehouseAsync(
        string name,
        string? address,
        Guid? excludeWarehouseId = null)
    {
        return await _context.Warehouses
            .AnyAsync(warehouse =>
                warehouse.Name == name &&
                warehouse.Address == address &&
                (!excludeWarehouseId.HasValue ||
                 warehouse.Id != excludeWarehouseId.Value));
    }

    public async Task<IReadOnlyCollection<WarehouseResponse>> GetAllAsync()
    {
        return await _context.Warehouses
            .AsNoTracking()
            .OrderBy(warehouse => warehouse.Name)
            .Select(warehouse => new WarehouseResponse
            {
                Id = warehouse.Id,
                Name = warehouse.Name,
                Code = warehouse.Code,
                Address = warehouse.Address,
                CreatedAt = warehouse.CreatedAt,
                IsActive = warehouse.IsActive
            })
            .ToListAsync();
    }

    public async Task<WarehouseResponse?> GetByIdAsync(Guid id)
    {
        return await _context.Warehouses
            .AsNoTracking()
            .Where(warehouse => warehouse.Id == id)
            .Select(warehouse => new WarehouseResponse
            {
                Id = warehouse.Id,
                Name = warehouse.Name,
                Code = warehouse.Code,
                Address = warehouse.Address,
                CreatedAt = warehouse.CreatedAt,
                IsActive = warehouse.IsActive
            })
            .FirstOrDefaultAsync();
    }

    public async Task<WarehouseOperationResult<WarehouseResponse>> CreateAsync(
        CreateWarehouseRequest request)
    {
        string name = request.Name.Trim();

        string? address = string.IsNullOrWhiteSpace(request.Address)
            ? null
            : request.Address.Trim();

        if (await IsDuplicateWarehouseAsync(name, address))
        {
            return new WarehouseOperationResult<WarehouseResponse>
            {
                Status = WarehouseOperationStatus.DuplicateWarehouse
            };
        }

        string code = await GenerateUniqueCodeAsync();

        Warehouse warehouse = new()
        {
            Name = name,
            Code = code,
            Address = address,
            IsActive = true
        };

        _context.Warehouses.Add(warehouse);

        await _context.SaveChangesAsync();

        return Success(warehouse);
    }

    public async Task<WarehouseOperationResult<WarehouseResponse>> UpdateAsync(
        Guid id,
        UpdateWarehouseRequest request)
    {
        Warehouse? warehouse =
            await _context.Warehouses.FindAsync(id);

        if (warehouse is null)
        {
            return new WarehouseOperationResult<WarehouseResponse>
            {
                Status = WarehouseOperationStatus.NotFound
            };
        }

        string name = request.Name.Trim();

        string? address = string.IsNullOrWhiteSpace(request.Address)
            ? null
            : request.Address.Trim();

        if (await IsDuplicateWarehouseAsync(
            name,
            address,
            id))
        {
            return new WarehouseOperationResult<WarehouseResponse>
            {
                Status = WarehouseOperationStatus.DuplicateWarehouse
            };
        }

        warehouse.Name = name;
        warehouse.Address = address;

        await _context.SaveChangesAsync();

        return Success(warehouse);
    }

    public async Task<WarehouseOperationResult<WarehouseResponse>> ChangeStatusAsync(
        Guid id,
        ChangeWarehouseStatusRequest request)
    {
        Warehouse? warehouse =
            await _context.Warehouses.FindAsync(id);

        if (warehouse is null)
        {
            return new WarehouseOperationResult<WarehouseResponse>
            {
                Status = WarehouseOperationStatus.NotFound
            };
        }

        warehouse.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        return Success(warehouse);
    }

    private static WarehouseOperationResult<WarehouseResponse> Success(
        Warehouse warehouse)
    {
        return new WarehouseOperationResult<WarehouseResponse>
        {
            Status = WarehouseOperationStatus.Success,
            Data = new WarehouseResponse
            {
                Id = warehouse.Id,
                Name = warehouse.Name,
                Code = warehouse.Code,
                Address = warehouse.Address,
                CreatedAt = warehouse.CreatedAt,
                IsActive = warehouse.IsActive
            }
        };
    }
}