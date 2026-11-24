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
using Microsoft.EntityFrameworkCore.Diagnostics;
using Xunit;

namespace InventoryManagementSystem.IntegrationTests;

public class StockTransferTransactionIntegrationTests : IAsyncLifetime
{
    private const string ConnectionString =
        "Server=localhost;Database=InventoryManagementSystem_TestDb;Trusted_Connection=True;TrustServerCertificate=True;";

    private readonly FailureInjectionInterceptor _interceptor = new();

    public async Task InitializeAsync()
    {
        var options = new DbContextOptionsBuilder<InventoryDbContext>()
            .UseSqlServer(ConnectionString)
            .Options;

        await using var db = new InventoryDbContext(options);
        // Ensure SQL Server test database schema exists
        await db.Database.EnsureCreatedAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private InventoryDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<InventoryDbContext>()
            .UseSqlServer(ConnectionString)
            .AddInterceptors(_interceptor)
            .Options;

        return new InventoryDbContext(options);
    }

    private StockMovementService CreateService(InventoryDbContext db, string userId = "test-user-id")
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

    private async Task<(Guid productId, Guid sourceWhId, Guid destWhId)> SeedTransferEnvironmentAsync(InventoryDbContext db)
    {
        var catId = Guid.NewGuid();
        db.Categories.Add(new Category { Id = catId, Name = "Transfer Category " + Guid.NewGuid().ToString("N")[..6], IsActive = true });

        var uomId = Guid.NewGuid();
        db.UnitOfMeasures.Add(new UnitOfMeasure { Id = uomId, Name = "Piece " + Guid.NewGuid().ToString("N")[..6], Code = "t" + Guid.NewGuid().ToString("N")[..4], IsActive = true });

        var prodId = Guid.NewGuid();
        db.Products.Add(new Product
        {
            Id = prodId,
            Name = "Transfer Item",
            Sku = "TR-" + Guid.NewGuid().ToString("N")[..6],
            CategoryId = catId,
            UnitOfMeasureId = uomId,
            IsActive = true
        });

        var sourceWhId = Guid.NewGuid();
        db.Warehouses.Add(new Warehouse
        {
            Id = sourceWhId,
            Name = "Source Facility",
            Code = "SRC-" + Guid.NewGuid().ToString("N")[..8],
            Address = "100 Source Way",
            IsActive = true,
            CanAcceptAllCategories = true
        });

        var destWhId = Guid.NewGuid();
        db.Warehouses.Add(new Warehouse
        {
            Id = destWhId,
            Name = "Dest Facility",
            Code = "DST-" + Guid.NewGuid().ToString("N")[..8],
            Address = "200 Dest Way",
            IsActive = true,
            CanAcceptAllCategories = true
        });

        // Seed initial 100 units in Source Warehouse
        db.StockMovements.Add(new StockMovement
        {
            Id = Guid.NewGuid(),
            WarehouseId = sourceWhId,
            ProductId = prodId,
            Quantity = 100m,
            Type = StockMovementType.Purchase,
            CreatedByUserId = "test-seeder",
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync();
        return (prodId, sourceWhId, destWhId);
    }

    [Fact]
    public async Task Transfer_Successful_CommitsBothMovementsAtomicallyInSqlServer()
    {
        // 1. ARRANGE
        await using var db = CreateDbContext();
        var (productId, sourceWhId, destWhId) = await SeedTransferEnvironmentAsync(db);
        var service = CreateService(db);
        _interceptor.Reset();

        var request = new TransferStockRequest
        {
            ProductId = productId,
            DestinationWarehouseId = destWhId,
            Quantity = 30m,
            ReferenceType = "InterWarehouseTransfer",
            ReferenceId = "TR-REQ-001"
        };

        // 2. ACT
        var result = await service.TransferStockAsync(sourceWhId, request);

        // 3. ASSERT: Service Result
        Assert.Equal(StockMovementOperationStatus.Success, result.Status);
        Assert.NotNull(result.Data);
        Assert.Equal(2, result.Data.Count);

        var outDto = result.Data.First(m => m.Type == StockMovementType.TransferOut);
        var inDto = result.Data.First(m => m.Type == StockMovementType.TransferIn);

        Assert.Equal(outDto.Id, inDto.LinkedMovementId);
        Assert.Equal(inDto.Id, outDto.LinkedMovementId);

        // 4. DATABASE AUDIT: Inspect real SQL Server rows and balances
        await using var verifyDb = CreateDbContext();
        var outMovement = await verifyDb.StockMovements.FindAsync(outDto.Id);
        var inMovement = await verifyDb.StockMovements.FindAsync(inDto.Id);

        Assert.NotNull(outMovement);
        Assert.NotNull(inMovement);
        Assert.Equal(sourceWhId, outMovement.WarehouseId);
        Assert.Equal(destWhId, inMovement.WarehouseId);
        Assert.Equal(30m, outMovement.Quantity);
        Assert.Equal(30m, inMovement.Quantity);

        decimal sourceStock = await service.GetCurrentStockAsync(sourceWhId, productId);
        decimal destStock = await service.GetCurrentStockAsync(destWhId, productId);

        Assert.Equal(70m, sourceStock); // 100 - 30
        Assert.Equal(30m, destStock);   // 0 + 30
    }

    [Fact]
    public async Task Transfer_InsufficientStock_AbortsAndCreatesNoMovements()
    {
        // 1. ARRANGE: Source only has 100 units. Attempt transfer of 150 units.
        await using var db = CreateDbContext();
        var (productId, sourceWhId, destWhId) = await SeedTransferEnvironmentAsync(db);
        var service = CreateService(db);
        _interceptor.Reset();

        var request = new TransferStockRequest
        {
            ProductId = productId,
            DestinationWarehouseId = destWhId,
            Quantity = 150m
        };

        // 2. ACT
        var result = await service.TransferStockAsync(sourceWhId, request);

        // 3. ASSERT
        Assert.Equal(StockMovementOperationStatus.InsufficientStock, result.Status);

        // DATABASE AUDIT: Verify no transfer movements were persisted
        await using var verifyDb = CreateDbContext();
        bool anyTransfers = await verifyDb.StockMovements.AnyAsync(sm =>
            sm.ProductId == productId &&
            (sm.Type == StockMovementType.TransferOut || sm.Type == StockMovementType.TransferIn));
        Assert.False(anyTransfers);

        decimal sourceStock = await service.GetCurrentStockAsync(sourceWhId, productId);
        Assert.Equal(100m, sourceStock);
    }

    [Fact]
    public async Task Transfer_InvalidDestinationWarehouse_AbortsAndCreatesNoMovements()
    {
        // 1. ARRANGE: Non-existent destination warehouse
        await using var db = CreateDbContext();
        var (productId, sourceWhId, _) = await SeedTransferEnvironmentAsync(db);
        var service = CreateService(db);
        _interceptor.Reset();

        var request = new TransferStockRequest
        {
            ProductId = productId,
            DestinationWarehouseId = Guid.NewGuid(),
            Quantity = 10m
        };

        // 2. ACT
        var result = await service.TransferStockAsync(sourceWhId, request);

        // 3. ASSERT
        Assert.Equal(StockMovementOperationStatus.DestinationWarehouseNotFoundOrInactive, result.Status);

        // DATABASE AUDIT: Verify stock remains untouched
        decimal sourceStock = await service.GetCurrentStockAsync(sourceWhId, productId);
        Assert.Equal(100m, sourceStock);
    }

    [Fact]
    public async Task Transfer_FailureDuringIncomingMovement_RollsBackOutgoingMovementAtomicallyInSqlServer()
    {
        // 1. ARRANGE
        await using var db = CreateDbContext();
        var (productId, sourceWhId, destWhId) = await SeedTransferEnvironmentAsync(db);
        var service = CreateService(db);

        // Configure interceptor to fail on the 2nd save (when TransferIn is being inserted)
        _interceptor.FailOnSaveCallIndex = 2;

        var request = new TransferStockRequest
        {
            ProductId = productId,
            DestinationWarehouseId = destWhId,
            Quantity = 30m
        };

        // 2. ACT & ASSERT: Must throw simulated exception
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.TransferStockAsync(sourceWhId, request));
        Assert.Contains("SIMULATED_FAILURE_ON_SAVE_2", ex.Message);

        // 3. CRITICAL ATOMICITY AUDIT:
        // Even though TransferOut was added and SaveChangesAsync was called on step 1,
        // the SQL Server transaction rollback MUST have eradicated the TransferOut record!
        await using var verifyDb = CreateDbContext();

        var transferOutMovements = await verifyDb.StockMovements
            .Where(sm => sm.WarehouseId == sourceWhId && sm.ProductId == productId && sm.Type == StockMovementType.TransferOut)
            .ToListAsync();
        Assert.Empty(transferOutMovements);

        var transferInMovements = await verifyDb.StockMovements
            .Where(sm => sm.WarehouseId == destWhId && sm.ProductId == productId)
            .ToListAsync();
        Assert.Empty(transferInMovements);

        // Check balances: Source must STILL be exactly 100, Dest must STILL be exactly 0
        decimal sourceStock = await service.GetCurrentStockAsync(sourceWhId, productId);
        decimal destStock = await service.GetCurrentStockAsync(destWhId, productId);

        Assert.Equal(100m, sourceStock);
        Assert.Equal(0m, destStock);
    }

    [Fact]
    public async Task Transfer_FailureBeforeCommit_RollsBackBothMovementsAtomicallyInSqlServer()
    {
        // 1. ARRANGE
        await using var db = CreateDbContext();
        var (productId, sourceWhId, destWhId) = await SeedTransferEnvironmentAsync(db);
        var service = CreateService(db);

        // Configure interceptor to fail on the 3rd save (when linking TransferOut to TransferIn before commit)
        _interceptor.FailOnSaveCallIndex = 3;

        var request = new TransferStockRequest
        {
            ProductId = productId,
            DestinationWarehouseId = destWhId,
            Quantity = 30m
        };

        // 2. ACT & ASSERT
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.TransferStockAsync(sourceWhId, request));
        Assert.Contains("SIMULATED_FAILURE_ON_SAVE_3", ex.Message);

        // 3. DATABASE AUDIT: Both TransferOut and TransferIn MUST be completely rolled back!
        await using var verifyDb = CreateDbContext();

        bool anyTransfers = await verifyDb.StockMovements.AnyAsync(sm =>
            sm.ProductId == productId &&
            (sm.Type == StockMovementType.TransferOut || sm.Type == StockMovementType.TransferIn));
        Assert.False(anyTransfers, "CRITICAL: Neither transfer movement must exist in SQL Server after rollback!");

        decimal sourceStock = await service.GetCurrentStockAsync(sourceWhId, productId);
        decimal destStock = await service.GetCurrentStockAsync(destWhId, productId);

        Assert.Equal(100m, sourceStock);
        Assert.Equal(0m, destStock);
    }
}

/// <summary>
/// EF Core Interceptor to simulate database or network failures at precise save checkpoints.
/// </summary>
public class FailureInjectionInterceptor : SaveChangesInterceptor
{
    public int? FailOnSaveCallIndex { get; set; }
    private int _currentCallCount = 0;

    public void Reset()
    {
        _currentCallCount = 0;
        FailOnSaveCallIndex = null;
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        _currentCallCount++;
        if (FailOnSaveCallIndex.HasValue && _currentCallCount == FailOnSaveCallIndex.Value)
        {
            throw new InvalidOperationException($"SIMULATED_FAILURE_ON_SAVE_{_currentCallCount}: Hardware/network failure injected.");
        }

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }
}
