using InventoryManagementSystem.Business.DTOs.WarehouseAssignment;
using InventoryManagementSystem.Business.WarehouseAssignments.DTOs;
using InventoryManagementSystem.DataAccess.Entities; 
using InventoryManagementSystem.DataAccess.Identity;
using InventoryManagementSystem.DataAccess.Persistence; 
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.WarehouseAssignments.Services;

public class WarehouseAssignmentService : IWarehouseAssignmentService
{
    private readonly InventoryDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public WarehouseAssignmentService(InventoryDbContext context, UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public async Task<WarehouseAssignmentOperationResult<WarehouseAssignmentResponse>> CreateAsync(CreateWarehouseAssignmentRequest request)
    {
        // 1. Validate Identity User exists and is active
        var user = await _userManager.FindByIdAsync(request.UserId);
        if (user == null || !user.IsActive)
        {
            return new WarehouseAssignmentOperationResult<WarehouseAssignmentResponse>
            {
                Status = WarehouseAssignmentOperationStatus.UserNotFound
            };
        }

        // 2. Validate Warehouse exists and is active
        var warehouseExists = await _context.Warehouses
            .AsNoTracking()
            .AnyAsync(w => w.Id == request.WarehouseId && w.IsActive);

        if (!warehouseExists)
        {
            return new WarehouseAssignmentOperationResult<WarehouseAssignmentResponse>
            {
                Status = WarehouseAssignmentOperationStatus.WarehouseNotFound
            };
        }

        // 3. Check for Duplicate Assignment (same UserId + WarehouseId)
        bool isDuplicate = await _context.WarehouseAssignments
            .AnyAsync(wa => wa.UserId == request.UserId && wa.WarehouseId == request.WarehouseId);

        if (isDuplicate)
        {
            return new WarehouseAssignmentOperationResult<WarehouseAssignmentResponse>
            {
                Status = WarehouseAssignmentOperationStatus.DuplicateAssignment
            };
        }

        // 4. Map DTO to Entity and Save
        var assignment = new WarehouseAssignment
        {
            UserId = request.UserId,
            WarehouseId = request.WarehouseId,
            Role = request.Role,
            IsActive = true
        };

        _context.WarehouseAssignments.Add(assignment);
        await _context.SaveChangesAsync();

        // 5. Map Entity back to Response DTO
        var response = new WarehouseAssignmentResponse
        {
            Id = assignment.Id,
            UserId = assignment.UserId,
            WarehouseId = assignment.WarehouseId,
            Role = assignment.Role,
            AssignedAt = assignment.AssignedAt,
            IsActive = assignment.IsActive
        };

        return new WarehouseAssignmentOperationResult<WarehouseAssignmentResponse>
        {
            Status = WarehouseAssignmentOperationStatus.Success,
            Data = response
        };


    }
    public async Task<IReadOnlyCollection<WarehouseAssignmentResponse>> GetAllAsync()
    {
        return await _context.WarehouseAssignments
            .AsNoTracking()
            .OrderByDescending(wa => wa.AssignedAt)
           .Select(wa => new WarehouseAssignmentResponse
           {
               Id = wa.Id,
               UserId = wa.UserId,
               WarehouseId = wa.WarehouseId,
               Role = wa.Role, 
               AssignedAt = wa.AssignedAt,
               IsActive = wa.IsActive
           })
            .ToListAsync();
    }

    public async Task<WarehouseAssignmentResponse?> GetByIdAsync(Guid id)
    {
        return await _context.WarehouseAssignments
            .AsNoTracking()
            .Where(wa => wa.Id == id)
           .Select(wa => new WarehouseAssignmentResponse
           {
               Id = wa.Id,
               UserId = wa.UserId,
               WarehouseId = wa.WarehouseId,
               Role = wa.Role,
               AssignedAt = wa.AssignedAt,
               IsActive = wa.IsActive
           })
            .FirstOrDefaultAsync();
    }

    public async Task<IReadOnlyCollection<WarehouseAssignmentResponse>> GetByUserIdAsync(string userId)
    {
        return await _context.WarehouseAssignments
            .AsNoTracking()
            .Where(wa => wa.UserId == userId)
            .OrderByDescending(wa => wa.AssignedAt)
            .Select(wa => new WarehouseAssignmentResponse
            {
                Id = wa.Id,
                UserId = wa.UserId,
                WarehouseId = wa.WarehouseId,
                Role = wa.Role,
                AssignedAt = wa.AssignedAt,
                IsActive = wa.IsActive
            })
            .ToListAsync();
    }
    public async Task<IReadOnlyCollection<WarehouseAssignmentResponse>> GetByWarehouseIdAsync(Guid warehouseId)
    {
        return await _context.WarehouseAssignments
            .AsNoTracking()
            .Where(wa => wa.WarehouseId == warehouseId)
            .OrderByDescending(wa => wa.AssignedAt)
            .Select(wa => new WarehouseAssignmentResponse
            {
                Id = wa.Id,
                UserId = wa.UserId,
                WarehouseId = wa.WarehouseId,
                Role = wa.Role,
                AssignedAt = wa.AssignedAt,
                IsActive = wa.IsActive
            })
            .ToListAsync();
    }

    public async Task<WarehouseAssignmentOperationResult<WarehouseAssignmentResponse>> ChangeStatusAsync(Guid id, ChangeWarehouseAssignmentStatusRequest request)
    {
        WarehouseAssignment? assignment = await _context.WarehouseAssignments.FindAsync(id);

        if (assignment is null)
        {
            return new WarehouseAssignmentOperationResult<WarehouseAssignmentResponse>
            {
                Status = WarehouseAssignmentOperationStatus.NotFound
            };
        }

        assignment.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        WarehouseAssignmentResponse? response = await GetByIdAsync(assignment.Id);

        return new WarehouseAssignmentOperationResult<WarehouseAssignmentResponse>
        {
            Status = WarehouseAssignmentOperationStatus.Success,
            Data = response
        };
    }
    public async Task<WarehouseAssignmentOperationResult<WarehouseAssignmentResponse>> ChangeRoleAsync(Guid id, ChangeWarehouseAssignmentRoleRequest request)
    {
        WarehouseAssignment? assignment = await _context.WarehouseAssignments.FindAsync(id);

        if (assignment is null)
        {
            return new WarehouseAssignmentOperationResult<WarehouseAssignmentResponse>
            {
                Status = WarehouseAssignmentOperationStatus.NotFound
            };
        }

        // Update only the role
        assignment.Role = request.Role;

        await _context.SaveChangesAsync();

        // Fetch the mapped DTO to return
        WarehouseAssignmentResponse? response = await GetByIdAsync(assignment.Id);

        return new WarehouseAssignmentOperationResult<WarehouseAssignmentResponse>
        {
            Status = WarehouseAssignmentOperationStatus.Success,
            Data = response
        };
    }
}