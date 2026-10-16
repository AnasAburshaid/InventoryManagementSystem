using System.Security.Claims;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.API.Authorization;

public class WarehouseRoleHandler : AuthorizationHandler<WarehouseRoleRequirement>
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly InventoryDbContext _context;

    public WarehouseRoleHandler(IHttpContextAccessor httpContextAccessor, InventoryDbContext context)
    {
        _httpContextAccessor = httpContextAccessor;
        _context = context;
    }

    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, WarehouseRoleRequirement requirement)
    {
        // 0. System Administrators have global access to all warehouses
        if (context.User.IsInRole("Admin") ||
            context.User.HasClaim(ClaimTypes.Role, "Admin") ||
            context.User.HasClaim("role", "Admin"))
        {
            context.Succeed(requirement);
            return;
        }

        // 1. Get the authenticated User's ID from the JWT
        string? userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
                         context.User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userId))
        {
            return;
        }

        HttpContext? httpContext = _httpContextAccessor.HttpContext;
        if (httpContext is null) return;

        // 2. Extract the {warehouseId} from the API Route
        object? routeData = httpContext.GetRouteValue("warehouseId");
        if (routeData is null || !Guid.TryParse(routeData.ToString(), out Guid warehouseId))
        {
            return;
        }

        // 3. Define explicit allowed roles to avoid alphabetical string comparison bugs in SQL
        WarehouseAssignmentRole[] allowedRoles = requirement.MinimumRole switch
        {
            WarehouseAssignmentRole.Employee => new[] { WarehouseAssignmentRole.Employee, WarehouseAssignmentRole.Supervisor, WarehouseAssignmentRole.Manager },
            WarehouseAssignmentRole.Supervisor => new[] { WarehouseAssignmentRole.Supervisor, WarehouseAssignmentRole.Manager },
            WarehouseAssignmentRole.Manager => new[] { WarehouseAssignmentRole.Manager },
            _ => Array.Empty<WarehouseAssignmentRole>()
        };

        // 4. Query the DB to ensure the user has the required role for THIS warehouse
        bool hasAccess = await _context.WarehouseAssignments
            .AsNoTracking()
            .AnyAsync(wa => wa.UserId == userId
                         && wa.WarehouseId == warehouseId
                         && wa.IsActive
                         && allowedRoles.Contains(wa.Role));

        if (hasAccess)
        {
            context.Succeed(requirement);
        }
    }
}