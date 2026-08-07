using Microsoft.AspNetCore.Identity;

namespace InventoryManagementSystem.DataAccess.Identity.Seeding;

public class IdentitySeeder
{
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly UserManager<ApplicationUser> _userManager;

    public IdentitySeeder(
        RoleManager<IdentityRole> roleManager,
        UserManager<ApplicationUser> userManager)
    {
        _roleManager = roleManager;
        _userManager = userManager;
    }

    public async Task SeedAsync(string adminEmail,string adminPassword,string adminFullName)
    {
        await SeedRolesAsync();

        await SeedAdminAsync(
            adminEmail,
            adminPassword,
            adminFullName);
    }

    private async Task SeedRolesAsync()
    {
        string[] roleNames =
        {
            "Admin",
            "WarehouseManager",
            "Employee"
        };

        foreach (string roleName in roleNames)
        {
            bool roleExists =
                await _roleManager.RoleExistsAsync(roleName);

            if (roleExists)
            {
                continue;
            }

            IdentityResult result =
                await _roleManager.CreateAsync(
                    new IdentityRole(roleName));

            if (!result.Succeeded)
            {
                string errors = string.Join(
                    ", ",
                    result.Errors.Select(error => error.Description));

                throw new InvalidOperationException(
                    $"Failed to create role '{roleName}': {errors}");
            }
        }
    }

    private async Task SeedAdminAsync(
        string adminEmail,
        string adminPassword,
        string adminFullName)
    {
        ApplicationUser? adminUser =
            await _userManager.FindByEmailAsync(adminEmail);

        if (adminUser is null)
        {
            adminUser = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                FullName = adminFullName,
                EmailConfirmed = true,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            IdentityResult createResult =
                await _userManager.CreateAsync(
                    adminUser,
                    adminPassword);

            if (!createResult.Succeeded)
            {
                string errors = string.Join(
                    ", ",
                    createResult.Errors.Select(error => error.Description));

                throw new InvalidOperationException(
                    $"Failed to create the initial Admin user: {errors}");
            }
        }

        bool isAdmin =
            await _userManager.IsInRoleAsync(adminUser, "Admin");

        if (isAdmin)
        {
            return;
        }

        IdentityResult roleResult =
            await _userManager.AddToRoleAsync(
                adminUser,
                "Admin");

        if (!roleResult.Succeeded)
        {
            string errors = string.Join(
                ", ",
                roleResult.Errors.Select(error => error.Description));

            throw new InvalidOperationException(
                $"Failed to assign the Admin role: {errors}");
        }
    }
}