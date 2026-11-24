namespace InventoryManagementSystem.Business.Assistant.DTOs;

public class AssistantChatRequest
{
    public string Message { get; set; } = string.Empty;
    public List<ChatMessageDto>? History { get; set; }
    public Guid? ActiveWarehouseId { get; set; }
}
