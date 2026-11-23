using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using InventoryManagementSystem.Business.PurchaseOrders.DTOs;
using InventoryManagementSystem.Business.Suppliers.Stock.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace InventoryManagementSystem.IntegrationTests;

public class SupplierStockConcurrencyIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public SupplierStockConcurrencyIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestScheme");
    }

    private async Task<(Guid supplierId, Guid productId, Guid warehouseId)> SeedSupplierAndCatalogAsync(decimal initialSupplierStock = 50m)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();

        var categoryId = Guid.NewGuid();
        db.Categories.Add(new Category
        {
            Id = categoryId,
            Name = "Test Category " + Guid.NewGuid().ToString("N")[..6],
            IsActive = true
        });

        var uomId = Guid.NewGuid();
        db.UnitOfMeasures.Add(new UnitOfMeasure
        {
            Id = uomId,
            Name = "Piece",
            Code = "pcs" + Guid.NewGuid().ToString("N")[..4],
            IsActive = true
        });

        var productId = Guid.NewGuid();
        db.Products.Add(new Product
        {
            Id = productId,
            Name = "Test Component " + Guid.NewGuid().ToString("N")[..6],
            Sku = "COMP-" + Guid.NewGuid().ToString("N")[..6].ToUpper(),
            CategoryId = categoryId,
            UnitOfMeasureId = uomId,
            SellingPrice = 45.00m,
            ReorderThreshold = 10,
            IsActive = true
        });

        var supplierId = Guid.NewGuid();
        db.Suppliers.Add(new Supplier
        {
            Id = supplierId,
            Name = "Reliable Parts " + Guid.NewGuid().ToString("N")[..6],
            Email = "parts@reliable.test",
            Phone = "+15551234",
            CanSupplyAllCategories = true,
            CanSupplyAllBrands = true,
            IsActive = true
        });

        var warehouseId = Guid.NewGuid();
        db.Warehouses.Add(new Warehouse
        {
            Id = warehouseId,
            Name = "Central Depot " + Guid.NewGuid().ToString("N")[..6],
            Code = "DEP-" + Guid.NewGuid().ToString("N")[..4].ToUpper(),
            Address = "100 Industrial Parkway",
            CanAcceptAllCategories = true,
            IsActive = true
        });

        // Supplier catalog mapping
        db.SupplierProducts.Add(new SupplierProduct
        {
            Id = Guid.NewGuid(),
            SupplierId = supplierId,
            ProductId = productId,
            SupplierProductCode = "SUP-COMP-01",
            LastPurchasePrice = 25.00m,
            LeadTimeDays = 3,
            IsPreferred = true,
            IsActive = true
        });

        // Initial supplier replenishment to establish On-Hand and ATP
        if (initialSupplierStock > 0)
        {
            db.SupplierStockMovements.Add(new SupplierStockMovement
            {
                Id = Guid.NewGuid(),
                SupplierId = supplierId,
                ProductId = productId,
                MovementType = DataAccess.Enums.SupplierStockMovementType.ExternalReplenishment,
                Quantity = initialSupplierStock,
                UnitCost = 25.00m,
                ReferenceType = "SeedReplenishment",
                ReferenceId = $"SEED-{Guid.NewGuid():N}",
                Notes = "Initial test stock replenishment",
                CreatedByUserId = TestAuthHandler.DefaultUserId,
                CreatedAt = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync();
        return (supplierId, productId, warehouseId);
    }

    [Fact]
    public async Task SubmitPurchaseOrder_WithInsufficientSupplierStock_ShouldFailWithBadRequest()
    {
        // ARRANGE: Supplier has 50 units
        var (supplierId, productId, warehouseId) = await SeedSupplierAndCatalogAsync(initialSupplierStock: 50m);

        // Create PO requesting 80 units (exceeds 50 available)
        var createPoReq = new CreatePurchaseOrderRequest
        {
            SupplierId = supplierId,
            WarehouseId = warehouseId,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new()
                {
                    ProductId = productId,
                    QuantityOrdered = 80m,
                    UnitCost = 25.00m
                }
            }
        };

        var createRes = await _client.PostAsJsonAsync("/api/purchase-orders", createPoReq);
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var createdPo = await createRes.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(createdPo);

        // ACT: Attempt to submit/reserve
        var submitRes = await _client.PostAsync($"/api/purchase-orders/{createdPo.Id}/submit", null);

        // ASSERT: Rejected with 400 BadRequest due to insufficient ATP
        Assert.Equal(HttpStatusCode.BadRequest, submitRes.StatusCode);
        var errJson = await submitRes.Content.ReadAsStringAsync();
        Assert.Contains("Insufficient supplier stock", errJson, StringComparison.OrdinalIgnoreCase);

        // Verify ATP remains 50
        var stockRes = await _client.GetAsync($"/api/suppliers/{supplierId}/stock/{productId}");
        Assert.Equal(HttpStatusCode.OK, stockRes.StatusCode);
        var stockSummary = await stockRes.Content.ReadFromJsonAsync<SupplierStockSummaryResponse>();
        Assert.NotNull(stockSummary);
        Assert.Equal(50m, stockSummary.OnHandQuantity);
        Assert.Equal(0m, stockSummary.ReservedQuantity);
        Assert.Equal(50m, stockSummary.AvailableToPromiseQuantity);
    }

    [Fact]
    public async Task SubmitPurchaseOrder_WithinAvailableSupplierStock_ReservesStockAndReducesATP()
    {
        // ARRANGE: Supplier has 50 units
        var (supplierId, productId, warehouseId) = await SeedSupplierAndCatalogAsync(initialSupplierStock: 50m);

        // Create PO requesting 20 units
        var createPoReq = new CreatePurchaseOrderRequest
        {
            SupplierId = supplierId,
            WarehouseId = warehouseId,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new()
                {
                    ProductId = productId,
                    QuantityOrdered = 20m,
                    UnitCost = 25.00m
                }
            }
        };

        var createRes = await _client.PostAsJsonAsync("/api/purchase-orders", createPoReq);
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var createdPo = await createRes.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(createdPo);

        // ACT: Submit PO
        var submitRes = await _client.PostAsync($"/api/purchase-orders/{createdPo.Id}/submit", null);
        Assert.Equal(HttpStatusCode.OK, submitRes.StatusCode);

        // ASSERT: Stock reservation is authoritative
        var stockRes = await _client.GetAsync($"/api/suppliers/{supplierId}/stock/{productId}");
        var stockSummary = await stockRes.Content.ReadFromJsonAsync<SupplierStockSummaryResponse>();
        Assert.NotNull(stockSummary);
        Assert.Equal(50m, stockSummary.OnHandQuantity);
        Assert.Equal(20m, stockSummary.ReservedQuantity);
        Assert.Equal(30m, stockSummary.AvailableToPromiseQuantity);

        // ACT 2: Cancel PO should release the reservation
        var cancelRes = await _client.PostAsync($"/api/purchase-orders/{createdPo.Id}/cancel?reason=Customer+changed+mind", null);
        Assert.Equal(HttpStatusCode.OK, cancelRes.StatusCode);

        // Verify ATP is restored to 50
        var postCancelRes = await _client.GetAsync($"/api/suppliers/{supplierId}/stock/{productId}");
        var postCancelSummary = await postCancelRes.Content.ReadFromJsonAsync<SupplierStockSummaryResponse>();
        Assert.NotNull(postCancelSummary);
        Assert.Equal(50m, postCancelSummary.OnHandQuantity);
        Assert.Equal(0m, postCancelSummary.ReservedQuantity);
        Assert.Equal(50m, postCancelSummary.AvailableToPromiseQuantity);
    }

    [Fact]
    public async Task SimultaneousPurchaseOrderSubmissions_CompeteForLimitedSupplierStock_PreventsOverselling()
    {
        // ARRANGE: Supplier has exactly 50 units
        var (supplierId, productId, warehouseId) = await SeedSupplierAndCatalogAsync(initialSupplierStock: 50m);

        // Order 1 requests 35 units
        var po1Res = await _client.PostAsJsonAsync("/api/purchase-orders", new CreatePurchaseOrderRequest
        {
            SupplierId = supplierId,
            WarehouseId = warehouseId,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new() { ProductId = productId, QuantityOrdered = 35m, UnitCost = 25.00m }
            }
        });
        Assert.Equal(HttpStatusCode.Created, po1Res.StatusCode);
        var po1 = await po1Res.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(po1);

        // Order 2 requests 30 units (35 + 30 = 65 > 50)
        var po2Res = await _client.PostAsJsonAsync("/api/purchase-orders", new CreatePurchaseOrderRequest
        {
            SupplierId = supplierId,
            WarehouseId = warehouseId,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new() { ProductId = productId, QuantityOrdered = 30m, UnitCost = 25.00m }
            }
        });
        Assert.Equal(HttpStatusCode.Created, po2Res.StatusCode);
        var po2 = await po2Res.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(po2);

        // ACT: Competing simultaneous order submissions
        var task1 = _client.PostAsync($"/api/purchase-orders/{po1.Id}/submit", null);
        var task2 = _client.PostAsync($"/api/purchase-orders/{po2.Id}/submit", null);

        HttpResponseMessage[] responses = await Task.WhenAll(task1, task2);

        // ASSERT: Exactly one order succeeds, the other is rejected (prevents overselling)
        int successCount = responses.Count(r => r.IsSuccessStatusCode);
        int failureCount = responses.Count(r => !r.IsSuccessStatusCode);

        Assert.Equal(1, successCount);
        Assert.Equal(1, failureCount);

        // Check that failure was due to insufficient stock or conflict
        var failedResponse = responses.First(r => !r.IsSuccessStatusCode);
        Assert.True(
            failedResponse.StatusCode == HttpStatusCode.BadRequest || failedResponse.StatusCode == HttpStatusCode.Conflict,
            $"Expected BadRequest or Conflict but got {failedResponse.StatusCode}");

        // Authoritative stock ledger check: Reserved must never exceed 50
        var stockRes = await _client.GetAsync($"/api/suppliers/{supplierId}/stock/{productId}");
        var stockSummary = await stockRes.Content.ReadFromJsonAsync<SupplierStockSummaryResponse>();
        Assert.NotNull(stockSummary);
        Assert.Equal(50m, stockSummary.OnHandQuantity);
        Assert.True(stockSummary.ReservedQuantity <= 50m, $"Reserved quantity {stockSummary.ReservedQuantity} exceeded on-hand!");
        Assert.True(stockSummary.AvailableToPromiseQuantity >= 0m, $"Available to promise {stockSummary.AvailableToPromiseQuantity} dropped below 0!");
        
        // Exact reserved should be either 35 or 30 depending on who won the race
        Assert.True(stockSummary.ReservedQuantity == 35m || stockSummary.ReservedQuantity == 30m);
    }
}
