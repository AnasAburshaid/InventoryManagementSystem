using InventoryManagementSystem.Business.Assistant.DTOs;
using InventoryManagementSystem.Business.Assistant.Security;

namespace InventoryManagementSystem.Business.Assistant.Tools;

public interface IAssistantToolRegistry
{
    IReadOnlyList<OpenRouterTool> GetToolDefinitions();
    Task<string> ExecuteToolAsync(string toolName, string argumentsJson, AssistantSecurityContext securityContext, CancellationToken ct = default);
}
