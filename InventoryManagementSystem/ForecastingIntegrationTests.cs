using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using InventoryManagementSystem.Business.Assistant.DTOs;
using InventoryManagementSystem.Business.Assistant.Security;
using InventoryManagementSystem.Business.Assistant.Tools;
using InventoryManagementSystem.Business.Forecasting.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace InventoryManagementSystem.IntegrationTests;

public class ForecastingIntegrationTests(AssistantTestWebApplicationFactory factory)
    : IClassFixture<AssistantTestWebApplicationFactory>
{
    [Fact]
    public async Task ForecastsUseEligibleSalesAndEnforceWarehouseScope()
    {
        var data = await SeedAsync();
        using var employee = factory.CreateUserClient(data.Employee);
        using var admin = factory.CreateAdminClient();
        using var anonymous = factory.CreateClient();
        anonymous.DefaultRequestHeaders.Add(TestAuthHandler.UnauthenticatedHeader, "true");

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/forecasting")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await employee.GetAsync("/api/forecasting?horizonDays=31")).StatusCode);
        Assert.Empty((await employee.GetFromJsonAsync<DemandForecastDto[]>($"/api/forecasting?warehouseId={data.OtherWarehouse}"))!);

        var rows = await employee.GetFromJsonAsync<DemandForecastDto[]>($"/api/forecasting?productId={data.Product}");
        var own = Assert.Single(rows!);
        Assert.Equal(data.Warehouse, own.WarehouseId);
        Assert.Equal(60m, own.HistoricalUnitsSold);
        Assert.Equal(2, own.HistoricalSalesCount);
        Assert.Equal(340m, own.OnHandStock);
        Assert.Equal(12m, own.CommittedStock);
        Assert.Equal(328m, own.CurrentStock);
        Assert.Equal(30m, own.PredictedDemand);

        var detailPath = $"/api/forecasting/products/{data.Product}?warehouseId=";
        Assert.Equal(HttpStatusCode.NotFound, (await employee.GetAsync(detailPath + data.OtherWarehouse)).StatusCode);
        var detail = await employee.GetFromJsonAsync<ProductForecastDetailDto>(detailPath + data.Warehouse);
        Assert.Equal(own.PredictedDemand, detail!.Forecast.PredictedDemand);
        Assert.Equal(2, detail.HistoryTimeline.Count);
        Assert.Equal(2, (await admin.GetFromJsonAsync<DemandForecastDto[]>($"/api/forecasting?productId={data.Product}"))!.Length);
    }

    [Fact]
    public async Task ForecastToolAndInsightsUseAuthorizedFactsAndHandleProviderFailure()
    {
        var data = await SeedAsync();
        using var scope = factory.Services.CreateScope();
        var tools = scope.ServiceProvider.GetServices<IAssistantTool>();
        var tool = Assert.Single(tools, candidate => candidate.Name == "get_demand_forecasts");
        var security = new AssistantSecurityContext
        {
            UserId = data.Employee,
            AssignedWarehouseIds = new HashSet<Guid> { data.Warehouse }
        };

        var denied = await tool.ExecuteAsync(JsonSerializer.SerializeToElement(new { warehouse_id = data.OtherWarehouse }), security);
        Assert.Contains("Access denied", denied);
        var toolResult = await tool.ExecuteAsync(JsonSerializer.SerializeToElement(new { product_id = data.Product, horizon_days = 7 }), security);
        using var json = JsonDocument.Parse(toolResult);
        var forecast = Assert.Single(json.RootElement.GetProperty("forecasts").EnumerateArray());
        Assert.Equal(7m, forecast.GetProperty("predictedDemand").GetDecimal());

        var calls = 0;
        factory.MockOpenRouter.Handler = request =>
        {
            calls++;
            Assert.Contains(data.WarehouseName, request.Messages[1].Content);
            Assert.DoesNotContain("Restricted facility", request.Messages[1].Content);
            return Task.FromResult(new OpenRouterChatResponse
            {
                Choices = [new() { Message = new OpenRouterMessage { Content = "[\"coverage\"]" } }]
            });
        };

        using var employee = factory.CreateUserClient(data.Employee);
        var response = await employee.PostAsJsonAsync("/api/forecasting/ai-insights",
            new ForecastingAiInsightRequest { ProductId = data.Product });
        Assert.Equal("OpenRouter", (await response.Content.ReadFromJsonAsync<ForecastingAiInsightResponse>())!.Source);
        Assert.Equal(1, calls);

        factory.MockOpenRouter.Handler = _ => Task.FromResult(new OpenRouterChatResponse
        {
            Choices = [new() { Message = new OpenRouterMessage { Content = "Buy fifty widgets next week." } }]
        });
        var unsupported = await employee.PostAsJsonAsync("/api/forecasting/ai-insights",
            new ForecastingAiInsightRequest { ProductId = data.Product });
        Assert.Equal("Statistical", (await unsupported.Content.ReadFromJsonAsync<ForecastingAiInsightResponse>())!.Source);

        var deniedResponse = await employee.PostAsJsonAsync("/api/forecasting/ai-insights",
            new ForecastingAiInsightRequest { WarehouseId = data.OtherWarehouse });
        Assert.Equal("Statistical", (await deniedResponse.Content.ReadFromJsonAsync<ForecastingAiInsightResponse>())!.Source);
        Assert.Equal(1, calls);

        factory.MockOpenRouter.Handler = _ => throw new HttpRequestException("Provider unavailable");
        var fallback = await employee.PostAsJsonAsync("/api/forecasting/ai-insights",
            new ForecastingAiInsightRequest { ProductId = data.Product });
        Assert.Equal("Statistical", (await fallback.Content.ReadFromJsonAsync<ForecastingAiInsightResponse>())!.Source);
    }

    private async Task<(Guid Product, Guid Warehouse, string WarehouseName, Guid OtherWarehouse, string Employee)> SeedAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();
        var token = Guid.NewGuid().ToString("N")[..8];
        var category = new Category { Id = Guid.NewGuid(), Name = "Forecast " + token, IsActive = true };
        var uom = new UnitOfMeasure { Id = Guid.NewGuid(), Name = "Forecast unit " + token, Code = token, IsActive = true };
        var product = new Product
        {
            Id = Guid.NewGuid(), Name = "Forecast widget", Sku = token,
            CategoryId = category.Id, UnitOfMeasureId = uom.Id, IsActive = true
        };
        var own = new Warehouse { Id = Guid.NewGuid(), Name = "Assigned facility " + token, Code = "A" + token, Address = "Assigned", IsActive = true };
        var other = new Warehouse { Id = Guid.NewGuid(), Name = "Restricted facility " + token, Code = "R" + token, Address = "Restricted", IsActive = true };
        var employee = "forecast-employee-" + token;
        var customer = new Customer { Id = Guid.NewGuid(), Name = "Forecast customer " + token, IsActive = true };
        var cancelled = new SalesOrder
        {
            Id = Guid.NewGuid(), SalesOrderNumber = "Cancelled-" + token, Status = "Cancelled",
            WarehouseId = own.Id, CustomerId = customer.Id, CreatedByUserId = employee
        };
        var confirmed = new SalesOrder
        {
            Id = Guid.NewGuid(), SalesOrderNumber = "Confirmed-" + token, Status = "Confirmed",
            WarehouseId = own.Id, CustomerId = customer.Id, CreatedByUserId = employee
        };
        db.AddRange(category, uom, product, own, other, customer, cancelled, confirmed);
        db.SalesOrderLines.Add(new SalesOrderLine
        {
            Id = Guid.NewGuid(), SalesOrderId = confirmed.Id, ProductId = product.Id, LineNumber = 1,
            QuantityOrdered = 12, QuantityFulfilled = 0
        });
        db.WarehouseAssignments.Add(new WarehouseAssignment
        {
            Id = Guid.NewGuid(), WarehouseId = own.Id, UserId = employee,
            Role = WarehouseAssignmentRole.Employee, IsActive = true
        });

        var now = DateTime.UtcNow;
        var month = new DateTime(now.Year, now.Month, 1);
        void Add(Warehouse warehouse, StockMovementType type, decimal quantity, DateTime date, string? referenceType = null, string? referenceId = null)
        {
            db.StockMovements.Add(new StockMovement
            {
                Id = Guid.NewGuid(), WarehouseId = warehouse.Id, ProductId = product.Id, Type = type,
                Quantity = quantity, CreatedAt = date, CreatedByUserId = employee,
                ReferenceType = referenceType, ReferenceId = referenceId
            });
        }

        Add(own, StockMovementType.Purchase, 1_000, month.AddMonths(-2));
        Add(own, StockMovementType.Sale, 30, month.AddMonths(-2));
        Add(own, StockMovementType.Sale, 30, month.AddMonths(-1));
        Add(own, StockMovementType.Sale, 500, month.AddMonths(-1), "SalesOrder", cancelled.SalesOrderNumber + "#L1");
        Add(own, StockMovementType.TransferOut, 105, month.AddMonths(-1));
        Add(own, StockMovementType.AdjustmentIn, 5, month.AddMonths(-1), "CustomerReturn");
        Add(other, StockMovementType.Sale, 230, month.AddMonths(-1));
        await db.SaveChangesAsync();
        return (product.Id, own.Id, own.Name, other.Id, employee);
    }
}

