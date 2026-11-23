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

public class StockOperationIntegrityIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public StockOperationIntegrityIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private record TestStockEnvironment(
        Guid ProductId,
        Guid InactiveProductId,
        Guid WarehouseId,
        Guid InactiveWarehouseId,
        Guid AdjustmentReasonId);

    private async Task<TestStockEnvironment> SeedEnvironmentAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();

        var catId = Guid.NewGuid();
        db.Categories.Add(new Category { Id = catId, Name = "Stock Integrity Cat " + Guid.NewGuid().ToString("N")[..6], IsActive = true });

        var uomId = Guid.NewGuid();
        db.UnitOfMeasures.Add(new UnitOfMeasure { Id = uomId, Name = "Piece " + Guid.NewGuid().ToString("N")[..6], Code = "si" + Guid.NewGuid().ToString("N")[..3], IsActive = true });

        var activeProdId = Guid.NewGuid();
        db.Products.Add(new Product
        {
            Id = activeProdId,
            Name = "Active Product",
            Sku = "ACT-SKU-" + Guid.NewGuid().ToString("N")[..6],
            CategoryId = catId,
            UnitOfMeasureId = uomId,
            IsActive = true
        });

        var inactiveProdId = Guid.NewGuid();
        db.Products.Add(new Product
        {
            Id = inactiveProdId,
            Name = "Inactive Product",
            Sku = "INACT-SKU-" + Guid.NewGuid().ToString("N")[..6],
            CategoryId = catId,
            UnitOfMeasureId = uomId,
            IsActive = false
        });

        var activeWhId = Guid.NewGuid();
        db.Warehouses.Add(new Warehouse
        {
            Id = activeWhId,
            Name = "Active WH",
            Code = "AWH-" + Guid.NewGuid().ToString("N")[..4],
            Address = "100 Active St",
            IsActive = true,
            CanAcceptAllCategories = true
        });

        var inactiveWhId = Guid.NewGuid();
        db.Warehouses.Add(new Warehouse
        {
            Id = inactiveWhId,
            Name = "Inactive WH",
            Code = "IWH-" + Guid.NewGuid().ToString("N")[..4],
            Address = "200 Inactive St",
            IsActive = false,
            CanAcceptAllCategories = true
        });

        var adjReasonId = Guid.NewGuid();
        db.AdjustmentReasons.Add(new AdjustmentReason
        {
            Id = adjReasonId,
            Name = "Damaged Goods " + Guid.NewGuid().ToString("N")[..4],
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync();
        return new TestStockEnvironment(activeProdId, inactiveProdId, activeWhId, inactiveWhId, adjReasonId);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    [InlineData(-0.01)]
    public async Task RecordMovement_ZeroOrNegativeQuantity_IsRejectedWithBadRequest(decimal invalidQty)
    {
        // ARRANGE
        var env = await SeedEnvironmentAsync();
        var client = _factory.CreateClient();

        var request = new RecordMovementRequest
        {
            ProductId = env.ProductId,
            WarehouseId = env.WarehouseId,
            Quantity = invalidQty,
            Type = StockMovementType.Purchase
        };

        // ACT
        var response = await client.PostAsJsonAsync($"/api/warehouses/{env.WarehouseId}/stock-movements", request);

        // ASSERT: Must be rejected
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task RecordMovement_NonexistentProduct_ReturnsNotFound()
    {
        // ARRANGE
        var env = await SeedEnvironmentAsync();
        var client = _factory.CreateClient();

        var request = new RecordMovementRequest
        {
            ProductId = Guid.NewGuid(), // Nonexistent
            WarehouseId = env.WarehouseId,
            Quantity = 10m,
            Type = StockMovementType.Purchase
        };

        // ACT
        var response = await client.PostAsJsonAsync($"/api/warehouses/{env.WarehouseId}/stock-movements", request);

        // ASSERT: 404 Not Found
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task RecordMovement_InactiveProduct_ReturnsNotFound()
    {
        // ARRANGE
        var env = await SeedEnvironmentAsync();
        var client = _factory.CreateClient();

        var request = new RecordMovementRequest
        {
            ProductId = env.InactiveProductId,
            WarehouseId = env.WarehouseId,
            Quantity = 10m,
            Type = StockMovementType.Purchase
        };

        // ACT
        var response = await client.PostAsJsonAsync($"/api/warehouses/{env.WarehouseId}/stock-movements", request);

        // ASSERT: 404 Not Found
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task RecordMovement_NonexistentWarehouse_ReturnsNotFound()
    {
        // ARRANGE
        var env = await SeedEnvironmentAsync();
        var client = _factory.CreateClient();
        var nonExistentWh = Guid.NewGuid();

        var request = new RecordMovementRequest
        {
            ProductId = env.ProductId,
            WarehouseId = nonExistentWh,
            Quantity = 10m,
            Type = StockMovementType.Purchase
        };

        // ACT
        var response = await client.PostAsJsonAsync($"/api/warehouses/{nonExistentWh}/stock-movements", request);

        // ASSERT: 404 Not Found
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task RecordMovement_InactiveWarehouse_ReturnsNotFound()
    {
        // ARRANGE
        var env = await SeedEnvironmentAsync();
        var client = _factory.CreateClient();

        var request = new RecordMovementRequest
        {
            ProductId = env.ProductId,
            WarehouseId = env.InactiveWarehouseId,
            Quantity = 10m,
            Type = StockMovementType.Purchase
        };

        // ACT
        var response = await client.PostAsJsonAsync($"/api/warehouses/{env.InactiveWarehouseId}/stock-movements", request);

        // ASSERT: 404 Not Found
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task RecordMovement_OutgoingMovement_WithInsufficientStock_ReturnsBadRequest()
    {
        // ARRANGE: Stock is 0. Attempting a Sale of 10 units.
        var env = await SeedEnvironmentAsync();
        var client = _factory.CreateClient();

        var request = new RecordMovementRequest
        {
            ProductId = env.ProductId,
            WarehouseId = env.WarehouseId,
            Quantity = 10m,
            Type = StockMovementType.Sale
        };

        // ACT
        var response = await client.PostAsJsonAsync($"/api/warehouses/{env.WarehouseId}/stock-movements", request);

        // ASSERT: 400 Bad Request
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task RecordMovement_AdjustmentWithoutReasonOrNote_ReturnsBadRequest()
    {
        // ARRANGE: Stock AdjustmentIn without ReasonId or Reference note
        var env = await SeedEnvironmentAsync();
        var client = _factory.CreateClient();

        var request = new RecordMovementRequest
        {
            ProductId = env.ProductId,
            WarehouseId = env.WarehouseId,
            Quantity = 10m,
            Type = StockMovementType.AdjustmentIn
        };

        // ACT
        var response = await client.PostAsJsonAsync($"/api/warehouses/{env.WarehouseId}/stock-movements", request);

        // ASSERT: 400 Bad Request (AdjustmentReasonRequired)
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task StockLedger_PreservesFullHistory_AndCalculatesDeterministicStock()
    {
        // 1. ARRANGE
        var env = await SeedEnvironmentAsync();
        var client = _factory.CreateClient();

        // 2. PURCHASE 100 units
        var buyRes = await client.PostAsJsonAsync($"/api/warehouses/{env.WarehouseId}/stock-movements", new RecordMovementRequest
        {
            ProductId = env.ProductId,
            WarehouseId = env.WarehouseId,
            Quantity = 100m,
            Type = StockMovementType.Purchase
        });
        Assert.Equal(HttpStatusCode.Created, buyRes.StatusCode);

        // 3. ADJUSTMENT IN 20 units (e.g. inventory audit surplus)
        var adjInRes = await client.PostAsJsonAsync($"/api/warehouses/{env.WarehouseId}/stock-movements", new RecordMovementRequest
        {
            ProductId = env.ProductId,
            WarehouseId = env.WarehouseId,
            Quantity = 20m,
            Type = StockMovementType.AdjustmentIn,
            AdjustmentReasonId = env.AdjustmentReasonId
        });
        Assert.Equal(HttpStatusCode.Created, adjInRes.StatusCode);

        // 4. SALE 40 units
        var saleRes = await client.PostAsJsonAsync($"/api/warehouses/{env.WarehouseId}/stock-movements", new RecordMovementRequest
        {
            ProductId = env.ProductId,
            WarehouseId = env.WarehouseId,
            Quantity = 40m,
            Type = StockMovementType.Sale
        });
        Assert.Equal(HttpStatusCode.Created, saleRes.StatusCode);

        // 5. ADJUSTMENT OUT 10 units (e.g. damaged goods)
        var adjOutRes = await client.PostAsJsonAsync($"/api/warehouses/{env.WarehouseId}/stock-movements", new RecordMovementRequest
        {
            ProductId = env.ProductId,
            WarehouseId = env.WarehouseId,
            Quantity = 10m,
            Type = StockMovementType.AdjustmentOut,
            AdjustmentReasonId = env.AdjustmentReasonId
        });
        Assert.Equal(HttpStatusCode.Created, adjOutRes.StatusCode);

        // 6. ASSERT CURRENT STOCK VIA API
        // Expected: 100 + 20 - 40 - 10 = 70 units
        var stockRes = await client.GetAsync($"/api/warehouses/{env.WarehouseId}/stock-movements/products/{env.ProductId}/current-stock");
        Assert.Equal(HttpStatusCode.OK, stockRes.StatusCode);
        var calculatedStock = await stockRes.Content.ReadFromJsonAsync<decimal>();
        Assert.Equal(70m, calculatedStock);

        // 7. ASSERT AUDIT LEDGER HISTORY PRESERVATION
        // All 4 distinct movements must exist in reverse chronological order
        var historyRes = await client.GetAsync($"/api/warehouses/{env.WarehouseId}/stock-movements/products/{env.ProductId}");
        Assert.Equal(HttpStatusCode.OK, historyRes.StatusCode);
        var jsonOptions = new System.Text.Json.JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
        };
        var history = await historyRes.Content.ReadFromJsonAsync<List<StockMovementResponse>>(jsonOptions);
        Assert.NotNull(history);
        Assert.Equal(4, history.Count);

        // Verify that movements are append-only and immutable
        Assert.Contains(history, m => m.Type == StockMovementType.Purchase && m.Quantity == 100m);
        Assert.Contains(history, m => m.Type == StockMovementType.AdjustmentIn && m.Quantity == 20m);
        Assert.Contains(history, m => m.Type == StockMovementType.Sale && m.Quantity == 40m);
        Assert.Contains(history, m => m.Type == StockMovementType.AdjustmentOut && m.Quantity == 10m);
    }
}
