using System.Security.Claims;
using InventoryManagementSystem.Business.StockMovements;
using InventoryManagementSystem.Business.StockMovements.DTOs;
using InventoryManagementSystem.Business.StockMovements.Services;
using InventoryManagementSystem.Business.Suppliers.Capabilities.Services;
using InventoryManagementSystem.Business.Suppliers.Stock.Services;
using InventoryManagementSystem.Business.Warehouses.Restrictions.Services;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InventoryManagementSystem.IntegrationTests;

public class StockConcurrencyIntegrationTests : IAsyncLifetime
{
    private const string ConnectionString =
        "Server=localhost;Database=InventoryManagementSystem_TestDb;Trusted_Connection=True;TrustServerCertificate=True;";

    public async Task InitializeAsync()
    {
        var options = new DbContextOptionsBuilder<InventoryDbContext>()
            .UseSqlServer(ConnectionString)
            .Options;

        await using var db = new InventoryDbContext(options);
        await db.Database.EnsureCreatedAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private InventoryDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<InventoryDbContext>()
            .UseSqlServer(ConnectionString)
            .Options;

        return new InventoryDbContext(options);
    }

    private StockMovementService CreateService(InventoryDbContext db, string userId = "concurrency-test-user")
    {
        var httpContext = new DefaultHttpContext();
        httpContext.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Role, "Admin")
        }, "Test"));

        var accessor = new HttpContextAccessor { HttpContext = httpContext };
        var restrictionService = new WarehouseRestrictionService(db);
        var capabilityService = new SupplierCapabilityService(db);
        var supplierStockService = new SupplierStockService(db, capabilityService);

        return new StockMovementService(db, accessor, restrictionService, capabilityService, supplierStockService);
    }

    private async Task<(Guid productId, Guid warehouseId)> SeedWarehouseStockAsync(InventoryDbContext db, decimal initialStock)
    {
        var catId = Guid.NewGuid();
        db.Categories.Add(new Category { Id = catId, Name = "Concurrency Cat " + Guid.NewGuid().ToString("N")[..6], IsActive = true });

        var uomId = Guid.NewGuid();
        db.UnitOfMeasures.Add(new UnitOfMeasure { Id = uomId, Name = "Piece " + Guid.NewGuid().ToString("N")[..6], Code = "c" + Guid.NewGuid().ToString("N")[..3], IsActive = true });

        var prodId = Guid.NewGuid();
        db.Products.Add(new Product
        {
            Id = prodId,
            Name = "Contested Product",
            Sku = "RACE-" + Guid.NewGuid().ToString("N")[..6],
            CategoryId = catId,
            UnitOfMeasureId = uomId,
            IsActive = true
        });

        var whId = Guid.NewGuid();
        db.Warehouses.Add(new Warehouse
        {
            Id = whId,
            Name = "Contested Facility",
            Code = "CWH-" + Guid.NewGuid().ToString("N")[..4],
            Address = "Race Condition Lane",
            IsActive = true,
            CanAcceptAllCategories = true
        });

        // Seed initial physical stock in warehouse
        db.StockMovements.Add(new StockMovement
        {
            Id = Guid.NewGuid(),
            WarehouseId = whId,
            ProductId = prodId,
            Quantity = initialStock,
            Type = StockMovementType.Purchase,
            CreatedByUserId = "test-seeder",
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync();
        return (prodId, whId);
    }

    [Fact]
    public async Task TwoConcurrentSales_CompeteFor10Units_OnlyOneSaleSucceeds_AndFinalStockIs3()
    {
        // 1. ARRANGE: Warehouse has exactly 10 units.
        await using var seedDb = CreateDbContext();
        var (productId, warehouseId) = await SeedWarehouseStockAsync(seedDb, initialStock: 10m);

        // Prepare two separate DbContext and service instances simulating two concurrent user requests
        await using var user1Db = CreateDbContext();
        await using var user2Db = CreateDbContext();

        var service1 = CreateService(user1Db, "user-concurrent-1");
        var service2 = CreateService(user2Db, "user-concurrent-2");

        var saleRequest1 = new RecordMovementRequest
        {
            ProductId = productId,
            WarehouseId = warehouseId,
            Quantity = 7m,
            Type = StockMovementType.Sale
        };

        var saleRequest2 = new RecordMovementRequest
        {
            ProductId = productId,
            WarehouseId = warehouseId,
            Quantity = 7m,
            Type = StockMovementType.Sale
        };

        // 2. ACT: Execute both sales concurrently at the exact same millisecond
        var task1 = Task.Run(() => service1.RecordMovementAsync(saleRequest1));
        var task2 = Task.Run(() => service2.RecordMovementAsync(saleRequest2));

        var results = await Task.WhenAll(task1, task2);

        // 3. ASSERT: In-Memory / Service Results
        var successCount = results.Count(r => r.Status == StockMovementOperationStatus.Success);
        var insufficientCount = results.Count(r => r.Status == StockMovementOperationStatus.InsufficientStock);

        Assert.Equal(1, successCount);
        Assert.Equal(1, insufficientCount);

        // 4. CRITICAL RELATIONAL AUDIT: Inspect SQL Server directly
        await using var verifyDb = CreateDbContext();
        var verifyService = CreateService(verifyDb);

        var movements = await verifyDb.StockMovements
            .Where(sm => sm.WarehouseId == warehouseId && sm.ProductId == productId)
            .ToListAsync();

        // Must have initial purchase (10) and exactly ONE sale (7)
        Assert.Equal(2, movements.Count);

        var sales = movements.Where(sm => sm.Type == StockMovementType.Sale).ToList();
        Assert.Single(sales);
        Assert.Equal(7m, sales[0].Quantity);

        decimal finalStock = await verifyService.GetCurrentStockAsync(warehouseId, productId);
        Assert.Equal(3m, finalStock); // 10 - 7 = 3
        Assert.True(finalStock >= 0m, "CRITICAL: Stock must NEVER be negative under concurrent load!");
    }

    [Fact]
    public async Task HighConcurrency_FiveSimultaneousSalesOf3Units_Against10Units_OnlyThreeSucceed_FinalStockIs1()
    {
        // 1. ARRANGE: Warehouse has 10 units. 5 concurrent requests try to sell 3 units each (Total demanded = 15).
        await using var seedDb = CreateDbContext();
        var (productId, warehouseId) = await SeedWarehouseStockAsync(seedDb, initialStock: 10m);

        int totalThreads = 5;
        decimal quantityPerSale = 3m;

        // 2. ACT: Launch 5 concurrent tasks simultaneously
        var tasks = Enumerable.Range(0, totalThreads).Select(async i =>
        {
            await using var db = CreateDbContext();
            var service = CreateService(db, $"concurrency-user-{i}");
            return await service.RecordMovementAsync(new RecordMovementRequest
            {
                ProductId = productId,
                WarehouseId = warehouseId,
                Quantity = quantityPerSale,
                Type = StockMovementType.Sale
            });
        }).ToList();

        var results = await Task.WhenAll(tasks);

        // 3. ASSERT: Exactly 3 sales can succeed (3 * 3 = 9 units), remaining 2 must be rejected
        int succeeded = results.Count(r => r.Status == StockMovementOperationStatus.Success);
        int rejected = results.Count(r => r.Status == StockMovementOperationStatus.InsufficientStock);

        Assert.Equal(3, succeeded);
        Assert.Equal(2, rejected);

        // 4. DATABASE AUDIT: Final stock must be 10 - 9 = 1 unit.
        await using var verifyDb = CreateDbContext();
        var verifyService = CreateService(verifyDb);

        decimal finalStock = await verifyService.GetCurrentStockAsync(warehouseId, productId);
        Assert.Equal(1m, finalStock);
        Assert.True(finalStock >= 0m);
    }
}
