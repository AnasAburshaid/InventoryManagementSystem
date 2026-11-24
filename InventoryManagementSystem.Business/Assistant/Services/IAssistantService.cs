using InventoryManagementSystem.Business.Assistant.DTOs;
using InventoryManagementSystem.Business.Assistant.Security;

namespace InventoryManagementSystem.Business.Assistant.Services;

public interface IAssistantService
{
    Task<AssistantChatResponse> ProcessMessageAsync(
        AssistantChatRequest request,
        AssistantSecurityContext securityContext,
        CancellationToken ct = default);

    IAsyncEnumerable<AssistantStreamEvent> StreamMessageAsync(
        AssistantChatRequest request,
        AssistantSecurityContext securityContext,
        CancellationToken ct = default);
}
