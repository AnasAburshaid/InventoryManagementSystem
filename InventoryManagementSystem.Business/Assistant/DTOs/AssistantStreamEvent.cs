namespace InventoryManagementSystem.Business.Assistant.DTOs;

public class AssistantStreamEvent
{
    public string Event { get; set; } = "token"; // "thinking", "tool_start", "tool_complete", "token", "done", "error"
    public string? Delta { get; set; }
    public string? Tool { get; set; }
    public string? Message { get; set; }
    public List<string>? ToolsUsed { get; set; }
    public string? Error { get; set; }
}
