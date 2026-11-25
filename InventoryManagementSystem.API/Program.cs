using InventoryManagementSystem.API.Authorization;
using InventoryManagementSystem.Business.Analytics.Services;
using InventoryManagementSystem.Business.Assistant.Services;
using InventoryManagementSystem.Business.Assistant.Tools;
using InventoryManagementSystem.Business.AuditLogs.Services;
using InventoryManagementSystem.Business.Authentication;
using InventoryManagementSystem.Business.Authentication.Services;
using InventoryManagementSystem.Business.Brands.Services;
using InventoryManagementSystem.Business.Categories.Services;
using InventoryManagementSystem.Business.Customers.Services;
using InventoryManagementSystem.Business.Forecasting.Services;
using InventoryManagementSystem.Business.Products.Services;
using InventoryManagementSystem.Business.PurchaseOrders.Services;
using InventoryManagementSystem.Business.Replenishment.Services;
using InventoryManagementSystem.Business.SalesOrders.Services;
using InventoryManagementSystem.Business.StockCounting.Services;
using InventoryManagementSystem.Business.StockMovements.Services;
using InventoryManagementSystem.Business.SupplierProducts.Services;
using InventoryManagementSystem.Business.Suppliers.Capabilities.Services;
using InventoryManagementSystem.Business.Suppliers.Services;
using InventoryManagementSystem.Business.Suppliers.Stock.Services;
using InventoryManagementSystem.Business.UnitOfMeasures.Services;
using InventoryManagementSystem.Business.WarehouseAssignments.Services;
using InventoryManagementSystem.Business.Warehouses.Restrictions.Services;
using InventoryManagementSystem.Business.Warehouses.Services;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Identity;
using InventoryManagementSystem.DataAccess.Identity.Seeding;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection" )??
    throw new InvalidOperationException("Connection string 'DefaultConnection' was not found.");

builder.Services.AddDbContext<ApplicationIdentityDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddDbContext<InventoryDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
    .AddEntityFrameworkStores<ApplicationIdentityDbContext>()
    .AddDefaultTokenProviders();

builder.Services.Configure<IdentityOptions>(options =>
{
    options.Password.RequiredLength = 8;
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredUniqueChars = 1;

    options.Lockout.AllowedForNewUsers = true;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(10);

    options.User.RequireUniqueEmail = true;
});

builder.Services.Configure<JwtSettings>(
    builder.Configuration.GetSection(JwtSettings.SectionName));

JwtSettings jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName)
    .Get<JwtSettings>()?? throw new InvalidOperationException("JWT settings were not configured.");

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme =JwtBearerDefaults.AuthenticationScheme;

        options.DefaultChallengeScheme =JwtBearerDefaults.AuthenticationScheme;

    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = jwtSettings.Issuer,

                ValidateAudience = true,
                ValidAudience = jwtSettings.Audience,

                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(
                        jwtSettings.SigningKey)),

                ValidateLifetime = true,

                ClockSkew = TimeSpan.Zero
            };
    });

builder.Services.AddScoped<IdentitySeeder>();
builder.Services.AddScoped<JwtTokenGenerator>();
builder.Services.AddScoped<AuthenticationService>();
builder.Services.AddScoped<CategoryService>();
builder.Services.AddScoped<BrandService>();
builder.Services.AddScoped<ProductService>();
builder.Services.AddScoped<IUnitOfMeasureService, UnitOfMeasureService>();
builder.Services.AddScoped<UnitOfMeasureService>();
builder.Services.AddScoped<SkuGenerator>();
builder.Services.AddScoped<WarehouseService>();
builder.Services.AddScoped<WarehouseCodeGenerator>();
builder.Services.AddScoped<IWarehouseAssignmentService, WarehouseAssignmentService>();
builder.Services.AddScoped<IWarehouseRestrictionService, WarehouseRestrictionService>();
builder.Services.AddScoped<ICustomerService, CustomerService>();
builder.Services.AddScoped<ISupplierService, SupplierService>();
builder.Services.AddScoped<ISupplierCapabilityService, SupplierCapabilityService>();
builder.Services.AddScoped<ISupplierStockService, SupplierStockService>();
builder.Services.AddScoped<ISupplierProductService, SupplierProductService>();
builder.Services.AddScoped<PurchaseOrderNumberGenerator>();
builder.Services.AddScoped<IPurchaseOrderService, PurchaseOrderService>();
builder.Services.AddScoped<IPurchaseOrderLineService, PurchaseOrderLineService>();
builder.Services.AddScoped<SalesOrderNumberGenerator>();
builder.Services.AddScoped<ISalesOrderService, SalesOrderService>();
builder.Services.AddScoped<ISalesOrderLineService, SalesOrderLineService>();
builder.Services.AddScoped<IStockMovementService, StockMovementService>();
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IStockCountService, StockCountService>();
builder.Services.AddScoped<IReplenishmentService, ReplenishmentService>();
builder.Services.AddHttpClient<IOpenRouterClient, OpenRouterClient>(client =>
{
    client.BaseAddress = new Uri("https://openrouter.ai/api/v1/");
    client.Timeout = TimeSpan.FromSeconds(75);
});
builder.Services.AddScoped<IAssistantTool, GetProductsTool>();
builder.Services.AddScoped<IAssistantTool, GetWarehouseInventoryTool>();
builder.Services.AddScoped<IAssistantTool, GetLowStockAndReplenishmentTool>();
builder.Services.AddScoped<IAssistantTool, GetStockMovementsTool>();
builder.Services.AddScoped<IAssistantTool, GetPurchaseOrdersTool>();
builder.Services.AddScoped<IAssistantTool, GetSalesOrdersTool>();
builder.Services.AddScoped<IAssistantTool, GetStockCountsTool>();
builder.Services.AddScoped<IAssistantTool, GetAuditLogsTool>();
builder.Services.AddScoped<IAssistantTool, GetDemandForecastsTool>();
builder.Services.AddScoped<IAssistantToolRegistry, AssistantToolRegistry>();
builder.Services.AddScoped<IAssistantService, AssistantService>();
builder.Services.AddScoped<IForecastingService, ForecastingService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IAuthorizationHandler, WarehouseRoleHandler>();

builder.Services.AddControllers();
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // This makes Swagger and Postman show "Manager" instead of 2
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Name = "Authorization",
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description ="Enter the JWT access token."
        });

    options.AddSecurityRequirement(
        new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });
});
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireWarehouseManager", policy =>
        policy.Requirements.Add(new WarehouseRoleRequirement(WarehouseAssignmentRole.Manager)));

    options.AddPolicy("RequireWarehouseSupervisor", policy =>
        policy.Requirements.Add(new WarehouseRoleRequirement(WarehouseAssignmentRole.Supervisor)));

    options.AddPolicy("RequireWarehouseEmployee", policy =>
        policy.Requirements.Add(new WarehouseRoleRequirement(WarehouseAssignmentRole.Employee)));
});

// Allow our React frontend to communicate with the API
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactFrontend", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

using (IServiceScope scope = app.Services.CreateScope())
{
    IdentitySeeder seeder =
        scope.ServiceProvider.GetRequiredService<IdentitySeeder>();

    IConfiguration configuration =
        scope.ServiceProvider.GetRequiredService<IConfiguration>();

    string adminEmail =
        configuration["InitialAdmin:Email"]
        ?? throw new InvalidOperationException(
            "Initial Admin email was not configured.");

    string adminPassword =
        configuration["InitialAdmin:Password"]
        ?? throw new InvalidOperationException(
            "Initial Admin password was not configured.");

    string adminFullName =
        configuration["InitialAdmin:FullName"]
        ?? throw new InvalidOperationException(
            "Initial Admin full name was not configured.");

    await seeder.SeedAsync(
        adminEmail,
        adminPassword,
        adminFullName);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReactFrontend");

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.Run();
public partial class Program { }
