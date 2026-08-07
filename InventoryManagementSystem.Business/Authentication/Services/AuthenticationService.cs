using InventoryManagementSystem.Business.Authentication.DTOs;
using InventoryManagementSystem.DataAccess.Identity;
using Microsoft.AspNetCore.Identity;

namespace InventoryManagementSystem.Business.Authentication.Services;

public class AuthenticationService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly JwtTokenGenerator _jwtTokenGenerator;

    public AuthenticationService(UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,JwtTokenGenerator jwtTokenGenerator)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _jwtTokenGenerator = jwtTokenGenerator;

    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        string normalizedEmail = request.Email.Trim();

        ApplicationUser? user =
            await _userManager.FindByEmailAsync(normalizedEmail);

        if (user is null)
        {
            return null;
        }

        if (!user.IsActive)
        {
            return null;
        }

        SignInResult signInResult =
            await _signInManager.CheckPasswordSignInAsync(
                user,
                request.Password,
                lockoutOnFailure: true);

        if (!signInResult.Succeeded)
        {
            return null;
        }

        IList<string> roles =
            await _userManager.GetRolesAsync(user);

        JwtTokenResult tokenResult =_jwtTokenGenerator.GenerateToken(user,roles.ToArray());

        return new LoginResponse
        {
            AccessToken = tokenResult.AccessToken,
            ExpiresAt = tokenResult.ExpiresAt,
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email!,
            Roles = roles.ToArray()
        };
    }
}