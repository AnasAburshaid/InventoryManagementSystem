using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using InventoryManagementSystem.Business.Assistant.DTOs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace InventoryManagementSystem.Business.Assistant.Services;

public class OpenRouterClient : IOpenRouterClient
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<OpenRouterClient> _logger;
    private string? _cachedApiKey;

    public OpenRouterClient(HttpClient httpClient, IConfiguration configuration, ILogger<OpenRouterClient> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;

        if (_httpClient.BaseAddress == null)
        {
            _httpClient.BaseAddress = new Uri("https://openrouter.ai/api/v1/");
        }
        _httpClient.Timeout = TimeSpan.FromSeconds(75);
    }

    public async Task<OpenRouterChatResponse> SendChatCompletionAsync(OpenRouterChatRequest request, CancellationToken ct = default)
    {
        var apiKey = GetApiKey();
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogError("OpenRouter API key is missing. Set OPENROUTER_API-KEY or OPENROUTER_API_KEY in .env or environment.");
            return new OpenRouterChatResponse
            {
                Error = new OpenRouterError
                {
                    Message = "OpenRouter API key is not configured. Please verify your .env file or environment variables."
                }
            };
        }

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "chat/completions");
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        httpRequest.Headers.Add("HTTP-Referer", "http://localhost:5068");
        httpRequest.Headers.Add("X-Title", "Inventory Management System");

        var json = JsonSerializer.Serialize(request, new JsonSerializerOptions
        {
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        });
        httpRequest.Content = new StringContent(json, Encoding.UTF8, "application/json");

        try
        {
            using var response = await _httpClient.SendAsync(httpRequest, ct);
            var responseContent = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("OpenRouter API error HTTP {StatusCode}: {Response}", response.StatusCode, responseContent);
                try
                {
                    var errorObj = JsonSerializer.Deserialize<OpenRouterChatResponse>(responseContent);
                    if (errorObj?.Error != null) return errorObj;
                }
                catch { }

                return new OpenRouterChatResponse
                {
                    Error = new OpenRouterError
                    {
                        Message = $"OpenRouter error ({response.StatusCode}): {responseContent}"
                    }
                };
            }

            var result = JsonSerializer.Deserialize<OpenRouterChatResponse>(responseContent, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return result ?? new OpenRouterChatResponse
            {
                Error = new OpenRouterError { Message = "Empty response received from OpenRouter." }
            };
        }
        catch (TaskCanceledException ex) when (ex.CancellationToken != ct)
        {
            _logger.LogError(ex, "OpenRouter API call timed out after 35s.");
            return new OpenRouterChatResponse
            {
                Error = new OpenRouterError { Message = "OpenRouter request timed out. Please try again." }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception calling OpenRouter API.");
            return new OpenRouterChatResponse
            {
                Error = new OpenRouterError { Message = $"Provider error: {ex.Message}" }
            };
        }
    }

    public async IAsyncEnumerable<OpenRouterStreamChunk> StreamChatCompletionAsync(
        OpenRouterChatRequest request,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
    {
        var apiKey = GetApiKey();
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogError("OpenRouter API key is missing for streaming.");
            yield return new OpenRouterStreamChunk
            {
                Error = new OpenRouterError { Message = "OpenRouter API key is not configured. Please verify your .env file or environment variables." }
            };
            yield break;
        }

        request.Stream = true;

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "chat/completions");
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        httpRequest.Headers.Add("HTTP-Referer", "http://localhost:5068");
        httpRequest.Headers.Add("X-Title", "Inventory Management System");

        var json = JsonSerializer.Serialize(request, new JsonSerializerOptions
        {
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        });
        httpRequest.Content = new StringContent(json, Encoding.UTF8, "application/json");

        HttpResponseMessage? response = null;
        string? connectionError = null;
        bool isCancelled = false;

        try
        {
            response = await _httpClient.SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead, ct);
        }
        catch (OperationCanceledException)
        {
            isCancelled = true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect to OpenRouter streaming endpoint.");
            connectionError = ex.Message;
        }

        if (isCancelled) yield break;

        if (connectionError != null)
        {
            yield return new OpenRouterStreamChunk
            {
                Error = new OpenRouterError { Message = $"Connection error: {connectionError}" }
            };
            yield break;
        }

        if (response == null || !response.IsSuccessStatusCode)
        {
            var errorBody = response != null ? await response.Content.ReadAsStringAsync(ct) : "No response from server";
            _logger.LogWarning("OpenRouter streaming error HTTP {StatusCode}: {Body}", response?.StatusCode, errorBody);
            yield return new OpenRouterStreamChunk
            {
                Error = new OpenRouterError { Message = $"OpenRouter error ({response?.StatusCode}): {errorBody}" }
            };
            yield break;
        }

        using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var reader = new StreamReader(stream, Encoding.UTF8);

        while (!reader.EndOfStream && !ct.IsCancellationRequested)
        {
            string? line = null;
            try
            {
                line = await reader.ReadLineAsync(ct);
            }
            catch (OperationCanceledException)
            {
                yield break;
            }

            if (string.IsNullOrWhiteSpace(line)) continue;

            if (line.StartsWith("data: "))
            {
                var payload = line.Substring(6).Trim();
                if (payload == "[DONE]")
                {
                    break;
                }

                OpenRouterStreamChunk? chunk = null;
                try
                {
                    chunk = JsonSerializer.Deserialize<OpenRouterStreamChunk>(payload, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogTrace(ex, "Failed parsing OpenRouter stream chunk: {Payload}", payload);
                }

                if (chunk != null)
                {
                    yield return chunk;
                }
            }
        }
    }

    private string? GetApiKey()
    {
        if (!string.IsNullOrEmpty(_cachedApiKey)) return _cachedApiKey;

        // 1. Check Configuration
        var key = _configuration["OPENROUTER_API-KEY"] ??
                  _configuration["OPENROUTER_API_KEY"] ??
                  _configuration["OpenRouter:ApiKey"];

        if (!string.IsNullOrEmpty(key))
        {
            _cachedApiKey = key.Trim();
            return _cachedApiKey;
        }

        // 2. Check Environment Variables
        key = Environment.GetEnvironmentVariable("OPENROUTER_API-KEY") ??
              Environment.GetEnvironmentVariable("OPENROUTER_API_KEY");

        if (!string.IsNullOrEmpty(key))
        {
            _cachedApiKey = key.Trim();
            return _cachedApiKey;
        }

        // 3. Check local .env file in parent directories
        try
        {
            var current = Directory.GetCurrentDirectory();
            for (int i = 0; i < 4 && !string.IsNullOrEmpty(current); i++)
            {
                var candidate = Path.Combine(current, ".env");
                if (File.Exists(candidate))
                {
                    var lines = File.ReadAllLines(candidate);
                    foreach (var line in lines)
                    {
                        var trimmed = line.Trim();
                        if (trimmed.StartsWith("OPENROUTER_API-KEY=", StringComparison.OrdinalIgnoreCase) ||
                            trimmed.StartsWith("OPENROUTER_API_KEY=", StringComparison.OrdinalIgnoreCase))
                        {
                            var parts = trimmed.Split('=', 2);
                            if (parts.Length == 2 && !string.IsNullOrWhiteSpace(parts[1]))
                            {
                                _cachedApiKey = parts[1].Trim();
                                return _cachedApiKey;
                            }
                        }
                    }
                }
                var parent = Directory.GetParent(current);
                if (parent == null) break;
                current = parent.FullName;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed scanning for local .env file.");
        }

        return null;
    }
}
