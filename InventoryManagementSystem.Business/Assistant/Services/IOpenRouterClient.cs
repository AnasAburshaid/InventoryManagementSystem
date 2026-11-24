using InventoryManagementSystem.Business.Assistant.DTOs;

namespace InventoryManagementSystem.Business.Assistant.Services;

public interface IOpenRouterClient
{
    Task<OpenRouterChatResponse> SendChatCompletionAsync(OpenRouterChatRequest request, CancellationToken ct = default);
    IAsyncEnumerable<OpenRouterStreamChunk> StreamChatCompletionAsync(OpenRouterChatRequest request, CancellationToken ct = default);
}
