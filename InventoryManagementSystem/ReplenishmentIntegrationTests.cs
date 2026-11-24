using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.PurchaseOrders.DTOs;
using InventoryManagementSystem.Business.Replenishment.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace InventoryManagementSystem.IntegrationTests;

public class ReplenishmentIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public ReplenishmentIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private record TestReplenishmentEnvironment(
        Guid WarehouseId,
        Guid ProductId,
        Guid SupplierId,
        string EmployeeUserId,
        string SupervisorUserId);

    private async Task<TestReplenishmentEnvironment> SeedReplenishmentEnvironmentAsync(decimal currentStock = 10m)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();

        var catId = Guid.NewGuid();
        db.Categories.Add(new Category { Id = catId, Name = "Replenish Cat " + Guid.NewGuid().ToString("N")[..6], IsActive = true });

        var uomId = Guid.NewGuid();
        db.UnitOfMeasures.Add(new UnitOfMeasure { Id = uomId, Name = "Replenish UOM " + Guid.NewGuid().ToString("N")[..6], Code = "r" + Guid.NewGuid().ToString("N")[..3], IsActive = true });

        var prodId = Guid.NewGuid();
        db.Products.Add(new Product
        {
            Id = prodId,
            Name = "Replenishable Widget",
            Sku = "REP-SKU-" + Guid.NewGuid().ToString("N")[..6],
            CategoryId = catId,
            UnitOfMeasureId = uomId,
            IsActive = true
        });

        var whId = Guid.NewGuid();
        db.Warehouses.Add(new Warehouse
        {
            Id = whId,
            Name = "Replenish Warehouse",
            Code = "RWH-" + Guid.NewGuid().ToString("N")[..4],
            Address = "456 Supply Ave",
            IsActive = true,
            CanAcceptAllCategories = true
        });

        var supId = Guid.NewGuid();
        db.Suppliers.Add(new Supplier
        {
            Id = supId,
            Name = "Premier Widget Supplier",
            Email = "supplier@widgets.com",
            IsActive = true,
            CanSupplyAllCategories = true,
            CanSupplyAllBrands = true
        });

        db.SupplierProducts.Add(new SupplierProduct
        {
            Id = Guid.NewGuid(),
            SupplierId = supId,
            ProductId = prodId,
            SupplierProductCode = "SUP-WIDGET-01",
            LastPurchasePrice = 25.50m,
            IsPreferred = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });

        string empUserId = "rep-emp-" + Guid.NewGuid().ToString("N")[..6];
        string supUserId = "rep-sup-" + Guid.NewGuid().ToString("N")[..6];

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

        if (currentStock > 0m)
        {
            db.StockMovements.Add(new StockMovement
            {
                Id = Guid.NewGuid(),
                WarehouseId = whId,
                ProductId = prodId,
                Quantity = currentStock,
                Type = StockMovementType.Purchase,
                ReferenceType = "SeedStock",
                ReferenceId = "SEED-001",
                CreatedByUserId = "test-seeder",
                CreatedAt = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync();

        return new TestReplenishmentEnvironment(whId, prodId, supId, empUserId, supUserId);
    }

    [Fact]
    public async Task UpsertSetting_SupervisorConfiguresReorderLevels_Success()
    {
        var env = await SeedReplenishmentEnvironmentAsync(currentStock: 15m);
        var client = _factory.CreateUserClient(env.SupervisorUserId, "User");

        var request = new UpsertWarehouseProductSettingRequest
        {
            WarehouseId = env.WarehouseId,
            ProductId = env.ProductId,
            ReorderPoint = 20m,
            TargetStockLevel = 100m,
            MinOrderQuantity = 10m,
            IsActive = true
        };

        var response = await client.PostAsJsonAsync($"/api/warehouses/{env.WarehouseId}/replenishment/settings", request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var setting = await response.Content.ReadFromJsonAsync<WarehouseProductSettingResponse>(JsonOptions);
        Assert.NotNull(setting);
        Assert.Equal(20m, setting.ReorderPoint);
        Assert.Equal(100m, setting.TargetStockLevel);
        Assert.Equal(10m, setting.MinOrderQuantity);
        Assert.True(setting.IsActive);
    }

    [Fact]
    public async Task UpsertSetting_TargetLowerThanReorderPoint_ReturnsBadRequest()
    {
        var env = await SeedReplenishmentEnvironmentAsync(currentStock: 15m);
        var client = _factory.CreateUserClient(env.SupervisorUserId, "User");

        var request = new UpsertWarehouseProductSettingRequest
        {
            WarehouseId = env.WarehouseId,
            ProductId = env.ProductId,
            ReorderPoint = 50m,
            TargetStockLevel = 30m, // Invalid: target < reorder point
            MinOrderQuantity = 5m
        };

        var response = await client.PostAsJsonAsync($"/api/warehouses/{env.WarehouseId}/replenishment/settings", request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetSuggestions_DetectsStockBelowReorderPoint_CalculatesCorrectReplenishmentQuantity()
    {
        // Current on hand is 12. Reorder point is 25. Target is 80.
        var env = await SeedReplenishmentEnvironmentAsync(currentStock: 12m);
        var supClient = _factory.CreateUserClient(env.SupervisorUserId, "User");
        var empClient = _factory.CreateUserClient(env.EmployeeUserId, "User");

        // 1. Configure settings: Reorder at 25, target 80
        await supClient.PostAsJsonAsync($"/api/warehouses/{env.WarehouseId}/replenishment/settings", new UpsertWarehouseProductSettingRequest
        {
            WarehouseId = env.WarehouseId,
            ProductId = env.ProductId,
            ReorderPoint = 25m,
            TargetStockLevel = 80m,
            MinOrderQuantity = 10m
        });

        // 2. Fetch suggestions
        var response = await empClient.GetAsync($"/api/warehouses/{env.WarehouseId}/replenishment/suggestions");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var suggestions = await response.Content.ReadFromJsonAsync<List<ReplenishmentSuggestionResponse>>(JsonOptions);
        Assert.NotNull(suggestions);
        Assert.Single(suggestions);

        var suggestion = suggestions.First();
        Assert.Equal(env.ProductId, suggestion.ProductId);
        Assert.Equal(12m, suggestion.CurrentStock);
        Assert.Equal(25m, suggestion.ReorderPoint);
        Assert.Equal(80m, suggestion.TargetStockLevel);
        // Suggested = 80 - 12 = 68
        Assert.Equal(68m, suggestion.SuggestedQuantity);
        Assert.Equal(env.SupplierId, suggestion.PreferredSupplierId);
        Assert.Equal(25.50m, suggestion.PreferredSupplierUnitPrice);
    }

    [Fact]
    public async Task ConvertToPo_AuthorizedSupervisor_CreatesDraftPurchaseOrder()
    {
        var env = await SeedReplenishmentEnvironmentAsync(currentStock: 5m);
        var supClient = _factory.CreateUserClient(env.SupervisorUserId, "User");

        // Convert replenishment suggestion of 50 units into draft PO
        var request = new ConvertSuggestionToPoRequest
        {
            WarehouseId = env.WarehouseId,
            ProductId = env.ProductId,
            Quantity = 50m,
            SupplierId = env.SupplierId,
            UnitPrice = 25.50m,
            Notes = "Urgent replenishment due to low stock"
        };

        var response = await supClient.PostAsJsonAsync($"/api/warehouses/{env.WarehouseId}/replenishment/convert-to-po", request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var po = await response.Content.ReadFromJsonAsync<PurchaseOrderResponse>(JsonOptions);
        Assert.NotNull(po);
        Assert.StartsWith("PO-", po.PurchaseOrderNumber);
        Assert.Equal("Draft", po.Status);
        Assert.Equal(env.SupplierId, po.SupplierId);
        Assert.Equal(env.WarehouseId, po.WarehouseId);
        Assert.Single(po.Lines);

        var poLine = po.Lines.First();
        Assert.Equal(env.ProductId, poLine.ProductId);
        Assert.Equal(50m, poLine.QuantityOrdered);
        Assert.Equal(25.50m, poLine.UnitCost);
    }

    [Fact]
    public async Task GetSuggestions_WarehouseWithNoReplenishmentSettingsOrZeroSuggestions_Returns200OkWithEmptyList()
    {
        // Regression test: Verifies that warehouse with no settings/suggestions loads cleanly with 200 OK and []
        var env = await SeedReplenishmentEnvironmentAsync(currentStock: 100m);
        var supClient = _factory.CreateUserClient(env.SupervisorUserId, "User");

        // Seed stock is 100m, reorder point is 20m -> stock is healthy, no suggestions needed
        var response = await supClient.GetAsync($"/api/warehouses/{env.WarehouseId}/replenishment/suggestions");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var suggestions = await response.Content.ReadFromJsonAsync<List<ReplenishmentSuggestionResponse>>(JsonOptions);
        Assert.NotNull(suggestions);
        Assert.Empty(suggestions);
    }

    [Fact]
    public async Task GetSettings_ReturnsConfiguredProductSettings_Success()
    {
        var env = await SeedReplenishmentEnvironmentAsync(currentStock: 50m);
        var supClient = _factory.CreateUserClient(env.SupervisorUserId, "User");

        // 1. Configure setting
        await supClient.PostAsJsonAsync($"/api/warehouses/{env.WarehouseId}/replenishment/settings", new UpsertWarehouseProductSettingRequest
        {
            WarehouseId = env.WarehouseId,
            ProductId = env.ProductId,
            ReorderPoint = 20m,
            TargetStockLevel = 100m,
            MinOrderQuantity = 5m
        });

        // 2. Fetch settings
        var response = await supClient.GetAsync($"/api/warehouses/{env.WarehouseId}/replenishment/settings");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var settings = await response.Content.ReadFromJsonAsync<List<WarehouseProductSettingResponse>>(JsonOptions);
        Assert.NotNull(settings);
        Assert.Single(settings);
        Assert.Equal(env.ProductId, settings[0].ProductId);
        Assert.Equal(20m, settings[0].ReorderPoint);
        Assert.Equal(100m, settings[0].TargetStockLevel);
    }
}
