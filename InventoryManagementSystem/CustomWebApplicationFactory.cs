using System.Net.Http.Headers;
using InventoryManagementSystem.DataAccess.Identity;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace InventoryManagementSystem.IntegrationTests;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _inventoryDbName = "InMemoryInventoryTestDb_" + Guid.NewGuid().ToString("N");
    private readonly string _identityDbName = "InMemoryIdentityTestDb_" + Guid.NewGuid().ToString("N");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // 1. Remove SQL Server DbContext registrations
            ServiceDescriptor? inventoryDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<InventoryDbContext>));
            if (inventoryDescriptor != null)
            {
                services.Remove(inventoryDescriptor);
            }

            ServiceDescriptor? identityDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<ApplicationIdentityDbContext>));
            if (identityDescriptor != null)
            {
                services.Remove(identityDescriptor);
            }

            // 2. Inject isolated In-Memory Databases per factory instance
            services.AddDbContext<InventoryDbContext>(options =>
            {
                options.UseInMemoryDatabase(_inventoryDbName)
                       .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning));
            });

            services.AddDbContext<ApplicationIdentityDbContext>(options =>
            {
                options.UseInMemoryDatabase(_identityDbName)
                       .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning));
            });

            // 3. Inject Mock Authentication
            services.AddAuthentication("TestScheme")
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("TestScheme", options => { });

            // Force ASP.NET to use TestScheme as default
            services.Configure<Microsoft.AspNetCore.Authentication.AuthenticationOptions>(options =>
            {
                options.DefaultAuthenticateScheme = "TestScheme";
                options.DefaultChallengeScheme = "TestScheme";
            });

            // 4. Ensure schemas are created in memory before tests run
            ServiceProvider sp = services.BuildServiceProvider();
            using IServiceScope scope = sp.CreateScope();
            InventoryDbContext db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();
            db.Database.EnsureCreated();

            ApplicationIdentityDbContext identityDb = scope.ServiceProvider.GetRequiredService<ApplicationIdentityDbContext>();
            identityDb.Database.EnsureCreated();
        });
    }

    /// <summary>
    /// Factory helper to create an HttpClient authenticated with a specific test persona.
    /// </summary>
    public HttpClient CreateUserClient(string userId, string role = "User")
    {
        HttpClient client = CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestScheme");
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserIdHeader, userId);
        client.DefaultRequestHeaders.Add(TestAuthHandler.RoleHeader, role);
        return client;
    }
}
