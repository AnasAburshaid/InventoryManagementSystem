using System.Net;
using System.Net.Http.Json;
using InventoryManagementSystem.Business.PurchaseOrders;
using InventoryManagementSystem.Business.PurchaseOrders.DTOs;
using InventoryManagementSystem.Business.SalesOrders;
using InventoryManagementSystem.Business.SalesOrders.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace InventoryManagementSystem.IntegrationTests;

public class OrderWorkflowIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public OrderWorkflowIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private record TestOrderEnvironment(
        Guid ProductId,
        Guid WarehouseId,
        Guid SupplierId,
        Guid CustomerId);

    private async Task<TestOrderEnvironment> SeedEnvironmentAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();

        var catId = Guid.NewGuid();
        db.Categories.Add(new Category { Id = catId, Name = "Workflow Category " + Guid.NewGuid().ToString("N")[..6], IsActive = true });

        var uomId = Guid.NewGuid();
        db.UnitOfMeasures.Add(new UnitOfMeasure { Id = uomId, Name = "Piece", Code = "u" + Guid.NewGuid().ToString("N")[..4], IsActive = true });

        var prodId = Guid.NewGuid();
        db.Products.Add(new Product
        {
            Id = prodId,
            Name = "Workflow Test Product",
            Sku = "WF-" + Guid.NewGuid().ToString("N")[..6],
            CategoryId = catId,
            UnitOfMeasureId = uomId,
            IsActive = true
        });

        var whId = Guid.NewGuid();
        db.Warehouses.Add(new Warehouse
        {
            Id = whId,
            Name = "Workflow Central Warehouse",
            Code = "WHW-" + Guid.NewGuid().ToString("N")[..4],
            Address = "Industrial Park St",
            IsActive = true,
            CanAcceptAllCategories = true
        });

        var supId = Guid.NewGuid();
        db.Suppliers.Add(new Supplier
        {
            Id = supId,
            Name = "Global Tech Supplier " + Guid.NewGuid().ToString("N")[..4],
            Email = "supplier@global.com",
            IsActive = true,
            CanSupplyAllCategories = true,
            CanSupplyAllBrands = true
        });

        db.SupplierProducts.Add(new SupplierProduct
        {
            Id = Guid.NewGuid(),
            SupplierId = supId,
            ProductId = prodId,
            SupplierProductCode = "SUP-SKU-" + Guid.NewGuid().ToString("N")[..4],
            LastPurchasePrice = 120m,
            IsActive = true
        });

        // Seed 500 units in Supplier Stock so PO can be submitted and reserved
        db.SupplierStockMovements.Add(new SupplierStockMovement
        {
            Id = Guid.NewGuid(),
            SupplierId = supId,
            ProductId = prodId,
            Quantity = 500m,
            MovementType = SupplierStockMovementType.ExternalReplenishment,
            ReferenceType = "InitialStock",
            ReferenceId = "INIT-" + Guid.NewGuid().ToString("N")[..6],
            CreatedByUserId = "test-admin-id",
            CreatedAt = DateTime.UtcNow
        });

        var custId = Guid.NewGuid();
        db.Customers.Add(new Customer
        {
            Id = custId,
            Name = "Acme Retail Client",
            Email = "client@acme.com",
            IsActive = true
        });

        await db.SaveChangesAsync();
        return new TestOrderEnvironment(prodId, whId, supId, custId);
    }

    #region Purchase Order Lifecycle Tests

    [Fact]
    public async Task PurchaseOrder_FullLifecycle_FromDraftToReceived()
    {
        // 1. ARRANGE
        var env = await SeedEnvironmentAsync();
        var client = _factory.CreateClient();

        // 2. CREATE PURCHASE ORDER (Starts in Draft)
        var createRequest = new CreatePurchaseOrderRequest
        {
            SupplierId = env.SupplierId,
            WarehouseId = env.WarehouseId,
            OrderDate = DateTime.UtcNow,
            ExpectedDeliveryDate = DateTime.UtcNow.AddDays(7),
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest
                {
                    ProductId = env.ProductId,
                    QuantityOrdered = 50m,
                    UnitCost = 120m
                }
            }
        };

        var createResponse = await client.PostAsJsonAsync("/api/purchase-orders", createRequest);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var po = await createResponse.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(po);
        Assert.Equal(PurchaseOrderStatuses.Draft, po.Status);
        Assert.Single(po.Lines);
        var lineId = po.Lines.First().Id;

        // 3. ATTEMPT RECEIVING WHILE STILL IN DRAFT -> MUST FAIL
        var earlyReceiveResponse = await client.PostAsJsonAsync($"/api/purchase-orders/{po.Id}/receive", new ReceivePurchaseOrderRequest
        {
            Items = new List<ReceivePurchaseOrderLineItem>
            {
                new ReceivePurchaseOrderLineItem { PurchaseOrderLineId = lineId, QuantityToReceive = 20m }
            }
        });
        Assert.Equal(HttpStatusCode.BadRequest, earlyReceiveResponse.StatusCode);

        // 4. SUBMIT PURCHASE ORDER -> Transitions to 'Ordered'
        var submitResponse = await client.PostAsync($"/api/purchase-orders/{po.Id}/submit", null);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var submittedPo = await submitResponse.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(submittedPo);
        Assert.Equal(PurchaseOrderStatuses.Ordered, submittedPo.Status);

        // 5. ATTEMPT OVER-RECEIPT (e.g. 60 units when only 50 were ordered) -> MUST FAIL
        var overReceiptResponse = await client.PostAsJsonAsync($"/api/purchase-orders/{po.Id}/receive", new ReceivePurchaseOrderRequest
        {
            Items = new List<ReceivePurchaseOrderLineItem>
            {
                new ReceivePurchaseOrderLineItem { PurchaseOrderLineId = lineId, QuantityToReceive = 60m }
            }
        });
        Assert.Equal(HttpStatusCode.BadRequest, overReceiptResponse.StatusCode);

        // 6. PARTIAL RECEIPT (Receive 30 units)
        string docRef1 = "DOC-" + Guid.NewGuid().ToString("N")[..6];
        var partialReceiveResponse = await client.PostAsJsonAsync($"/api/purchase-orders/{po.Id}/receive", new ReceivePurchaseOrderRequest
        {
            ReceiptReferenceId = docRef1,
            Items = new List<ReceivePurchaseOrderLineItem>
            {
                new ReceivePurchaseOrderLineItem { PurchaseOrderLineId = lineId, QuantityToReceive = 30m }
            }
        });
        Assert.Equal(HttpStatusCode.OK, partialReceiveResponse.StatusCode);
        var partialPo = await partialReceiveResponse.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(partialPo);
        Assert.Equal(PurchaseOrderStatuses.PartiallyReceived, partialPo.Status);

        // DATABASE AUDIT: Verify that a StockMovement of type Purchase was created in the warehouse
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();
            var movements = await db.StockMovements
                .Where(sm => sm.WarehouseId == env.WarehouseId && sm.ProductId == env.ProductId)
                .ToListAsync();
            Assert.Single(movements);
            Assert.Equal(30m, movements[0].Quantity);
            Assert.Equal(StockMovementType.Purchase, movements[0].Type);
            Assert.Equal("PurchaseOrder", movements[0].ReferenceType);
        }

        // 7. DUPLICATE RECEIPT ID PREVENTION (Submitting same docRef1 again) -> MUST FAIL
        var duplicateResponse = await client.PostAsJsonAsync($"/api/purchase-orders/{po.Id}/receive", new ReceivePurchaseOrderRequest
        {
            ReceiptReferenceId = docRef1,
            Items = new List<ReceivePurchaseOrderLineItem>
            {
                new ReceivePurchaseOrderLineItem { PurchaseOrderLineId = lineId, QuantityToReceive = 10m }
            }
        });
        Assert.Equal(HttpStatusCode.BadRequest, duplicateResponse.StatusCode);

        // 8. FINAL RECEIPT (Receive remaining 20 units) -> Transitions to 'Received'
        string docRef2 = "DOC-" + Guid.NewGuid().ToString("N")[..6];
        var finalReceiveResponse = await client.PostAsJsonAsync($"/api/purchase-orders/{po.Id}/receive", new ReceivePurchaseOrderRequest
        {
            ReceiptReferenceId = docRef2,
            Items = new List<ReceivePurchaseOrderLineItem>
            {
                new ReceivePurchaseOrderLineItem { PurchaseOrderLineId = lineId, QuantityToReceive = 20m }
            }
        });
        Assert.Equal(HttpStatusCode.OK, finalReceiveResponse.StatusCode);
        var finalPo = await finalReceiveResponse.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(finalPo);
        Assert.Equal(PurchaseOrderStatuses.Received, finalPo.Status);

        // DATABASE AUDIT: Total stock in warehouse must now be 30 + 20 = 50 units
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();
            decimal totalStock = await db.StockMovements
                .Where(sm => sm.WarehouseId == env.WarehouseId && sm.ProductId == env.ProductId)
                .SumAsync(sm => sm.Quantity);
            Assert.Equal(50m, totalStock);
        }
    }

    #endregion

    #region Sales Order Lifecycle Tests

    [Fact]
    public async Task SalesOrder_FullLifecycle_FromDraftToFulfilled_WithStockValidation()
    {
        // 1. ARRANGE
        var env = await SeedEnvironmentAsync();
        var client = _factory.CreateClient();

        // Seed 40 units physical stock in Warehouse
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();
            db.StockMovements.Add(new StockMovement
            {
                Id = Guid.NewGuid(),
                WarehouseId = env.WarehouseId,
                ProductId = env.ProductId,
                Quantity = 40m,
                Type = StockMovementType.Purchase,
                CreatedByUserId = "test-admin-id",
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        // 2. CREATE SALES ORDER (Starts in Draft)
        var createRequest = new CreateSalesOrderRequest
        {
            CustomerId = env.CustomerId,
            WarehouseId = env.WarehouseId,
            OrderDate = DateTime.UtcNow,
            Lines = new List<CreateSalesOrderLineRequest>
            {
                new CreateSalesOrderLineRequest
                {
                    ProductId = env.ProductId,
                    QuantityOrdered = 25m,
                    UnitPrice = 200m
                }
            }
        };

        var createResponse = await client.PostAsJsonAsync("/api/sales-orders", createRequest);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var so = await createResponse.Content.ReadFromJsonAsync<SalesOrderResponse>();
        Assert.NotNull(so);
        Assert.Equal(SalesOrderStatuses.Draft, so.Status);
        var lineId = so.Lines.First().Id;

        // 3. ATTEMPT FULFILLMENT WHILE DRAFT -> MUST FAIL
        var earlyFulfillResponse = await client.PostAsJsonAsync($"/api/sales-orders/{so.Id}/fulfill", new FulfillSalesOrderRequest
        {
            Items = new List<FulfillSalesOrderLineItem>
            {
                new FulfillSalesOrderLineItem { SalesOrderLineId = lineId, QuantityToFulfill = 25m }
            }
        });
        Assert.Equal(HttpStatusCode.BadRequest, earlyFulfillResponse.StatusCode);

        // 4. CONFIRM SALES ORDER -> Transitions to 'Confirmed'
        var confirmResponse = await client.PostAsync($"/api/sales-orders/{so.Id}/confirm", null);
        Assert.Equal(HttpStatusCode.OK, confirmResponse.StatusCode);
        var confirmedSo = await confirmResponse.Content.ReadFromJsonAsync<SalesOrderResponse>();
        Assert.NotNull(confirmedSo);
        Assert.Equal(SalesOrderStatuses.Confirmed, confirmedSo.Status);

        // 5. ATTEMPT FULFILLMENT EXCEEDING PHYSICAL STOCK
        // Warehouse only has 40 units. If an order asks for 50 units, it must fail.
        var bigOrderRequest = new CreateSalesOrderRequest
        {
            CustomerId = env.CustomerId,
            WarehouseId = env.WarehouseId,
            Lines = new List<CreateSalesOrderLineRequest>
            {
                new CreateSalesOrderLineRequest { ProductId = env.ProductId, QuantityOrdered = 50m, UnitPrice = 200m }
            }
        };
        var bigSoRes = await client.PostAsJsonAsync("/api/sales-orders", bigOrderRequest);
        var bigSo = await bigSoRes.Content.ReadFromJsonAsync<SalesOrderResponse>();
        await client.PostAsync($"/api/sales-orders/{bigSo!.Id}/confirm", null);

        var failFulfillResponse = await client.PostAsJsonAsync($"/api/sales-orders/{bigSo.Id}/fulfill", new FulfillSalesOrderRequest
        {
            Items = new List<FulfillSalesOrderLineItem>
            {
                new FulfillSalesOrderLineItem { SalesOrderLineId = bigSo.Lines.First().Id, QuantityToFulfill = 50m }
            }
        });
        Assert.Equal(HttpStatusCode.BadRequest, failFulfillResponse.StatusCode);

        // 6. VALID FULFILLMENT (Fulfill 25 units from available 40 units)
        var validFulfillResponse = await client.PostAsJsonAsync($"/api/sales-orders/{so.Id}/fulfill", new FulfillSalesOrderRequest
        {
            Items = new List<FulfillSalesOrderLineItem>
            {
                new FulfillSalesOrderLineItem { SalesOrderLineId = lineId, QuantityToFulfill = 25m }
            }
        });
        Assert.Equal(HttpStatusCode.OK, validFulfillResponse.StatusCode);
        var fulfilledSo = await validFulfillResponse.Content.ReadFromJsonAsync<SalesOrderResponse>();
        Assert.NotNull(fulfilledSo);
        Assert.Equal(SalesOrderStatuses.Fulfilled, fulfilledSo.Status);

        // DATABASE AUDIT: Physical stock in warehouse must now be 40 - 25 = 15 units
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();
            var movements = await db.StockMovements
                .Where(sm => sm.WarehouseId == env.WarehouseId && sm.ProductId == env.ProductId)
                .ToListAsync();

            decimal currentStock = movements.Sum(sm =>
                (sm.Type == StockMovementType.Purchase ? sm.Quantity :
                 sm.Type == StockMovementType.Sale ? -sm.Quantity : 0m));

            Assert.Equal(15m, currentStock);

            var saleMovement = movements.FirstOrDefault(sm => sm.Type == StockMovementType.Sale);
            Assert.NotNull(saleMovement);
            Assert.Equal(25m, saleMovement.Quantity);
            Assert.Equal("SalesOrder", saleMovement.ReferenceType);
        }
    }

    #endregion
}
