using InventoryManagementSystem.DataAccess.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using InventoryManagementSystem.DataAccess.Identity.Seeding;
using InventoryManagementSystem.Business.Authentication;
using InventoryManagementSystem.Business.Authentication.Services;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using InventoryManagementSystem.DataAccess.Persistence;
using InventoryManagementSystem.Business.Categories.Services;
using InventoryManagementSystem.Business.Brands.Services;
using InventoryManagementSystem.Business.Products.Services;

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
builder.Services.AddScoped<SkuGenerator>();

builder.Services.AddControllers();
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

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.Run();