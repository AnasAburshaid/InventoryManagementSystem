using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.Products.DTOs;
using InventoryManagementSystem.Business.PurchaseOrders.DTOs;
using InventoryManagementSystem.Business.StockMovements.DTOs;
using InventoryManagementSystem.Business.SupplierProducts.DTOs;
using InventoryManagementSystem.Business.Suppliers.DTOs;
using InventoryManagementSystem.Business.Suppliers.Stock.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace InventoryManagementSystem.IntegrationTests;

public class SupplierWarehouseCapabilityIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public SupplierWarehouseCapabilityIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestScheme");
    }

    private class TestScenarioContext
    {
        public Guid ProduceCategoryId { get; set; }
        public Guid ElectronicsCategoryId { get; set; }
        public Guid AppleProductId { get; set; }
        public Guid PhoneProductId { get; set; }
        public Guid FruitSupplierId { get; set; }
        public Guid ElectronicsSupplierId { get; set; }
        public Guid ProduceWarehouseId { get; set; }
        public Guid ElectronicsWarehouseId { get; set; }
        public Guid UniversalWarehouseId { get; set; }
    }

    private async Task<TestScenarioContext> SeedScenarioAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();

        var suffix = Guid.NewGuid().ToString("N")[..6];

        // 1. Categories
        var produceCat = new Category
        {
            Id = Guid.NewGuid(),
            Name = "Produce " + suffix,
            IsActive = true
        };
        var electronicsCat = new Category
        {
            Id = Guid.NewGuid(),
            Name = "Electronics " + suffix,
            IsActive = true
        };
        db.Categories.AddRange(produceCat, electronicsCat);

        // 2. Unit of Measure
        var uom = new UnitOfMeasure
        {
            Id = Guid.NewGuid(),
            Name = "Piece " + suffix,
            Code = "pc" + suffix[..3],
            IsActive = true
        };
        db.UnitOfMeasures.Add(uom);

        // 3. Products
        var appleProduct = new Product
        {
            Id = Guid.NewGuid(),
            Name = "Crisp Honeycrisp Apples " + suffix,
            Sku = "APP-" + suffix.ToUpper(),
            CategoryId = produceCat.Id,
            UnitOfMeasureId = uom.Id,
            SellingPrice = 3.50m,
            ReorderThreshold = 20,
            IsActive = true
        };
        var phoneProduct = new Product
        {
            Id = Guid.NewGuid(),
            Name = "Galaxy Smartphone " + suffix,
            Sku = "PHN-" + suffix.ToUpper(),
            CategoryId = electronicsCat.Id,
            UnitOfMeasureId = uom.Id,
            SellingPrice = 799.00m,
            ReorderThreshold = 5,
            IsActive = true
        };
        db.Products.AddRange(appleProduct, phoneProduct);

        // 4. Suppliers: Saif Produce (Fruit only) vs Qusai Electronics (Electronics only)
        var fruitSupplier = new Supplier
        {
            Id = Guid.NewGuid(),
            Name = "Saif Produce " + suffix,
            Email = $"saif_{suffix}@produce.test",
            Phone = "+1555-FRUIT",
            CanSupplyAllCategories = false,
            CanSupplyAllBrands = true,
            IsActive = true
        };
        var electronicsSupplier = new Supplier
        {
            Id = Guid.NewGuid(),
            Name = "Qusai Electronics " + suffix,
            Email = $"qusai_{suffix}@electro.test",
            Phone = "+1555-ELECT",
            CanSupplyAllCategories = false,
            CanSupplyAllBrands = true,
            IsActive = true
        };
        db.Suppliers.AddRange(fruitSupplier, electronicsSupplier);

        // Category Capabilities
        db.SupplierCategoryCapabilities.Add(new SupplierCategoryCapability
        {
            Id = Guid.NewGuid(),
            SupplierId = fruitSupplier.Id,
            CategoryId = produceCat.Id,
            CreatedAt = DateTime.UtcNow
        });
        db.SupplierCategoryCapabilities.Add(new SupplierCategoryCapability
        {
            Id = Guid.NewGuid(),
            SupplierId = electronicsSupplier.Id,
            CategoryId = electronicsCat.Id,
            CreatedAt = DateTime.UtcNow
        });

        // Supplier Catalogs
        db.SupplierProducts.Add(new SupplierProduct
        {
            Id = Guid.NewGuid(),
            SupplierId = fruitSupplier.Id,
            ProductId = appleProduct.Id,
            SupplierProductCode = "SUP-APP-01",
            LastPurchasePrice = 1.80m,
            LeadTimeDays = 2,
            IsPreferred = true,
            IsActive = true
        });
        db.SupplierProducts.Add(new SupplierProduct
        {
            Id = Guid.NewGuid(),
            SupplierId = electronicsSupplier.Id,
            ProductId = phoneProduct.Id,
            SupplierProductCode = "SUP-PHN-01",
            LastPurchasePrice = 450.00m,
            LeadTimeDays = 5,
            IsPreferred = true,
            IsActive = true
        });

        // Initial tracked stock for electronics supplier: 50 units
        db.SupplierStockMovements.Add(new SupplierStockMovement
        {
            Id = Guid.NewGuid(),
            SupplierId = electronicsSupplier.Id,
            ProductId = phoneProduct.Id,
            MovementType = SupplierStockMovementType.ExternalReplenishment,
            Quantity = 50m,
            UnitCost = 450.00m,
            ReferenceType = "SeedReplenishment",
            ReferenceId = $"SEED-{Guid.NewGuid():N}",
            Notes = "Seed electronics stock",
            CreatedByUserId = TestAuthHandler.DefaultUserId,
            CreatedAt = DateTime.UtcNow
        });

        // 5. Warehouses: Cold Storage (Produce only), Tech Depot (Electronics only), Universal Depot (Unrestricted)
        var produceWh = new Warehouse
        {
            Id = Guid.NewGuid(),
            Name = "Saif Cold Storage " + suffix,
            Code = "COLD-" + suffix[..3].ToUpper(),
            Address = "Cold Bay",
            CanAcceptAllCategories = false,
            IsActive = true
        };
        var electronicsWh = new Warehouse
        {
            Id = Guid.NewGuid(),
            Name = "Tech Depot " + suffix,
            Code = "TECH-" + suffix[..3].ToUpper(),
            Address = "Silicon Street",
            CanAcceptAllCategories = false,
            IsActive = true
        };
        var universalWh = new Warehouse
        {
            Id = Guid.NewGuid(),
            Name = "Universal Logistics " + suffix,
            Code = "UNI-" + suffix[..3].ToUpper(),
            Address = "Central Highway",
            CanAcceptAllCategories = true,
            IsActive = true
        };
        db.Warehouses.AddRange(produceWh, electronicsWh, universalWh);

        // Warehouse Restrictions
        db.WarehouseCategoryRestrictions.Add(new WarehouseCategoryRestriction
        {
            Id = Guid.NewGuid(),
            WarehouseId = produceWh.Id,
            CategoryId = produceCat.Id,
            CreatedAt = DateTime.UtcNow
        });
        db.WarehouseCategoryRestrictions.Add(new WarehouseCategoryRestriction
        {
            Id = Guid.NewGuid(),
            WarehouseId = electronicsWh.Id,
            CategoryId = electronicsCat.Id,
            CreatedAt = DateTime.UtcNow
        });

        // Assign Test Admin access to all three warehouses
        foreach (var wh in new[] { produceWh, electronicsWh, universalWh })
        {
            db.WarehouseAssignments.Add(new WarehouseAssignment
            {
                Id = Guid.NewGuid(),
                UserId = TestAuthHandler.DefaultUserId,
                WarehouseId = wh.Id,
                Role = WarehouseAssignmentRole.Manager,
                IsActive = true
            });
        }

        await db.SaveChangesAsync();

        return new TestScenarioContext
        {
            ProduceCategoryId = produceCat.Id,
            ElectronicsCategoryId = electronicsCat.Id,
            AppleProductId = appleProduct.Id,
            PhoneProductId = phoneProduct.Id,
            FruitSupplierId = fruitSupplier.Id,
            ElectronicsSupplierId = electronicsSupplier.Id,
            ProduceWarehouseId = produceWh.Id,
            ElectronicsWarehouseId = electronicsWh.Id,
            UniversalWarehouseId = universalWh.Id
        };
    }

    [Fact]
    public async Task Test1_ElectronicsSupplier_CannotSupplyApples_ReturnsBadRequest()
    {
        // ARRANGE: Qusai Electronics does not supply apples
        var ctx = await SeedScenarioAsync();

        var request = new RecordMovementRequest
        {
            ProductId = ctx.AppleProductId,
            WarehouseId = ctx.UniversalWarehouseId,
            SupplierId = ctx.ElectronicsSupplierId,
            Quantity = 10,
            Type = StockMovementType.Purchase,
            ReferenceType = "PO",
            ReferenceId = "TEST-PO-01"
        };

        // ACT: Attempt to record purchase of apples from electronics supplier
        var response = await _client.PostAsJsonAsync($"/api/warehouses/{ctx.UniversalWarehouseId}/stock-movements", request);

        // ASSERT: 400 BadRequest with capability error
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var errJson = await response.Content.ReadAsStringAsync();
        Assert.Contains("not authorized", errJson, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Test2_ElectronicsWarehouse_CannotReceiveApples_ReturnsBadRequest()
    {
        // ARRANGE: Tech Depot only accepts electronics; apples are produce
        var ctx = await SeedScenarioAsync();

        var request = new RecordMovementRequest
        {
            ProductId = ctx.AppleProductId,
            WarehouseId = ctx.ElectronicsWarehouseId,
            SupplierId = ctx.FruitSupplierId,
            Quantity = 10,
            Type = StockMovementType.Purchase,
            ReferenceType = "PO",
            ReferenceId = "TEST-PO-02"
        };

        // ACT: Attempt to receive apples into electronics-only warehouse
        var response = await _client.PostAsJsonAsync($"/api/warehouses/{ctx.ElectronicsWarehouseId}/stock-movements", request);

        // ASSERT: 400 BadRequest with category restriction error
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var errJson = await response.Content.ReadAsStringAsync();
        Assert.True(
            errJson.Contains("not authorized to accept products", StringComparison.OrdinalIgnoreCase) ||
            errJson.Contains("cannot accept products of category", StringComparison.OrdinalIgnoreCase) ||
            errJson.Contains("facility restrictions", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task Test3_CompatibleSupplierAndWarehouse_CanCompletePurchaseSuccessfully()
    {
        // ARRANGE: Qusai Electronics supplies phones, Tech Depot accepts electronics
        var ctx = await SeedScenarioAsync();

        var request = new RecordMovementRequest
        {
            ProductId = ctx.PhoneProductId,
            WarehouseId = ctx.ElectronicsWarehouseId,
            SupplierId = ctx.ElectronicsSupplierId,
            Quantity = 10,
            Type = StockMovementType.Purchase,
            ReferenceType = "PO",
            ReferenceId = "TEST-PO-VALID"
        };

        // ACT: Execute valid purchase
        var response = await _client.PostAsJsonAsync($"/api/warehouses/{ctx.ElectronicsWarehouseId}/stock-movements", request);

        // ASSERT: 201 Created
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        // Verify warehouse stock increased by 10
        var stockRes = await _client.GetAsync($"/api/warehouses/{ctx.ElectronicsWarehouseId}/stock-movements/products/{ctx.PhoneProductId}/current-stock");
        var stockContent = await stockRes.Content.ReadAsStringAsync();
        Assert.Equal(10m, decimal.Parse(stockContent));

        // Verify supplier ATP reduced from 50 to 40
        var supStockRes = await _client.GetAsync($"/api/suppliers/{ctx.ElectronicsSupplierId}/stock/{ctx.PhoneProductId}");
        var supStock = await supStockRes.Content.ReadFromJsonAsync<SupplierStockSummaryResponse>();
        Assert.NotNull(supStock);
        Assert.Equal(40m, supStock.AvailableToPromiseQuantity);
        Assert.Equal(40m, supStock.OnHandQuantity);
    }

    [Fact]
    public async Task Test4_SupplierReplenishment_IncreasesOnHandAndATP()
    {
        // ARRANGE
        var ctx = await SeedScenarioAsync();

        var replenishReq = new RecordSupplierReplenishmentRequest
        {
            ProductId = ctx.PhoneProductId,
            Quantity = 100m,
            UnitCost = 440.00m,
            ReferenceId = "EXT-REP-2026",
            Notes = "Container from Shenzhen"
        };

        // ACT
        var response = await _client.PostAsJsonAsync($"/api/suppliers/{ctx.ElectronicsSupplierId}/stock/replenish", replenishReq);
        Assert.True(response.IsSuccessStatusCode);

        // ASSERT: On-Hand was 50, now 150
        var stockRes = await _client.GetAsync($"/api/suppliers/{ctx.ElectronicsSupplierId}/stock/{ctx.PhoneProductId}");
        var summary = await stockRes.Content.ReadFromJsonAsync<SupplierStockSummaryResponse>();
        Assert.NotNull(summary);
        Assert.Equal(150m, summary.OnHandQuantity);
        Assert.Equal(150m, summary.AvailableToPromiseQuantity);
    }

    [Fact]
    public async Task Test5_PurchaseOrderReservation_ReducesATP_WithoutChangingOnHandStock()
    {
        // ARRANGE: Supplier has 50 phones
        var ctx = await SeedScenarioAsync();

        var createPoReq = new CreatePurchaseOrderRequest
        {
            SupplierId = ctx.ElectronicsSupplierId,
            WarehouseId = ctx.ElectronicsWarehouseId,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new() { ProductId = ctx.PhoneProductId, QuantityOrdered = 20m, UnitCost = 450.00m }
            }
        };

        var createRes = await _client.PostAsJsonAsync("/api/purchase-orders", createPoReq);
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var po = await createRes.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(po);

        // ACT: Submit PO
        var submitRes = await _client.PostAsync($"/api/purchase-orders/{po.Id}/submit", null);
        Assert.Equal(HttpStatusCode.OK, submitRes.StatusCode);

        // ASSERT: On-Hand = 50, Reserved = 20, ATP = 30
        var stockRes = await _client.GetAsync($"/api/suppliers/{ctx.ElectronicsSupplierId}/stock/{ctx.PhoneProductId}");
        var summary = await stockRes.Content.ReadFromJsonAsync<SupplierStockSummaryResponse>();
        Assert.NotNull(summary);
        Assert.Equal(50m, summary.OnHandQuantity);
        Assert.Equal(20m, summary.ReservedQuantity);
        Assert.Equal(30m, summary.AvailableToPromiseQuantity);
    }

    [Fact]
    public async Task Test6_WarehouseReceipt_TransfersStockFromSupplierToWarehouse_WithoutDoubleCounting()
    {
        // ARRANGE: PO for 20 units submitted
        var ctx = await SeedScenarioAsync();

        var createPoReq = new CreatePurchaseOrderRequest
        {
            SupplierId = ctx.ElectronicsSupplierId,
            WarehouseId = ctx.ElectronicsWarehouseId,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new() { ProductId = ctx.PhoneProductId, QuantityOrdered = 20m, UnitCost = 450.00m }
            }
        };

        var createRes = await _client.PostAsJsonAsync("/api/purchase-orders", createPoReq);
        var po = await createRes.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(po);
        await _client.PostAsync($"/api/purchase-orders/{po.Id}/submit", null);

        var line = po.Lines.First();

        // ACT: Receive full 20 units into warehouse
        var receiveReq = new ReceivePurchaseOrderRequest
        {
            ReceiptReferenceId = "REC-DOC-001",
            Items = new List<ReceivePurchaseOrderLineItem>
            {
                new() { PurchaseOrderLineId = line.Id, QuantityToReceive = 20m, Notes = "Dock reception inspection passed" }
            }
        };

        var receiveRes = await _client.PostAsJsonAsync($"/api/purchase-orders/{po.Id}/receive", receiveReq);
        Assert.Equal(HttpStatusCode.OK, receiveRes.StatusCode);

        // ASSERT 1: Supplier stock is deducted (On-Hand: 50 -> 30, Reserved: 20 -> 0, ATP: 30)
        var supStockRes = await _client.GetAsync($"/api/suppliers/{ctx.ElectronicsSupplierId}/stock/{ctx.PhoneProductId}");
        var supSummary = await supStockRes.Content.ReadFromJsonAsync<SupplierStockSummaryResponse>();
        Assert.NotNull(supSummary);
        Assert.Equal(30m, supSummary.OnHandQuantity);
        Assert.Equal(0m, supSummary.ReservedQuantity);
        Assert.Equal(30m, supSummary.AvailableToPromiseQuantity);

        // ASSERT 2: Warehouse stock increased to exactly 20
        var whStockRes = await _client.GetAsync($"/api/warehouses/{ctx.ElectronicsWarehouseId}/stock-movements/products/{ctx.PhoneProductId}/current-stock");
        var whStock = decimal.Parse(await whStockRes.Content.ReadAsStringAsync());
        Assert.Equal(20m, whStock);

        // Conservation of inventory: 30 (supplier) + 20 (warehouse) == 50 (initial)
        Assert.Equal(50m, supSummary.OnHandQuantity + whStock);
    }

    [Fact]
    public async Task Test7_PartialReceipt_AndCancellation_PreservesRemainingReservation()
    {
        // ARRANGE: Supplier starts with 50 units. Order 40 units.
        var ctx = await SeedScenarioAsync();

        var createPoReq = new CreatePurchaseOrderRequest
        {
            SupplierId = ctx.ElectronicsSupplierId,
            WarehouseId = ctx.ElectronicsWarehouseId,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new() { ProductId = ctx.PhoneProductId, QuantityOrdered = 40m, UnitCost = 450.00m }
            }
        };

        var createRes = await _client.PostAsJsonAsync("/api/purchase-orders", createPoReq);
        var po = await createRes.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(po);
        await _client.PostAsync($"/api/purchase-orders/{po.Id}/submit", null);
        var line = po.Lines.First();

        // ACT 1: Receive partial 15 units
        var partialReceiveReq = new ReceivePurchaseOrderRequest
        {
            ReceiptReferenceId = "REC-PARTIAL-01",
            Items = new List<ReceivePurchaseOrderLineItem>
            {
                new() { PurchaseOrderLineId = line.Id, QuantityToReceive = 15m }
            }
        };
        var partRes = await _client.PostAsJsonAsync($"/api/purchase-orders/{po.Id}/receive", partialReceiveReq);
        Assert.Equal(HttpStatusCode.OK, partRes.StatusCode);

        // ASSERT 1: Supplier On-Hand = 35 (50 - 15), Reserved = 25 (40 - 15), ATP = 10 (35 - 25)
        var supStockRes1 = await _client.GetAsync($"/api/suppliers/{ctx.ElectronicsSupplierId}/stock/{ctx.PhoneProductId}");
        var sup1 = await supStockRes1.Content.ReadFromJsonAsync<SupplierStockSummaryResponse>();
        Assert.NotNull(sup1);
        Assert.Equal(35m, sup1.OnHandQuantity);
        Assert.Equal(25m, sup1.ReservedQuantity);
        Assert.Equal(10m, sup1.AvailableToPromiseQuantity);

        // ACT 2: Attempting to cancel a partially received PO is rejected
        var cancelRes = await _client.PostAsync($"/api/purchase-orders/{po.Id}/cancel?reason=Backorder+cancelled", null);
        Assert.Equal(HttpStatusCode.BadRequest, cancelRes.StatusCode);
        var cancelErr = await cancelRes.Content.ReadAsStringAsync();
        Assert.Contains("Cannot cancel a purchase order with status", cancelErr, StringComparison.OrdinalIgnoreCase);

        // ACT 3: Complete the remaining 25 units receipt
        var finalReceiveReq = new ReceivePurchaseOrderRequest
        {
            ReceiptReferenceId = "REC-FINAL-01",
            Items = new List<ReceivePurchaseOrderLineItem>
            {
                new() { PurchaseOrderLineId = line.Id, QuantityToReceive = 25m }
            }
        };
        var finalRes = await _client.PostAsJsonAsync($"/api/purchase-orders/{po.Id}/receive", finalReceiveReq);
        Assert.Equal(HttpStatusCode.OK, finalRes.StatusCode);

        // ASSERT 2: Full order received. On-Hand = 10 (50 - 40), Reserved = 0, ATP = 10
        var supStockRes2 = await _client.GetAsync($"/api/suppliers/{ctx.ElectronicsSupplierId}/stock/{ctx.PhoneProductId}");
        var sup2 = await supStockRes2.Content.ReadFromJsonAsync<SupplierStockSummaryResponse>();
        Assert.NotNull(sup2);
        Assert.Equal(10m, sup2.OnHandQuantity);
        Assert.Equal(0m, sup2.ReservedQuantity);
        Assert.Equal(10m, sup2.AvailableToPromiseQuantity);
    }

    [Fact]
    public async Task Test8_DuplicateReceiptRequest_WithSameDocumentReference_IsRejected()
    {
        // ARRANGE: PO for 20 units
        var ctx = await SeedScenarioAsync();

        var createPoReq = new CreatePurchaseOrderRequest
        {
            SupplierId = ctx.ElectronicsSupplierId,
            WarehouseId = ctx.ElectronicsWarehouseId,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new() { ProductId = ctx.PhoneProductId, QuantityOrdered = 20m, UnitCost = 450.00m }
            }
        };

        var createRes = await _client.PostAsJsonAsync("/api/purchase-orders", createPoReq);
        var po = await createRes.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(po);
        await _client.PostAsync($"/api/purchase-orders/{po.Id}/submit", null);
        var line = po.Lines.First();

        var receiptReq = new ReceivePurchaseOrderRequest
        {
            ReceiptReferenceId = "DOC-IDEMPOTENT-007",
            Items = new List<ReceivePurchaseOrderLineItem>
            {
                new() { PurchaseOrderLineId = line.Id, QuantityToReceive = 10m }
            }
        };

        // ACT 1: First receipt succeeds
        var res1 = await _client.PostAsJsonAsync($"/api/purchase-orders/{po.Id}/receive", receiptReq);
        Assert.Equal(HttpStatusCode.OK, res1.StatusCode);

        // ACT 2: Duplicate receipt with same ReceiptReferenceId
        var res2 = await _client.PostAsJsonAsync($"/api/purchase-orders/{po.Id}/receive", receiptReq);

        // ASSERT 2: Rejected with 400 BadRequest
        Assert.Equal(HttpStatusCode.BadRequest, res2.StatusCode);
        var errContent = await res2.Content.ReadAsStringAsync();
        Assert.Contains("already been processed", errContent, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Test9_ConcurrentPurchaseOrders_CompeteForLimitedStock_PreventOverselling()
    {
        // ARRANGE: Supplier has 50 units
        var ctx = await SeedScenarioAsync();

        // Order 1: 30 units
        var po1Res = await _client.PostAsJsonAsync("/api/purchase-orders", new CreatePurchaseOrderRequest
        {
            SupplierId = ctx.ElectronicsSupplierId,
            WarehouseId = ctx.ElectronicsWarehouseId,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new() { ProductId = ctx.PhoneProductId, QuantityOrdered = 30m, UnitCost = 450.00m }
            }
        });
        var po1 = await po1Res.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(po1);

        // Order 2: 30 units (30 + 30 = 60 > 50)
        var po2Res = await _client.PostAsJsonAsync("/api/purchase-orders", new CreatePurchaseOrderRequest
        {
            SupplierId = ctx.ElectronicsSupplierId,
            WarehouseId = ctx.ElectronicsWarehouseId,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new() { ProductId = ctx.PhoneProductId, QuantityOrdered = 30m, UnitCost = 450.00m }
            }
        });
        var po2 = await po2Res.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(po2);

        // ACT: Competing submissions
        var t1 = _client.PostAsync($"/api/purchase-orders/{po1.Id}/submit", null);
        var t2 = _client.PostAsync($"/api/purchase-orders/{po2.Id}/submit", null);
        var responses = await Task.WhenAll(t1, t2);

        // ASSERT: Exactly one succeeds, one fails
        Assert.Equal(1, responses.Count(r => r.IsSuccessStatusCode));
        Assert.Equal(1, responses.Count(r => !r.IsSuccessStatusCode));

        // Total reserved cannot exceed on-hand
        var stockRes = await _client.GetAsync($"/api/suppliers/{ctx.ElectronicsSupplierId}/stock/{ctx.PhoneProductId}");
        var summary = await stockRes.Content.ReadFromJsonAsync<SupplierStockSummaryResponse>();
        Assert.NotNull(summary);
        Assert.Equal(50m, summary.OnHandQuantity);
        Assert.Equal(30m, summary.ReservedQuantity);
        Assert.Equal(20m, summary.AvailableToPromiseQuantity);
    }

    [Fact]
    public async Task Test10_SupplierProductCatalog_ReturnsProductsWithCategoryName()
    {
        // ARRANGE
        var ctx = await SeedScenarioAsync();

        // ACT: Get catalog for Qusai Electronics
        var response = await _client.GetAsync($"/api/supplier-products/supplier/{ctx.ElectronicsSupplierId}");

        // ASSERT: 200 OK and CategoryName is populated
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var catalog = await response.Content.ReadFromJsonAsync<List<SupplierProductResponse>>();
        Assert.NotNull(catalog);
        Assert.NotEmpty(catalog);

        var phoneItem = catalog.First(p => p.ProductId == ctx.PhoneProductId);
        Assert.NotNull(phoneItem.CategoryName);
        Assert.Contains("Electronics", phoneItem.CategoryName, StringComparison.OrdinalIgnoreCase);
        Assert.True(phoneItem.IsPreferred);
    }

    [Fact]
    public async Task Test11_SupplierStockSummary_ReturnsDatabaseAggregatedBalances_AndLastReplenishedAt()
    {
        // ARRANGE
        var ctx = await SeedScenarioAsync();

        // ACT: Get stock summary for Qusai Electronics
        var response = await _client.GetAsync($"/api/suppliers/{ctx.ElectronicsSupplierId}/stock");

        // ASSERT: 200 OK, populated balances and LastReplenishedAt
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var summaries = await response.Content.ReadFromJsonAsync<List<SupplierStockSummaryResponse>>();
        Assert.NotNull(summaries);
        Assert.NotEmpty(summaries);

        var phoneStock = summaries.First(s => s.ProductId == ctx.PhoneProductId);
        Assert.Equal(50m, phoneStock.OnHandQuantity);
        Assert.Equal(50m, phoneStock.AvailableToPromiseQuantity);
        Assert.NotNull(phoneStock.LastReplenishedAt);
        Assert.True(phoneStock.LastReplenishedAt <= DateTime.UtcNow);
    }

    [Fact]
    public async Task Test12_WarehouseEligibleProducts_And_ProductEligibleSuppliers_FilterCorrectly()
    {
        // ARRANGE
        var ctx = await SeedScenarioAsync();

        // ACT 1: Warehouse Eligible Products for Tech Depot (Electronics only)
        var whRes = await _client.GetAsync($"/api/warehouses/{ctx.ElectronicsWarehouseId}/eligible-products");
        Assert.Equal(HttpStatusCode.OK, whRes.StatusCode);
        var whProds = await whRes.Content.ReadFromJsonAsync<List<ProductResponse>>();
        Assert.NotNull(whProds);

        // Tech Depot MUST contain phone and MUST NOT contain apple
        Assert.Contains(whProds, p => p.Id == ctx.PhoneProductId);
        Assert.DoesNotContain(whProds, p => p.Id == ctx.AppleProductId);

        // ACT 2: Product Eligible Suppliers for Honeycrisp Apples
        var prodRes = await _client.GetAsync($"/api/products/{ctx.AppleProductId}/eligible-suppliers");
        Assert.Equal(HttpStatusCode.OK, prodRes.StatusCode);
        var suppliers = await prodRes.Content.ReadFromJsonAsync<List<EligibleSupplierDto>>();
        Assert.NotNull(suppliers);

        // Saif Produce MUST be eligible; Qusai Electronics MUST NOT be eligible
        Assert.Contains(suppliers, s => s.SupplierId == ctx.FruitSupplierId);
        Assert.DoesNotContain(suppliers, s => s.SupplierId == ctx.ElectronicsSupplierId);
    }

    [Fact]
    public async Task Test13_LinkingProductWithoutCode_AutoGeneratesSupplierProductCode()
    {
        // ARRANGE
        var ctx = await SeedScenarioAsync();

        // Create a new active produce product
        Guid newProductId;
        string productSku = "PEACH-" + Guid.NewGuid().ToString("N")[..4].ToUpper();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();
            var uom = db.UnitOfMeasures.First();
            var newProd = new Product
            {
                Id = Guid.NewGuid(),
                Name = "Fresh Peaches",
                Sku = productSku,
                CategoryId = ctx.ProduceCategoryId,
                UnitOfMeasureId = uom.Id,
                SellingPrice = 4.50m,
                ReorderThreshold = 10,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            db.Products.Add(newProd);
            await db.SaveChangesAsync();
            newProductId = newProd.Id;
        }

        // ACT: Link product to Saif Produce with NULL / empty supplier product code
        var createReq = new CreateSupplierProductRequest
        {
            SupplierId = ctx.FruitSupplierId,
            ProductId = newProductId,
            SupplierProductCode = null, // Left empty
            LastPurchasePrice = 2.25m,
            LeadTimeDays = 2,
            IsPreferred = false
        };

        var response = await _client.PostAsJsonAsync("/api/supplier-products", createReq);

        // ASSERT: 201 Created and code auto-generated
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<SupplierProductResponse>();
        Assert.NotNull(created);
        Assert.False(string.IsNullOrWhiteSpace(created.SupplierProductCode));
        Assert.StartsWith("SUP-", created.SupplierProductCode);
        Assert.Contains(productSku, created.SupplierProductCode);
    }

    [Fact]
    public async Task Test14_SettingPreferredSupplierProduct_Succeeds_AndReplacesPriorPreferred()
    {
        // ARRANGE
        var ctx = await SeedScenarioAsync();

        // Create a 2nd produce supplier authorized for Produce category
        Guid secondSupplierId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();
            var sup2 = new Supplier
            {
                Id = Guid.NewGuid(),
                Name = "Wasfi Organics " + Guid.NewGuid().ToString("N")[..4],
                IsActive = true,
                CanSupplyAllCategories = false,
                CanSupplyAllBrands = true,
                CreatedAt = DateTime.UtcNow
            };
            db.Suppliers.Add(sup2);
            db.SupplierCategoryCapabilities.Add(new SupplierCategoryCapability
            {
                Id = Guid.NewGuid(),
                SupplierId = sup2.Id,
                CategoryId = ctx.ProduceCategoryId,
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
            secondSupplierId = sup2.Id;
        }

        // Link the Apple product to second supplier (initially non-preferred)
        var linkReq = new CreateSupplierProductRequest
        {
            SupplierId = secondSupplierId,
            ProductId = ctx.AppleProductId,
            SupplierProductCode = "W-APP-1",
            LastPurchasePrice = 1.60m,
            LeadTimeDays = 1,
            IsPreferred = false
        };
        var linkRes = await _client.PostAsJsonAsync("/api/supplier-products", linkReq);
        Assert.Equal(HttpStatusCode.Created, linkRes.StatusCode);
        var secondLink = await linkRes.Content.ReadFromJsonAsync<SupplierProductResponse>();
        Assert.NotNull(secondLink);

        // ACT: Patch second link to preferred
        var patchRes = await _client.PatchAsync($"/api/supplier-products/{secondLink.Id}/preferred", null);

        // ASSERT: 200 OK and becomes preferred
        Assert.Equal(HttpStatusCode.OK, patchRes.StatusCode);
        var updatedSecond = await patchRes.Content.ReadFromJsonAsync<SupplierProductResponse>();
        Assert.NotNull(updatedSecond);
        Assert.True(updatedSecond.IsPreferred);

        // Verify the original supplier's link for Apple is no longer preferred
        var firstSupCatalog = await _client.GetFromJsonAsync<List<SupplierProductResponse>>($"/api/supplier-products/supplier/{ctx.FruitSupplierId}");
        Assert.NotNull(firstSupCatalog);
        var originalAppleLink = firstSupCatalog.First(l => l.ProductId == ctx.AppleProductId);
        Assert.False(originalAppleLink.IsPreferred);
    }

    [Fact]
    public async Task Test15_IneligibleProductLinkingAndPurchase_ReturnsBadRequestWithClearExplanation()
    {
        // ARRANGE
        var ctx = await SeedScenarioAsync();

        // ACT 1: Attempt to link Galaxy S24 (Electronics) to Saif Produce (Fruit only)
        var badLinkReq = new CreateSupplierProductRequest
        {
            SupplierId = ctx.FruitSupplierId,
            ProductId = ctx.PhoneProductId,
            SupplierProductCode = "BAD-ELEC",
            LastPurchasePrice = 700m,
            LeadTimeDays = 5,
            IsPreferred = false
        };
        var linkRes = await _client.PostAsJsonAsync("/api/supplier-products", badLinkReq);

        // ASSERT: 400 Bad Request, NOT 500 Internal Server Error
        Assert.Equal(HttpStatusCode.BadRequest, linkRes.StatusCode);
        var errBody = await linkRes.Content.ReadAsStringAsync();
        Assert.Contains("not authorized to supply products in category", errBody, StringComparison.OrdinalIgnoreCase);

        // ACT 2: Check eligible products endpoint for Saif Produce
        var eligRes = await _client.GetAsync($"/api/suppliers/{ctx.FruitSupplierId}/capabilities/eligible-products");
        Assert.Equal(HttpStatusCode.OK, eligRes.StatusCode);
        var eligProds = await eligRes.Content.ReadFromJsonAsync<List<ProductResponse>>();
        Assert.NotNull(eligProds);

        // Must include Apple and must NOT include Phone
        Assert.Contains(eligProds, p => p.Id == ctx.AppleProductId);
        Assert.DoesNotContain(eligProds, p => p.Id == ctx.PhoneProductId);
    }
}
