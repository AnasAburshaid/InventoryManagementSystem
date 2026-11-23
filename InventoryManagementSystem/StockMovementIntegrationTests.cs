using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using InventoryManagementSystem.Business.StockMovements.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace InventoryManagementSystem.IntegrationTests;

public class StockMovementIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public StockMovementIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();

        // This triggers the TestAuthHandler we built earlier
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestScheme");
    }

    // Helper method to seed the In-Memory Database before each test
    private async Task<(Guid productId, Guid warehouseId)> SeedDatabaseAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();

        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var categoryId = Guid.NewGuid();

        db.Categories.Add(new Category
        {
            Id = categoryId,
            Name = "Electronics " + Guid.NewGuid().ToString("N")[..6],
            IsActive = true
        });

        var unitOfMeasureId = Guid.NewGuid();
        db.UnitOfMeasures.Add(new UnitOfMeasure
        {
            Id = unitOfMeasureId,
            Name = "Piece",
            Code = "pcs" + Guid.NewGuid().ToString("N")[..4],
            IsActive = true
        });

        // 1. Create Product
        db.Products.Add(new Product
        {
            Id = productId,
            Name = "Test iPhone",
            Sku = "TEST-SKU-" + Guid.NewGuid().ToString("N")[..8],
            CategoryId = categoryId,
            UnitOfMeasureId = unitOfMeasureId,
            IsActive = true
        });

        // 2. Create Warehouse
        db.Warehouses.Add(new Warehouse
        {
            Id = warehouseId,
            Name = "Test Warehouse " + Guid.NewGuid().ToString("N")[..6],
            Code = "WH-" + Guid.NewGuid().ToString("N")[..6],
            Address = "Test Address",
            IsActive = true,
            CanAcceptAllCategories = true
        });

        // 3. Grant our Mock User 'Manager' access to this specific warehouse
        db.WarehouseAssignments.Add(new WarehouseAssignment
        {
            Id = Guid.NewGuid(),
            UserId = TestAuthHandler.DefaultUserId, // "test-admin-id"
            WarehouseId = warehouseId,
            Role = WarehouseAssignmentRole.Manager,
            IsActive = true
        });

        await db.SaveChangesAsync();
        return (productId, warehouseId);
    }

    [Fact]
    public async Task RecordPurchase_ShouldIncreaseCalculatedStock()
    {
        // 1. ARRANGE
        var (productId, warehouseId) = await SeedDatabaseAsync();

        var request = new RecordMovementRequest
        {
            ProductId = productId,
            WarehouseId = warehouseId,
            Quantity = 50,
            Type = StockMovementType.Purchase,
            ReferenceType = "PO",
            ReferenceId = "PO-1001"
        };

        // 2. ACT
        HttpResponseMessage response = await _client.PostAsJsonAsync(
            $"/api/warehouses/{warehouseId}/stock-movements", request);

        // 3. ASSERT
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        // Verify the dynamic calculation logic returns 50
        HttpResponseMessage stockResponse = await _client.GetAsync(
            $"/api/warehouses/{warehouseId}/stock-movements/products/{productId}/current-stock");

        string content = await stockResponse.Content.ReadAsStringAsync();
        decimal calculatedStock = decimal.Parse(content);

        Assert.Equal(50m, calculatedStock);
    }

    [Fact]
    public async Task RecordSale_WithoutSufficientStock_ShouldFail()
    {
        // 1. ARRANGE
        var (productId, warehouseId) = await SeedDatabaseAsync();

        // Stock is currently 0. Attempting to sell 10 should be rejected by the service
        var request = new RecordMovementRequest
        {
            ProductId = productId,
            WarehouseId = warehouseId,
            Quantity = 10,
            Type = StockMovementType.Sale,
            ReferenceType = "SO",
            ReferenceId = "SO-2001"
        };

        // 2. ACT
        HttpResponseMessage response = await _client.PostAsJsonAsync(
            $"/api/warehouses/{warehouseId}/stock-movements", request);

        // 3. ASSERT
        // Business Rule 4: Outgoing quantity <= available stock
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task TransferStock_WithValidData_ShouldMoveStockBetweenWarehouses()
    {
        // 1. ARRANGE: Seed the source and setup a destination warehouse
        var (productId, sourceWarehouseId) = await SeedDatabaseAsync();
        var destWarehouseId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();

            // Create the destination warehouse with CanAcceptAllCategories = true
            db.Warehouses.Add(new Warehouse
            {
                Id = destWarehouseId,
                Name = "Salt Warehouse",
                Code = "WH-SALT-" + Guid.NewGuid().ToString("N")[..4],
                Address = "Salt",
                IsActive = true,
                CanAcceptAllCategories = true
            });

            // Grant our Mock User 'Manager' access so the test can verify the destination stock later
            db.WarehouseAssignments.Add(new WarehouseAssignment
            {
                Id = Guid.NewGuid(),
                UserId = TestAuthHandler.DefaultUserId,
                WarehouseId = destWarehouseId,
                Role = WarehouseAssignmentRole.Manager,
                IsActive = true
            });
            await db.SaveChangesAsync();
        }

        // Add 100 units of initial stock to the source warehouse
        await _client.PostAsJsonAsync($"/api/warehouses/{sourceWarehouseId}/stock-movements", new RecordMovementRequest
        {
            ProductId = productId,
            WarehouseId = sourceWarehouseId,
            Quantity = 100,
            Type = StockMovementType.Purchase
        });

        var transferRequest = new TransferStockRequest
        {
            ProductId = productId,
            DestinationWarehouseId = destWarehouseId,
            Quantity = 40,
            ReferenceType = "InternalTransfer",
            ReferenceId = "TRN-999"
        };

        // 2. ACT: Execute the transactional transfer
        HttpResponseMessage response = await _client.PostAsJsonAsync(
            $"/api/warehouses/{sourceWarehouseId}/stock-movements/transfers", transferRequest);

        // 3. ASSERT: Verify the transaction succeeded and math is perfect
        string errorDetails = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"API returned {response.StatusCode}. Details: {errorDetails}");

        // Source should be 100 - 40 = 60
        HttpResponseMessage sourceStockRes = await _client.GetAsync($"/api/warehouses/{sourceWarehouseId}/stock-movements/products/{productId}/current-stock");
        decimal sourceStock = decimal.Parse(await sourceStockRes.Content.ReadAsStringAsync());
        Assert.Equal(60m, sourceStock);

        // Destination should be 0 + 40 = 40
        HttpResponseMessage destStockRes = await _client.GetAsync($"/api/warehouses/{destWarehouseId}/stock-movements/products/{productId}/current-stock");
        decimal destStock = decimal.Parse(await destStockRes.Content.ReadAsStringAsync());
        Assert.Equal(40m, destStock);
    }

    [Fact]
    public async Task TransferStock_ToRestrictedWarehouse_ShouldFailWithCategoryNotAllowed()
    {
        // 1. ARRANGE
        var (productId, sourceWarehouseId) = await SeedDatabaseAsync();
        var destWarehouseId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();

            // Destination warehouse does NOT accept all categories and has NO category mappings
            db.Warehouses.Add(new Warehouse
            {
                Id = destWarehouseId,
                Name = "Restricted Warehouse",
                Code = "WH-RESTR-" + Guid.NewGuid().ToString("N")[..4],
                Address = "Desert Road",
                IsActive = true,
                CanAcceptAllCategories = false
            });

            db.WarehouseAssignments.Add(new WarehouseAssignment
            {
                Id = Guid.NewGuid(),
                UserId = TestAuthHandler.DefaultUserId,
                WarehouseId = destWarehouseId,
                Role = WarehouseAssignmentRole.Manager,
                IsActive = true
            });
            await db.SaveChangesAsync();
        }

        // Add 100 units of initial stock to the source warehouse
        await _client.PostAsJsonAsync($"/api/warehouses/{sourceWarehouseId}/stock-movements", new RecordMovementRequest
        {
            ProductId = productId,
            WarehouseId = sourceWarehouseId,
            Quantity = 100,
            Type = StockMovementType.Purchase
        });

        var transferRequest = new TransferStockRequest
        {
            ProductId = productId,
            DestinationWarehouseId = destWarehouseId,
            Quantity = 20,
            ReferenceType = "InternalTransfer",
            ReferenceId = "TRN-RESTR"
        };

        // 2. ACT
        HttpResponseMessage response = await _client.PostAsJsonAsync(
            $"/api/warehouses/{sourceWarehouseId}/stock-movements/transfers", transferRequest);

        // 3. ASSERT: Warehouse category restriction guard must reject transfer
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        string details = await response.Content.ReadAsStringAsync();
        Assert.Contains("category", details, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task TransferStock_ToInvalidDestination_ShouldReturnNotFound()
    {
        // 1. ARRANGE
        var (productId, sourceWarehouseId) = await SeedDatabaseAsync();
        var invalidDestId = Guid.NewGuid(); // This ID does not exist in the database

        var transferRequest = new TransferStockRequest
        {
            ProductId = productId,
            DestinationWarehouseId = invalidDestId,
            Quantity = 10
        };

        // 2. ACT
        HttpResponseMessage response = await _client.PostAsJsonAsync(
            $"/api/warehouses/{sourceWarehouseId}/stock-movements/transfers", transferRequest);

        // 3. ASSERT: Business rule dictates returning 404 Not Found
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
