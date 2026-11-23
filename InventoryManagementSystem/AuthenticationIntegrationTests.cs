using System.Net;
using System.Net.Http.Json;
using InventoryManagementSystem.Business.Authentication.DTOs;
using InventoryManagementSystem.DataAccess.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace InventoryManagementSystem.IntegrationTests;

public class AuthenticationIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public AuthenticationIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task SeedUserAsync(string email, string password, bool isActive)
    {
        using var scope = _factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        var existingUser = await userManager.FindByEmailAsync(email);
        if (existingUser != null)
        {
            existingUser.IsActive = isActive;
            await userManager.UpdateAsync(existingUser);
            return;
        }

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = "Test " + email,
            EmailConfirmed = true,
            IsActive = isActive,
            CreatedAt = DateTime.UtcNow
        };

        var result = await userManager.CreateAsync(user, password);
        Assert.True(result.Succeeded, string.Join(", ", result.Errors.Select(e => e.Description)));
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsJwtTokenAndSuccess()
    {
        // ARRANGE
        string email = "validuser_" + Guid.NewGuid().ToString("N")[..6] + "@inventory.com";
        string password = "SecurePassword123!";
        await SeedUserAsync(email, password, isActive: true);

        var client = _factory.CreateClient();
        var request = new LoginRequest { Email = email, Password = password };

        // ACT
        var response = await client.PostAsJsonAsync("/api/auth/login", request);

        // ASSERT
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var loginResponse = await response.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.NotNull(loginResponse);
        Assert.False(string.IsNullOrWhiteSpace(loginResponse.AccessToken));
        Assert.Equal(email, loginResponse.Email);
        Assert.True(loginResponse.ExpiresAt > DateTime.UtcNow);
    }

    [Fact]
    public async Task Login_WithInvalidPassword_ReturnsUnauthorized()
    {
        // ARRANGE
        string email = "wrongpass_" + Guid.NewGuid().ToString("N")[..6] + "@inventory.com";
        await SeedUserAsync(email, "CorrectPassword123!", isActive: true);

        var client = _factory.CreateClient();
        var request = new LoginRequest { Email = email, Password = "IncorrectPassword999!" };

        // ACT
        var response = await client.PostAsJsonAsync("/api/auth/login", request);

        // ASSERT
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_WithNonexistentEmail_ReturnsUnauthorized()
    {
        // ARRANGE
        var client = _factory.CreateClient();
        var request = new LoginRequest { Email = "nonexistent_" + Guid.NewGuid().ToString("N") + "@unknown.com", Password = "SomePassword123!" };

        // ACT
        var response = await client.PostAsJsonAsync("/api/auth/login", request);

        // ASSERT
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_WithInactiveUser_ReturnsUnauthorized()
    {
        // ARRANGE: Inactive user (IsActive = false)
        string email = "inactive_" + Guid.NewGuid().ToString("N")[..6] + "@inventory.com";
        string password = "ValidPassword123!";
        await SeedUserAsync(email, password, isActive: false);

        var client = _factory.CreateClient();
        var request = new LoginRequest { Email = email, Password = password };

        // ACT
        var response = await client.PostAsJsonAsync("/api/auth/login", request);

        // ASSERT: Inactive user cannot authenticate
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
