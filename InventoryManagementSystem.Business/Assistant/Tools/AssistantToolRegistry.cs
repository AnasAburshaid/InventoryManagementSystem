using System.Text.Json;
using InventoryManagementSystem.Business.Assistant.DTOs;
using InventoryManagementSystem.Business.Assistant.Security;
using Microsoft.Extensions.Logging;

namespace InventoryManagementSystem.Business.Assistant.Tools;

public class AssistantToolRegistry : IAssistantToolRegistry
{
    private readonly Dictionary<string, IAssistantTool> _tools;
    private readonly List<OpenRouterTool> _toolDefinitions;
    private readonly ILogger<AssistantToolRegistry> _logger;

    public AssistantToolRegistry(IEnumerable<IAssistantTool> tools, ILogger<AssistantToolRegistry> logger)
    {
        _logger = logger;
        _tools = tools.ToDictionary(t => t.Name, StringComparer.OrdinalIgnoreCase);

        _toolDefinitions = _tools.Values.Select(t => new OpenRouterTool
        {
            Type = "function",
            Function = new OpenRouterFunction
            {
                Name = t.Name,
                Description = t.Description,
                Parameters = t.ParametersSchema
            }
        }).ToList();
    }

    public IReadOnlyList<OpenRouterTool> GetToolDefinitions() => _toolDefinitions;

    public async Task<string> ExecuteToolAsync(string toolName, string argumentsJson, AssistantSecurityContext securityContext, CancellationToken ct = default)
    {
        if (!_tools.TryGetValue(toolName, out var tool))
        {
            _logger.LogWarning("Assistant attempted to execute unknown tool: {ToolName}", toolName);
            return $"Tool '{toolName}' is not available or does not exist.";
        }

        try
        {
            using var doc = string.IsNullOrWhiteSpace(argumentsJson)
                ? JsonDocument.Parse("{}")
                : JsonDocument.Parse(argumentsJson);

            _logger.LogInformation("Executing tool {ToolName} for user {UserId} (Admin: {IsAdmin})", toolName, securityContext.UserId, securityContext.IsAdmin);
            return await tool.ExecuteAsync(doc.RootElement, securityContext, ct);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse arguments JSON for tool {ToolName}: {Arguments}", toolName, argumentsJson);
            return $"Invalid arguments JSON format: {ex.Message}";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing tool {ToolName}", toolName);
            return $"Error executing tool {toolName}: {ex.Message}";
        }
    }
}
