using System.Text.Json.Serialization;

namespace InventoryManagementSystem.Business.Assistant.DTOs;

public class OpenRouterChatRequest
{
    [JsonPropertyName("model")]
    public string Model { get; set; } = "nvidia/nemotron-3-ultra-550b-a55b:free";

    [JsonPropertyName("messages")]
    public List<OpenRouterMessage> Messages { get; set; } = new();

    [JsonPropertyName("tools")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<OpenRouterTool>? Tools { get; set; }

    [JsonPropertyName("tool_choice")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ToolChoice { get; set; }

    [JsonPropertyName("stream")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool Stream { get; set; }
}

public class OpenRouterMessage
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public string? Content { get; set; }

    [JsonPropertyName("tool_calls")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<OpenRouterToolCall>? ToolCalls { get; set; }

    [JsonPropertyName("tool_call_id")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ToolCallId { get; set; }

    [JsonPropertyName("name")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Name { get; set; }
}

public class OpenRouterTool
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "function";

    [JsonPropertyName("function")]
    public OpenRouterFunction Function { get; set; } = new();
}

public class OpenRouterFunction
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("parameters")]
    public object Parameters { get; set; } = new();
}

public class OpenRouterToolCall
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = "function";

    [JsonPropertyName("function")]
    public OpenRouterFunctionCall Function { get; set; } = new();
}

public class OpenRouterFunctionCall
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("arguments")]
    public string Arguments { get; set; } = "{}";
}

public class OpenRouterChatResponse
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("model")]
    public string? Model { get; set; }

    [JsonPropertyName("choices")]
    public List<OpenRouterChoice> Choices { get; set; } = new();

    [JsonPropertyName("error")]
    public OpenRouterError? Error { get; set; }
}

public class OpenRouterChoice
{
    [JsonPropertyName("index")]
    public int Index { get; set; }

    [JsonPropertyName("message")]
    public OpenRouterMessage Message { get; set; } = new();

    [JsonPropertyName("finish_reason")]
    public string? FinishReason { get; set; }
}

public class OpenRouterError
{
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("code")]
    public object? Code { get; set; }
}

public class OpenRouterStreamChunk
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("choices")]
    public List<OpenRouterStreamChoice> Choices { get; set; } = new();

    [JsonPropertyName("error")]
    public OpenRouterError? Error { get; set; }
}

public class OpenRouterStreamChoice
{
    [JsonPropertyName("index")]
    public int Index { get; set; }

    [JsonPropertyName("delta")]
    public OpenRouterStreamDelta Delta { get; set; } = new();

    [JsonPropertyName("finish_reason")]
    public string? FinishReason { get; set; }
}

public class OpenRouterStreamDelta
{
    [JsonPropertyName("role")]
    public string? Role { get; set; }

    [JsonPropertyName("content")]
    public string? Content { get; set; }

    [JsonPropertyName("tool_calls")]
    public List<OpenRouterToolCallChunk>? ToolCalls { get; set; }
}

public class OpenRouterToolCallChunk
{
    [JsonPropertyName("index")]
    public int Index { get; set; }

    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("function")]
    public OpenRouterFunctionCallChunk? Function { get; set; }
}

public class OpenRouterFunctionCallChunk
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("arguments")]
    public string? Arguments { get; set; }
}
