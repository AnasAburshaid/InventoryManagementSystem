using System.Security.Claims;
using InventoryManagementSystem.Business.Assistant.DTOs;
using InventoryManagementSystem.Business.Assistant.Security;
using InventoryManagementSystem.Business.Assistant.Services;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AssistantController : ControllerBase
{
    private readonly IAssistantService _assistantService;
    private readonly InventoryDbContext _context;

    public AssistantController(IAssistantService assistantService, InventoryDbContext context)
    {
        _assistantService = assistantService;
        _context = context;
    }

    [HttpPost("chat")]
    public async Task<ActionResult<AssistantChatResponse>> Chat([FromBody] AssistantChatRequest request, CancellationToken ct)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new { message = "Message is required." });
        }

        var securityContext = await GetSecurityContextAsync(ct);
        var response = await _assistantService.ProcessMessageAsync(request, securityContext, ct);

        if (response.HasError)
        {
            return StatusCode(StatusCodes.Status502BadGateway, response);
        }

        return Ok(response);
    }

    [HttpPost("chat-stream")]
    public async Task ChatStream([FromBody] AssistantChatRequest request, CancellationToken ct)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Message))
        {
            Response.StatusCode = StatusCodes.Status400BadRequest;
            await Response.WriteAsync("Message is required.", ct);
            return;
        }

        var securityContext = await GetSecurityContextAsync(ct);

        Response.ContentType = "text/event-stream";
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");
        Response.Headers.Append("X-Accel-Buffering", "no");

        try
        {
            await foreach (var evt in _assistantService.StreamMessageAsync(request, securityContext, ct))
            {
                var json = System.Text.Json.JsonSerializer.Serialize(evt, new System.Text.Json.JsonSerializerOptions
                {
                    PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                    DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
                });

                await Response.WriteAsync($"event: {evt.Event}\ndata: {json}\n\n", ct);
                await Response.Body.FlushAsync(ct);
            }
        }
        catch (OperationCanceledException)
        {
            // Client closed stream or aborted
        }
        catch (Exception ex)
        {
            var errEvent = new AssistantStreamEvent
            {
                Event = "error",
                Error = ex.Message
            };
            var json = System.Text.Json.JsonSerializer.Serialize(errEvent, new System.Text.Json.JsonSerializerOptions
            {
                PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
            });
            await Response.WriteAsync($"event: error\ndata: {json}\n\n", CancellationToken.None);
            await Response.Body.FlushAsync(CancellationToken.None);
        }
    }

    private async Task<AssistantSecurityContext> GetSecurityContextAsync(CancellationToken ct)
    {
        // 1. Extract identity and roles from authenticated JWT
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
                     User.FindFirst("sub")?.Value ??
                     string.Empty;

        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ??
                        User.Identity?.Name;

        var isAdmin = User.IsInRole("Admin") ||
                      User.HasClaim(ClaimTypes.Role, "Admin") ||
                      User.HasClaim("role", "Admin");

        // 2. Query user's active warehouse assignments from database
        var assignments = await _context.WarehouseAssignments
            .AsNoTracking()
            .Include(wa => wa.Warehouse)
            .Where(wa => wa.UserId == userId && wa.IsActive && wa.Warehouse.IsActive)
            .ToListAsync(ct);

        var assignedIds = assignments.Select(wa => wa.WarehouseId).ToHashSet();
        var assignedNames = assignments.ToDictionary(wa => wa.WarehouseId, wa => wa.Warehouse.Name);

        // 3. Construct authoritative server-side security context
        return new AssistantSecurityContext
        {
            UserId = userId,
            UserEmail = userEmail,
            IsAdmin = isAdmin,
            AssignedWarehouseIds = assignedIds,
            AssignedWarehouseNames = assignedNames
        };
    }

    [HttpGet("suggested-prompts")]
    public ActionResult<List<string>> GetSuggestedPrompts()
    {
        var isAdmin = User.IsInRole("Admin") ||
                      User.HasClaim(ClaimTypes.Role, "Admin") ||
                      User.HasClaim("role", "Admin");

        if (isAdmin)
        {
            return Ok(new List<string>
            {
                "Which products are currently below their reorder points?",
                "Which warehouse has the highest total inventory value?",
                "Show me the latest stock movements across all facilities.",
                "Summarize recent purchase orders and their statuses.",
                "Are there any open stock count sessions with discrepancies?",
                "Give me a summary of recent warehouse audit activities."
            });
        }

        return Ok(new List<string>
        {
            "Which products in my assigned facility need replenishment?",
            "Show recent stock movements for my warehouse.",
            "What is the current stock of our key products?",
            "Are there any stock count sessions in progress?",
            "Show recent purchase orders for my warehouse."
        });
    }
}
