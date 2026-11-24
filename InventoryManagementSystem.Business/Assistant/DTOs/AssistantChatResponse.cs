namespace InventoryManagementSystem.Business.Assistant.DTOs;

public class AssistantChatResponse
{
    public string Reply { get; set; } = string.Empty;
    public List<string> ToolsUsed { get; set; } = new();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public bool HasError { get; set; }
    public string? ErrorMessage { get; set; }
}
