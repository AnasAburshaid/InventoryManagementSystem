using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.Analytics.DTOs;
using InventoryManagementSystem.Business.AuditLogs.DTOs;
using InventoryManagementSystem.Business.StockMovements.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace InventoryManagementSystem.IntegrationTests;

public class AuditLogIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public AuditLogIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private record TestAuditEnvironment(
        Guid WarehouseId,
        Guid ProductId,
        string AdminUserId,
        string SupervisorUserId,
        string UnauthorizedUserId);

    private async Task<TestAuditEnvironment> SeedAuditEnvironmentAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();

        var catId = Guid.NewGuid();
        db.Categories.Add(new Category { Id = catId, Name = "Audit Cat " + Guid.NewGuid().ToString("N")[..6], IsActive = true });

        var uomId = Guid.NewGuid();
        db.UnitOfMeasures.Add(new UnitOfMeasure { Id = uomId, Name = "Audit UOM " + Guid.NewGuid().ToString("N")[..6], Code = "a" + Guid.NewGuid().ToString("N")[..3], IsActive = true });

        var prodId = Guid.NewGuid();
        db.Products.Add(new Product
        {
            Id = prodId,
            Name = "Auditable Device",
            Sku = "AUD-SKU-" + Guid.NewGuid().ToString("N")[..6],
            CategoryId = catId,
            UnitOfMeasureId = uomId,
            IsActive = true
        });

        var whId = Guid.NewGuid();
        db.Warehouses.Add(new Warehouse
        {
            Id = whId,
            Name = "Audit Depot",
            Code = "AD-" + Guid.NewGuid().ToString("N")[..4],
            Address = "789 Log Lane",
            IsActive = true,
            CanAcceptAllCategories = true
        });

        string adminUserId = "audit-admin-" + Guid.NewGuid().ToString("N")[..6];
        string supUserId = "audit-sup-" + Guid.NewGuid().ToString("N")[..6];
        string unauthUserId = "audit-unauth-" + Guid.NewGuid().ToString("N")[..6];

        db.WarehouseAssignments.Add(new WarehouseAssignment
        {
            Id = Guid.NewGuid(),
            UserId = supUserId,
            WarehouseId = whId,
            Role = WarehouseAssignmentRole.Supervisor,
            IsActive = true
        });

        await db.SaveChangesAsync();

        return new TestAuditEnvironment(whId, prodId, adminUserId, supUserId, unauthUserId);
    }

    [Fact]
    public async Task AuditTrail_CapturesStockMovements_AndAllowsAdminQuery()
    {
        var env = await SeedAuditEnvironmentAsync();
        var supClient = _factory.CreateUserClient(env.SupervisorUserId, "User");
        var adminClient = _factory.CreateUserClient(env.AdminUserId, "Admin");

        // 1. Perform a stock adjustment movement
        var moveReq = new RecordMovementRequest
        {
            WarehouseId = env.WarehouseId,
            ProductId = env.ProductId,
            Quantity = 25m,
            Type = StockMovementType.AdjustmentIn,
            ReferenceType = "AuditTest",
            ReferenceId = "AUDIT-REF-01"
        };

        var moveResp = await supClient.PostAsJsonAsync($"/api/warehouses/{env.WarehouseId}/stock-movements", moveReq);
        Assert.Equal(HttpStatusCode.Created, moveResp.StatusCode);

        // 2. Query audit logs via Admin client
        var logResp = await adminClient.GetAsync($"/api/audit-logs?warehouseId={env.WarehouseId}&action=RecordStockMovement");
        Assert.Equal(HttpStatusCode.OK, logResp.StatusCode);

        var pagedLogs = await logResp.Content.ReadFromJsonAsync<PagedResult<AuditLogResponse>>(JsonOptions);
        Assert.NotNull(pagedLogs);
        Assert.NotEmpty(pagedLogs.Items);

        var log = pagedLogs.Items.First();
        Assert.Equal("RecordStockMovement", log.Action);
        Assert.Equal("StockMovement", log.EntityName);
        Assert.Equal(env.WarehouseId, log.WarehouseId);
        Assert.Contains(env.ProductId.ToString(), log.Details ?? string.Empty);
    }

    [Fact]
    public async Task AuditTrail_UnauthorizedUserCannotQueryAuditLogs()
    {
        var env = await SeedAuditEnvironmentAsync();
        var unauthClient = _factory.CreateUserClient(env.UnauthorizedUserId, "User");

        var response = await unauthClient.GetAsync($"/api/audit-logs?warehouseId={env.WarehouseId}");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AuditTrail_SupervisorCanQueryOwnWarehouseLogs()
    {
        var env = await SeedAuditEnvironmentAsync();
        var supClient = _factory.CreateUserClient(env.SupervisorUserId, "User");

        var response = await supClient.GetAsync($"/api/audit-logs?warehouseId={env.WarehouseId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var pagedLogs = await response.Content.ReadFromJsonAsync<PagedResult<AuditLogResponse>>(JsonOptions);
        Assert.NotNull(pagedLogs);
    }

    [Fact]
    public async Task AuditTrail_SupervisorQueriesWithoutWarehouseFilter_ReturnsOnlyTheirPermittedWarehouses()
    {
        // Regression test: Verifies that when a supervisor queries /api/audit-logs without an explicit warehouse filter,
        // it correctly filters to their allowed warehouses rather than failing or returning empty/forbidden.
        var env = await SeedAuditEnvironmentAsync();
        var supClient = _factory.CreateUserClient(env.SupervisorUserId, "User");

        var response = await supClient.GetAsync("/api/audit-logs");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var pagedLogs = await response.Content.ReadFromJsonAsync<PagedResult<AuditLogResponse>>(JsonOptions);
        Assert.NotNull(pagedLogs);
        // All returned records must belong to supervisor's assigned warehouse
        Assert.All(pagedLogs.Items, item => Assert.Equal(env.WarehouseId, item.WarehouseId));
    }

    [Fact]
    public async Task AuditTrail_InactiveAssignment_CannotQueryAuditLogs()
    {
        // Regression test: Inactive assignment must not grant access to audit trail
        var env = await SeedAuditEnvironmentAsync();
        string inactiveUserId = "inactive-sup-" + Guid.NewGuid().ToString("N")[..6];

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();
            db.WarehouseAssignments.Add(new WarehouseAssignment
            {
                Id = Guid.NewGuid(),
                UserId = inactiveUserId,
                WarehouseId = env.WarehouseId,
                Role = WarehouseAssignmentRole.Supervisor,
                IsActive = false // Inactive
            });
            await db.SaveChangesAsync();
        }

        var inactiveClient = _factory.CreateUserClient(inactiveUserId, "User");
        var response = await inactiveClient.GetAsync($"/api/audit-logs?warehouseId={env.WarehouseId}");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
