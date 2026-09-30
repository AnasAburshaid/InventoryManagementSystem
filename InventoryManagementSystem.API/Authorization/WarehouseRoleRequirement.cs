using InventoryManagementSystem.DataAccess.Enums;
using Microsoft.AspNetCore.Authorization;

namespace InventoryManagementSystem.API.Authorization;

public class WarehouseRoleRequirement : IAuthorizationRequirement
{
    public WarehouseAssignmentRole MinimumRole { get; }

    public WarehouseRoleRequirement(WarehouseAssignmentRole minimumRole)
    {
        MinimumRole = minimumRole;
    }
}