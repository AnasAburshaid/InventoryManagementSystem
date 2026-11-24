using System.Text.Json;
using InventoryManagementSystem.Business.Assistant.Security;

namespace InventoryManagementSystem.Business.Assistant.Tools;

public interface IAssistantTool
{
    string Name { get; }
    string Description { get; }
    object ParametersSchema { get; }
    Task<string> ExecuteAsync(JsonElement arguments, AssistantSecurityContext securityContext, CancellationToken ct = default);
}
