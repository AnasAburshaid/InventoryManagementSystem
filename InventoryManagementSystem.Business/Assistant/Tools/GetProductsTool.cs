using System.Text.Json;
using InventoryManagementSystem.Business.Assistant.Security;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.Assistant.Tools;

public class GetProductsTool : IAssistantTool
{
    private readonly InventoryDbContext _context;

    public GetProductsTool(InventoryDbContext context)
    {
        _context = context;
    }

    public string Name => "get_products";

    public string Description => "Search products, categories, and brands. Can filter by search query (name/SKU), category name, brand name, or active status.";

    public object ParametersSchema => new
    {
        type = "object",
        properties = new
        {
            query = new { type = "string", description = "Optional keyword to filter product name or SKU" },
            category = new { type = "string", description = "Optional category name to filter by" },
            brand = new { type = "string", description = "Optional brand name to filter by" },
            is_active = new { type = "boolean", description = "Optional active status filter (true/false)" }
        }
    };

    public async Task<string> ExecuteAsync(JsonElement arguments, AssistantSecurityContext securityContext, CancellationToken ct = default)
    {
        string? query = arguments.TryGetProperty("query", out var q) ? q.GetString() : null;
        string? category = arguments.TryGetProperty("category", out var c) ? c.GetString() : null;
        string? brand = arguments.TryGetProperty("brand", out var b) ? b.GetString() : null;
        bool? isActive = arguments.TryGetProperty("is_active", out var a) ? a.GetBoolean() : null;

        var dbQuery = _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .Include(p => p.UnitOfMeasure)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var qLower = query.Trim().ToLower();
            dbQuery = dbQuery.Where(p => p.Name.ToLower().Contains(qLower) || p.Sku.ToLower().Contains(qLower));
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            var catLower = category.Trim().ToLower();
            dbQuery = dbQuery.Where(p => p.Category != null && p.Category.Name.ToLower().Contains(catLower));
        }

        if (!string.IsNullOrWhiteSpace(brand))
        {
            var brandLower = brand.Trim().ToLower();
            dbQuery = dbQuery.Where(p => p.Brand != null && p.Brand.Name.ToLower().Contains(brandLower));
        }

        if (isActive.HasValue)
        {
            dbQuery = dbQuery.Where(p => p.IsActive == isActive.Value);
        }

        var products = await dbQuery
            .OrderBy(p => p.Name)
            .Take(25)
            .Select(p => new
            {
                p.Id,
                p.Name,
                SKU = p.Sku,
                Category = p.Category != null ? p.Category.Name : "Uncategorized",
                Brand = p.Brand != null ? p.Brand.Name : "No Brand",
                SellingPrice = p.SellingPrice,
                Unit = p.UnitOfMeasure != null ? p.UnitOfMeasure.Name : "Units",
                p.IsActive
            })
            .ToListAsync(ct);

        if (products.Count == 0)
        {
            return "No products found matching the criteria.";
        }

        return JsonSerializer.Serialize(new
        {
            TotalFound = products.Count,
            Products = products
        });
    }
}
