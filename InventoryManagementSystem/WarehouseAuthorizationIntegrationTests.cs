using System.Net;
using System.Net.Http.Json;
using InventoryManagementSystem.Business.StockMovements.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace InventoryManagementSystem.IntegrationTests;

public class WarehouseAuthorizationIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    // 7 Distinct Test Personas as specified in testing requirements
    public const string AdminUserId = "user-global-admin";
    public const string EmployeeWhAUserId = "user-emp-wh-a";
    public const string SupervisorWhAUserId = "user-sup-wh-a";
    public const string ManagerWhAUserId = "user-mgr-wh-a";
    public const string EmployeeWhBUserId = "user-emp-wh-b";
    public const string UnassignedUserId = "user-unassigned";
    public const string InactiveAssignmentUserId = "user-inactive-assignment";

    public WarehouseAuthorizationIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private record TestContextData(
        Guid ProductId,
        Guid WarehouseAId,
        Guid WarehouseBId);

    private async Task<TestContextData> SeedAuthorizationEnvironmentAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();

        var catId = Guid.NewGuid();
        db.Categories.Add(new Category { Id = catId, Name = "Auth Category " + Guid.NewGuid().ToString("N")[..6], IsActive = true });

        var uomId = Guid.NewGuid();
        db.UnitOfMeasures.Add(new UnitOfMeasure { Id = uomId, Name = "Piece", Code = "p" + Guid.NewGuid().ToString("N")[..4], IsActive = true });

        var prodId = Guid.NewGuid();
        db.Products.Add(new Product
        {
            Id = prodId,
            Name = "Auth Protected Phone",
            Sku = "AUTH-SKU-" + Guid.NewGuid().ToString("N")[..6],
            CategoryId = catId,
            UnitOfMeasureId = uomId,
            IsActive = true
        });

        var whAId = Guid.NewGuid();
        db.Warehouses.Add(new Warehouse
        {
            Id = whAId,
            Name = "Facility Alpha",
            Code = "WHA-" + Guid.NewGuid().ToString("N")[..4],
            Address = "100 Alpha Blvd",
            IsActive = true,
            CanAcceptAllCategories = true
        });

        var whBId = Guid.NewGuid();
        db.Warehouses.Add(new Warehouse
        {
            Id = whBId,
            Name = "Facility Beta",
            Code = "WHB-" + Guid.NewGuid().ToString("N")[..4],
            Address = "200 Beta St",
            IsActive = true,
            CanAcceptAllCategories = true
        });

        // Seed Warehouse Assignments for the test personas
        // 1. Employee on Warehouse A
        db.WarehouseAssignments.Add(new WarehouseAssignment
        {
            Id = Guid.NewGuid(),
            UserId = EmployeeWhAUserId,
            WarehouseId = whAId,
            Role = WarehouseAssignmentRole.Employee,
            IsActive = true
        });

        // 2. Supervisor on Warehouse A
        db.WarehouseAssignments.Add(new WarehouseAssignment
        {
            Id = Guid.NewGuid(),
            UserId = SupervisorWhAUserId,
            WarehouseId = whAId,
            Role = WarehouseAssignmentRole.Supervisor,
            IsActive = true
        });

        // 3. Manager on Warehouse A
        db.WarehouseAssignments.Add(new WarehouseAssignment
        {
            Id = Guid.NewGuid(),
            UserId = ManagerWhAUserId,
            WarehouseId = whAId,
            Role = WarehouseAssignmentRole.Manager,
            IsActive = true
        });

        // 4. Employee on Warehouse B
        db.WarehouseAssignments.Add(new WarehouseAssignment
        {
            Id = Guid.NewGuid(),
            UserId = EmployeeWhBUserId,
            WarehouseId = whBId,
            Role = WarehouseAssignmentRole.Employee,
            IsActive = true
        });

        // 5. Inactive assignment user on Warehouse A (Role is Supervisor, but IsActive is false)
        db.WarehouseAssignments.Add(new WarehouseAssignment
        {
            Id = Guid.NewGuid(),
            UserId = InactiveAssignmentUserId,
            WarehouseId = whAId,
            Role = WarehouseAssignmentRole.Supervisor,
            IsActive = false
        });

        // 6. Global Admin & Unassigned User have NO rows in WarehouseAssignments

        // Add 100 units initial stock in Warehouse A for transfer/movement testing
        db.StockMovements.Add(new StockMovement
        {
            Id = Guid.NewGuid(),
            WarehouseId = whAId,
            ProductId = prodId,
            Quantity = 100m,
            Type = StockMovementType.Purchase,
            CreatedByUserId = AdminUserId,
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync();
        return new TestContextData(prodId, whAId, whBId);
    }

    [Fact]
    public async Task Req1_UnassignedUser_CannotAccessAssignedWarehouse_ReturnsForbidden()
    {
        // ARRANGE: Unassigned user attempting to access Warehouse A
        var env = await SeedAuthorizationEnvironmentAsync();
        var client = _factory.CreateUserClient(UnassignedUserId, role: "User");

        // ACT
        var response = await client.GetAsync($"/api/warehouses/{env.WarehouseAId}/stock-movements/products/{env.ProductId}/current-stock");

        // ASSERT: 403 Forbidden
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Req1_AssignedEmployee_CanAccessOwnWarehouse_ReturnsOk()
    {
        // ARRANGE: Employee on Warehouse A accessing Warehouse A
        var env = await SeedAuthorizationEnvironmentAsync();
        var client = _factory.CreateUserClient(EmployeeWhAUserId, role: "User");

        // ACT
        var response = await client.GetAsync($"/api/warehouses/{env.WarehouseAId}/stock-movements/products/{env.ProductId}/current-stock");

        // ASSERT: 200 OK
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var stock = await response.Content.ReadFromJsonAsync<decimal>();
        Assert.Equal(100m, stock);
    }

    [Fact]
    public async Task Req2_UserAssignedToWarehouseA_CannotAccessWarehouseB_ReturnsForbidden()
    {
        // ARRANGE: User assigned to Warehouse A tries to access Warehouse B
        var env = await SeedAuthorizationEnvironmentAsync();
        var client = _factory.CreateUserClient(EmployeeWhAUserId, role: "User");

        // ACT
        var response = await client.GetAsync($"/api/warehouses/{env.WarehouseBId}/stock-movements/products/{env.ProductId}/current-stock");

        // ASSERT: 403 Forbidden
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Req2_EmployeeWarehouseB_CanAccessWarehouseB_ReturnsOk()
    {
        // ARRANGE: Employee assigned to Warehouse B accessing Warehouse B
        var env = await SeedAuthorizationEnvironmentAsync();
        var client = _factory.CreateUserClient(EmployeeWhBUserId, role: "User");

        // ACT
        var response = await client.GetAsync($"/api/warehouses/{env.WarehouseBId}/stock-movements/products/{env.ProductId}/current-stock");

        // ASSERT: 200 OK
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Req3_InactiveAssignment_DoesNotGrantAccess_ReturnsForbidden()
    {
        // ARRANGE: User has Supervisor role assigned in Warehouse A, but IsActive = false
        var env = await SeedAuthorizationEnvironmentAsync();
        var client = _factory.CreateUserClient(InactiveAssignmentUserId, role: "User");

        // ACT: Attempt to read stock
        var response = await client.GetAsync($"/api/warehouses/{env.WarehouseAId}/stock-movements/products/{env.ProductId}/current-stock");

        // ASSERT: 403 Forbidden
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Req4_UnauthenticatedUser_IsRejectedWithUnauthorized()
    {
        // ARRANGE: Client with unauthenticated header simulation
        var env = await SeedAuthorizationEnvironmentAsync();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.UnauthenticatedHeader, "true");

        // ACT
        var response = await client.GetAsync($"/api/warehouses/{env.WarehouseAId}/stock-movements/products/{env.ProductId}/current-stock");

        // ASSERT: 401 Unauthorized
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Req5_RouteTampering_CannotBypassWarehouseAuthorization()
    {
        // ARRANGE: Supervisor of Warehouse A tries to record a movement targeting Warehouse B in the request body
        var env = await SeedAuthorizationEnvironmentAsync();
        var client = _factory.CreateUserClient(SupervisorWhAUserId, role: "User");

        var payload = new RecordMovementRequest
        {
            WarehouseId = env.WarehouseBId, // Intentionally malicious Warehouse B in body!
            ProductId = env.ProductId,
            Quantity = 15m,
            Type = StockMovementType.Purchase
        };

        // ACT: Calling Warehouse A route
        var response = await client.PostAsJsonAsync($"/api/warehouses/{env.WarehouseAId}/stock-movements", payload);

        // ASSERT: Must succeed for Warehouse A because controller forcibly overrides body with route parameter
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        // DATABASE ASSERTION: Verify that Warehouse B was NOT modified and Warehouse A received the stock
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();

        bool whBHasMovements = await db.StockMovements.AnyAsync(sm => sm.WarehouseId == env.WarehouseBId);
        Assert.False(whBHasMovements, "CRITICAL: Malicious body parameter must NOT inject movement into unassigned Warehouse B!");

        var createdMovement = await db.StockMovements
            .FirstOrDefaultAsync(sm => sm.WarehouseId == env.WarehouseAId && sm.Quantity == 15m);
        Assert.NotNull(createdMovement);
        Assert.Equal(env.WarehouseAId, createdMovement.WarehouseId);
    }

    [Fact]
    public async Task Req6_RoleRequirements_EnforcedOnBackend_EmployeeCannotRecordMovements()
    {
        // ARRANGE: Employee on Warehouse A has permission to read, but NOT to record movements (requires Supervisor)
        var env = await SeedAuthorizationEnvironmentAsync();
        var client = _factory.CreateUserClient(EmployeeWhAUserId, role: "User");

        var payload = new RecordMovementRequest
        {
            WarehouseId = env.WarehouseAId,
            ProductId = env.ProductId,
            Quantity = 5m,
            Type = StockMovementType.Purchase
        };

        // ACT: Employee attempts to execute movement
        var postResponse = await client.PostAsJsonAsync($"/api/warehouses/{env.WarehouseAId}/stock-movements", payload);

        // ASSERT: Backend rejects with 403 Forbidden
        Assert.Equal(HttpStatusCode.Forbidden, postResponse.StatusCode);

        // ACT: Employee attempts to execute transfer
        var transferPayload = new TransferStockRequest
        {
            ProductId = env.ProductId,
            DestinationWarehouseId = env.WarehouseBId,
            Quantity = 5m
        };
        var transferResponse = await client.PostAsJsonAsync($"/api/warehouses/{env.WarehouseAId}/stock-movements/transfers", transferPayload);

        // ASSERT: Backend rejects with 403 Forbidden
        Assert.Equal(HttpStatusCode.Forbidden, transferResponse.StatusCode);
    }

    [Fact]
    public async Task Req6_SupervisorAndManager_CanExecuteMovementsAndTransfers()
    {
        // ARRANGE
        var env = await SeedAuthorizationEnvironmentAsync();
        var supClient = _factory.CreateUserClient(SupervisorWhAUserId, role: "User");
        var mgrClient = _factory.CreateUserClient(ManagerWhAUserId, role: "User");

        // ACT 1: Supervisor creates movement in WH A
        var supMoveResponse = await supClient.PostAsJsonAsync($"/api/warehouses/{env.WarehouseAId}/stock-movements", new RecordMovementRequest
        {
            ProductId = env.ProductId,
            WarehouseId = env.WarehouseAId,
            Quantity = 10m,
            Type = StockMovementType.Purchase
        });
        Assert.Equal(HttpStatusCode.Created, supMoveResponse.StatusCode);

        // ACT 2: Manager creates movement in WH A
        var mgrMoveResponse = await mgrClient.PostAsJsonAsync($"/api/warehouses/{env.WarehouseAId}/stock-movements", new RecordMovementRequest
        {
            ProductId = env.ProductId,
            WarehouseId = env.WarehouseAId,
            Quantity = 10m,
            Type = StockMovementType.Purchase
        });
        Assert.Equal(HttpStatusCode.Created, mgrMoveResponse.StatusCode);

        // ACT 3: Supervisor executes transfer from WH A to WH B
        var transferResponse = await supClient.PostAsJsonAsync($"/api/warehouses/{env.WarehouseAId}/stock-movements/transfers", new TransferStockRequest
        {
            ProductId = env.ProductId,
            DestinationWarehouseId = env.WarehouseBId,
            Quantity = 10m
        });
        Assert.Equal(HttpStatusCode.OK, transferResponse.StatusCode);
    }

    [Fact]
    public async Task Req7_AdminRetainsGlobalAccess_ToAllWarehousesWithoutAssignment()
    {
        // ARRANGE: Global Admin has NO warehouse assignments in DB
        var env = await SeedAuthorizationEnvironmentAsync();
        var adminClient = _factory.CreateUserClient(AdminUserId, role: "Admin");

        // ACT 1: Access Warehouse A stock
        var responseA = await adminClient.GetAsync($"/api/warehouses/{env.WarehouseAId}/stock-movements/products/{env.ProductId}/current-stock");
        Assert.Equal(HttpStatusCode.OK, responseA.StatusCode);

        // ACT 2: Access Warehouse B stock
        var responseB = await adminClient.GetAsync($"/api/warehouses/{env.WarehouseBId}/stock-movements/products/{env.ProductId}/current-stock");
        Assert.Equal(HttpStatusCode.OK, responseB.StatusCode);

        // ACT 3: Record movement in Warehouse A
        var moveA = await adminClient.PostAsJsonAsync($"/api/warehouses/{env.WarehouseAId}/stock-movements", new RecordMovementRequest
        {
            ProductId = env.ProductId,
            WarehouseId = env.WarehouseAId,
            Quantity = 5m,
            Type = StockMovementType.Purchase
        });
        Assert.Equal(HttpStatusCode.Created, moveA.StatusCode);

        // ACT 4: Record movement in Warehouse B
        var moveB = await adminClient.PostAsJsonAsync($"/api/warehouses/{env.WarehouseBId}/stock-movements", new RecordMovementRequest
        {
            ProductId = env.ProductId,
            WarehouseId = env.WarehouseBId,
            Quantity = 5m,
            Type = StockMovementType.Purchase
        });
        Assert.Equal(HttpStatusCode.Created, moveB.StatusCode);
    }

    [Fact]
    public async Task Req8_WarehouseAuthorization_TestedIndependentlyFromGlobalAdmin()
    {
        // ARRANGE: Supervisor WH A (Role: "User", NOT "Admin")
        var env = await SeedAuthorizationEnvironmentAsync();
        var nonAdminClient = _factory.CreateUserClient(SupervisorWhAUserId, role: "User");

        // ACT: Access WH A history
        var allowedHistory = await nonAdminClient.GetAsync($"/api/warehouses/{env.WarehouseAId}/stock-movements/products/{env.ProductId}");
        Assert.Equal(HttpStatusCode.OK, allowedHistory.StatusCode);

        // ACT: Attempt WH B history (fails because assignment is WH A only, proving no Admin bypass occurs)
        var deniedHistory = await nonAdminClient.GetAsync($"/api/warehouses/{env.WarehouseBId}/stock-movements/products/{env.ProductId}");
        Assert.Equal(HttpStatusCode.Forbidden, deniedHistory.StatusCode);
    }
}
