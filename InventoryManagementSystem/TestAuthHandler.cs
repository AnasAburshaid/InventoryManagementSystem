using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace InventoryManagementSystem.IntegrationTests;

public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string DefaultUserId = "test-admin-id";
    public const string UserIdHeader = "X-Test-UserId";
    public const string RoleHeader = "X-Test-Role";
    public const string UnauthenticatedHeader = "X-Test-Unauthenticated";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder) : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // 1. Simulate unauthenticated user if header requested
        if (Request.Headers.TryGetValue(UnauthenticatedHeader, out var unauth) &&
            string.Equals(unauth.ToString(), "true", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(AuthenticateResult.Fail("Unauthenticated request simulation."));
        }

        // 2. Extract UserId from header or fallback to DefaultUserId
        string userId = Request.Headers.TryGetValue(UserIdHeader, out var uidHeader) && !string.IsNullOrWhiteSpace(uidHeader)
            ? uidHeader.ToString()
            : DefaultUserId;

        // 3. Extract Role from header: default to Admin if not explicitly specified (backward compatibility)
        string role = Request.Headers.TryGetValue(RoleHeader, out var roleHeader)
            ? roleHeader.ToString()
            : "Admin";

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim("sub", userId),
            new Claim(ClaimTypes.Name, $"Test User {userId}")
        };

        // Assign Admin role claim only when requested or defaulted
        if (string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            claims.Add(new Claim(ClaimTypes.Role, "Admin"));
            claims.Add(new Claim("role", "Admin"));
        }
        else if (!string.IsNullOrWhiteSpace(role) &&
                 !string.Equals(role, "User", StringComparison.OrdinalIgnoreCase) &&
                 !string.Equals(role, "None", StringComparison.OrdinalIgnoreCase))
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
            claims.Add(new Claim("role", role));
        }

        var identity = new ClaimsIdentity(claims, "TestScheme");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "TestScheme");

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
