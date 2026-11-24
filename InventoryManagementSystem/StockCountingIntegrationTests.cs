using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.StockCounting.DTOs;
using InventoryManagementSystem.Business.StockMovements.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace InventoryManagementSystem.IntegrationTests;

public class StockCountingIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public StockCountingIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private record TestCountEnvironment(
        Guid WarehouseId,
        Guid ProductId,
        string EmployeeUserId,
        string SupervisorUserId,
        string UnassignedUserId);

    private async Task<TestCountEnvironment> SeedCountEnvironmentAsync(decimal initialStock = 20m)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();

        var catId = Guid.NewGuid();
        db.Categories.Add(new Category { Id = catId, Name = "Count Cat " + Guid.NewGuid().ToString("N")[..6], IsActive = true });

        var uomId = Guid.NewGuid();
        db.UnitOfMeasures.Add(new UnitOfMeasure { Id = uomId, Name = "Count UOM " + Guid.NewGuid().ToString("N")[..6], Code = "c" + Guid.NewGuid().ToString("N")[..3], IsActive = true });

        var prodId = Guid.NewGuid();
        db.Products.Add(new Product
        {
            Id = prodId,
            Name = "Countable Product",
            Sku = "CNT-SKU-" + Guid.NewGuid().ToString("N")[..6],
            CategoryId = catId,
            UnitOfMeasureId = uomId,
            IsActive = true
        });

        var whId = Guid.NewGuid();
        db.Warehouses.Add(new Warehouse
        {
            Id = whId,
            Name = "Count Warehouse",
            Code = "CWH-" + Guid.NewGuid().ToString("N")[..4],
            Address = "123 Count St",
            IsActive = true,
            CanAcceptAllCategories = true
        });

        string empUserId = "count-emp-" + Guid.NewGuid().ToString("N")[..6];
        string supUserId = "count-sup-" + Guid.NewGuid().ToString("N")[..6];
        string unassignedUserId = "count-unassigned-" + Guid.NewGuid().ToString("N")[..6];

        db.WarehouseAssignments.Add(new WarehouseAssignment
        {
            Id = Guid.NewGuid(),
            UserId = empUserId,
            WarehouseId = whId,
            Role = WarehouseAssignmentRole.Employee,
            IsActive = true
        });

        db.WarehouseAssignments.Add(new WarehouseAssignment
        {
            Id = Guid.NewGuid(),
            UserId = supUserId,
            WarehouseId = whId,
            Role = WarehouseAssignmentRole.Supervisor,
            IsActive = true
        });

        // Seed initial stock ledger entry
        if (initialStock > 0m)
        {
            db.StockMovements.Add(new StockMovement
            {
                Id = Guid.NewGuid(),
                WarehouseId = whId,
                ProductId = prodId,
                Quantity = initialStock,
                Type = StockMovementType.Purchase,
                ReferenceType = "InitialStock",
                ReferenceId = "INIT-001",
                CreatedByUserId = "test-seeder",
                CreatedAt = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync();

        return new TestCountEnvironment(whId, prodId, empUserId, supUserId, unassignedUserId);
    }

    [Fact]
    public async Task CreateSession_AuthorizedEmployee_CreatesSessionWithAccurateSnapshot()
    {
        var env = await SeedCountEnvironmentAsync(initialStock: 35m);
        var client = _factory.CreateUserClient(env.EmployeeUserId, "User");

        var request = new CreateStockCountSessionRequest
        {
            WarehouseId = env.WarehouseId,
            CountType = StockCountType.SelectedProducts,
            ProductIds = new List<Guid> { env.ProductId },
            Notes = "Bi-weekly inventory verification"
        };

        var response = await client.PostAsJsonAsync($"/api/warehouses/{env.WarehouseId}/stock-counts", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var session = await response.Content.ReadFromJsonAsync<StockCountSessionResponse>(JsonOptions);
        Assert.NotNull(session);
        Assert.StartsWith("CNT-", session.SessionNumber);
        Assert.Equal(StockCountStatus.Draft, session.Status);
        Assert.Single(session.Items);

        var item = session.Items.First();
        Assert.Equal(env.ProductId, item.ProductId);
        Assert.Equal(35m, item.SystemQuantity);
        Assert.Null(item.CountedQuantity);
        Assert.Null(item.DiscrepancyQuantity);
    }

    [Fact]
    public async Task RecordCounts_UpdatesDiscrepancyAndItemQuantities()
    {
        var env = await SeedCountEnvironmentAsync(initialStock: 50m);
        var client = _factory.CreateUserClient(env.EmployeeUserId, "User");

        var createReq = new CreateStockCountSessionRequest
        {
            WarehouseId = env.WarehouseId,
            CountType = StockCountType.SelectedProducts,
            ProductIds = new List<Guid> { env.ProductId }
        };
        var createResp = await client.PostAsJsonAsync($"/api/warehouses/{env.WarehouseId}/stock-counts", createReq);
        var session = await createResp.Content.ReadFromJsonAsync<StockCountSessionResponse>(JsonOptions);
        Assert.NotNull(session);

        // Record 42 units physically counted (shortage of 8)
        var recordReq = new RecordStockCountItemsRequest
        {
            Items = new List<RecordStockCountItemDto>
            {
                new() { ProductId = env.ProductId, CountedQuantity = 42m, Notes = "Damaged packaging discarded" }
            }
        };

        var recordResp = await client.PostAsJsonAsync($"/api/warehouses/{env.WarehouseId}/stock-counts/{session.Id}/counts", recordReq);
        Assert.Equal(HttpStatusCode.OK, recordResp.StatusCode);

        var updated = await recordResp.Content.ReadFromJsonAsync<StockCountSessionResponse>(JsonOptions);
        Assert.NotNull(updated);
        Assert.Equal(StockCountStatus.InProgress, updated.Status);
        Assert.Equal(1, updated.DiscrepantItemsCount);

        var countedItem = updated.Items.First();
        Assert.Equal(42m, countedItem.CountedQuantity);
        Assert.Equal(-8m, countedItem.DiscrepancyQuantity);
    }

    [Fact]
    public async Task ReviewSession_SupervisorApprovesDiscrepancy_PostsAdjustmentsToStockLedger()
    {
        var env = await SeedCountEnvironmentAsync(initialStock: 100m);
        var empClient = _factory.CreateUserClient(env.EmployeeUserId, "User");
        var supClient = _factory.CreateUserClient(env.SupervisorUserId, "User");

        // 1. Create Session
        var createReq = new CreateStockCountSessionRequest
        {
            WarehouseId = env.WarehouseId,
            CountType = StockCountType.SelectedProducts,
            ProductIds = new List<Guid> { env.ProductId }
        };
        var createResp = await empClient.PostAsJsonAsync($"/api/warehouses/{env.WarehouseId}/stock-counts", createReq);
        var session = await createResp.Content.ReadFromJsonAsync<StockCountSessionResponse>(JsonOptions);
        Assert.NotNull(session);

        // 2. Employee records physical count = 105 (surplus of 5)
        var recordReq = new RecordStockCountItemsRequest
        {
            Items = new List<RecordStockCountItemDto>
            {
                new() { ProductId = env.ProductId, CountedQuantity = 105m, Notes = "Found unopened box on shelf B" }
            }
        };
        await empClient.PostAsJsonAsync($"/api/warehouses/{env.WarehouseId}/stock-counts/{session.Id}/counts", recordReq);

        // 3. Employee submits session for review
        var submitResp = await empClient.PostAsync($"/api/warehouses/{env.WarehouseId}/stock-counts/{session.Id}/submit", null);
        Assert.Equal(HttpStatusCode.OK, submitResp.StatusCode);

        // 4. Regular employee attempts to approve -> Forbidden (requires Supervisor)
        var empApproveResp = await empClient.PostAsJsonAsync(
            $"/api/warehouses/{env.WarehouseId}/stock-counts/{session.Id}/review",
            new ReviewStockCountSessionRequest { Approve = true, ReviewNotes = "Unauthorized self-approval" });
        Assert.Equal(HttpStatusCode.Forbidden, empApproveResp.StatusCode);

        // 5. Authorized Supervisor approves
        var supApproveResp = await supClient.PostAsJsonAsync(
            $"/api/warehouses/{env.WarehouseId}/stock-counts/{session.Id}/review",
            new ReviewStockCountSessionRequest { Approve = true, ReviewNotes = "Reconciled and verified with warehouse manager" });
        Assert.Equal(HttpStatusCode.OK, supApproveResp.StatusCode);

        var approvedSession = await supApproveResp.Content.ReadFromJsonAsync<StockCountSessionResponse>(JsonOptions);
        Assert.NotNull(approvedSession);
        Assert.Equal(StockCountStatus.Approved, approvedSession.Status);

        // 6. Verify that an AdjustmentIn movement was persisted to the immutable stock ledger
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();

        var movement = await db.StockMovements
            .FirstOrDefaultAsync(m => m.WarehouseId == env.WarehouseId
                                   && m.ProductId == env.ProductId
                                   && m.Type == StockMovementType.AdjustmentIn
                                   && m.ReferenceType == "StockCount"
                                   && m.ReferenceId == session.SessionNumber);

        Assert.NotNull(movement);
        Assert.Equal(5m, movement.Quantity);

        // Verify new on-hand balance is 105m
        var totalInbound = await db.StockMovements
            .Where(m => m.WarehouseId == env.WarehouseId && m.ProductId == env.ProductId && (m.Type == StockMovementType.Purchase || m.Type == StockMovementType.AdjustmentIn))
            .SumAsync(m => m.Quantity);

        Assert.Equal(105m, totalInbound);
    }

    [Fact]
    public async Task ReviewSession_SupervisorRejects_DoesNotAlterStockLedger()
    {
        var env = await SeedCountEnvironmentAsync(initialStock: 80m);
        var empClient = _factory.CreateUserClient(env.EmployeeUserId, "User");
        var supClient = _factory.CreateUserClient(env.SupervisorUserId, "User");

        var createResp = await empClient.PostAsJsonAsync(
            $"/api/warehouses/{env.WarehouseId}/stock-counts",
            new CreateStockCountSessionRequest
            {
                WarehouseId = env.WarehouseId,
                CountType = StockCountType.SelectedProducts,
                ProductIds = new List<Guid> { env.ProductId }
            });
        var session = await createResp.Content.ReadFromJsonAsync<StockCountSessionResponse>(JsonOptions);
        Assert.NotNull(session);

        await empClient.PostAsJsonAsync($"/api/warehouses/{env.WarehouseId}/stock-counts/{session.Id}/counts", new RecordStockCountItemsRequest
        {
            Items = new List<RecordStockCountItemDto> { new() { ProductId = env.ProductId, CountedQuantity = 60m } }
        });

        await empClient.PostAsync($"/api/warehouses/{env.WarehouseId}/stock-counts/{session.Id}/submit", null);

        // Supervisor rejects
        var rejectResp = await supClient.PostAsJsonAsync(
            $"/api/warehouses/{env.WarehouseId}/stock-counts/{session.Id}/review",
            new ReviewStockCountSessionRequest { Approve = false, ReviewNotes = "Recount required. High variance." });
        Assert.Equal(HttpStatusCode.OK, rejectResp.StatusCode);

        var rejectedSession = await rejectResp.Content.ReadFromJsonAsync<StockCountSessionResponse>(JsonOptions);
        Assert.NotNull(rejectedSession);
        Assert.Equal(StockCountStatus.Rejected, rejectedSession.Status);

        // Verify NO AdjustmentOut movement was added
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();

        bool hasAdjustment = await db.StockMovements.AnyAsync(m => m.ReferenceId == session.SessionNumber);
        Assert.False(hasAdjustment);
    }
}
