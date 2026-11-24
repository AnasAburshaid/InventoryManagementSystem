# AI Assistant — Streaming (SSE), Responsive Layout & Response Quality Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement real Server-Sent Events (SSE) streaming for the AI Inventory Assistant, fix the chat layout so it fits all desktop/mobile windows without horizontal scrolling, polish response formatting to ChatGPT-level readability, and calibrate response conciseness in the system prompt.

**Architecture:** ASP.NET Core controller exposes `POST /api/assistant/chat-stream` returning `text/event-stream`. The `OpenRouterClient` connects to OpenRouter with `stream: true`, parsing incoming SSE chunks. When the model invokes tools, the backend emits `tool_start` / `tool_complete` events and executes the tool; when streaming response tokens, it emits `token` events. The React frontend consumes the stream with `fetch` and `ReadableStream`, progressively rendering parsed Markdown in a responsive, non-overflowing chat layout.

**Tech Stack:** ASP.NET Core (.NET 8), OpenRouter API (`nvidia/nemotron-3-ultra-550b-a55b:free`), Server-Sent Events (SSE), React 19, Tailwind CSS v4, Lucide Icons.

**Spec:** `AI_PLAN.md` (Phase 3 Feature 1.1)

## Global Constraints

- Real provider streaming: Must work with OpenRouter SSE (`stream: true`) and `nvidia/nemotron-3-ultra-550b-a55b:free`. Do not fake streaming.
- Preserve warehouse authorization and read-only invariants.
- No horizontal scrollbars on desktop or mobile.
- Token streaming cancellation support via `AbortController` / `CancellationToken`.

---

### Task 1: OpenRouter Streaming Client & SSE DTOs

**Files:**
- Modify: `InventoryManagementSystem.Business/Assistant/Services/IOpenRouterClient.cs`
- Modify: `InventoryManagementSystem.Business/Assistant/Services/OpenRouterClient.cs`
- Create: `InventoryManagementSystem.Business/Assistant/DTOs/AssistantStreamEvent.cs`

- [ ] Add `StreamChatCompletionAsync(OpenRouterChatRequest request, CancellationToken ct)` to `IOpenRouterClient`.
- [ ] Implement chunk parser for OpenRouter SSE stream handling `delta.content`, `delta.tool_calls`, and `[DONE]`.
- [ ] Create `AssistantStreamEvent` model with event types: `token`, `tool_start`, `tool_complete`, `done`, `error`.

---

### Task 2: Streaming Orchestration Service & Controller Endpoint

**Files:**
- Modify: `InventoryManagementSystem.Business/Assistant/Services/IAssistantService.cs`
- Modify: `InventoryManagementSystem.Business/Assistant/Services/AssistantService.cs`
- Modify: `InventoryManagementSystem.API/Controllers/AssistantController.cs`

- [ ] Update `AssistantService` system prompt:
  - Enforce conciseness: direct short answers for simple questions; structured tables/analysis only for complex multi-metric questions.
  - Ban repetitive intros, echoes of user questions, and generic sign-offs.
- [ ] Implement `IAsyncEnumerable<AssistantStreamEvent> StreamMessageAsync(...)`:
  - Handles multi-turn tool calling with streaming.
  - Emits `tool_start` / `tool_complete` when tools execute.
  - Emits `token` as OpenRouter tokens stream.
- [ ] Add `POST /api/assistant/chat-stream` endpoint in `AssistantController` writing to `HttpResponse.Body` using `text/event-stream`.

---

### Task 3: Backend Integration Tests for Streaming & Conciseness

**Files:**
- Modify: `InventoryManagementSystem/AssistantIntegrationTests.cs`

- [ ] Add test for `POST /api/assistant/chat-stream` confirming `text/event-stream` response and token/tool event payloads.
- [ ] Add test for cancellation during streaming.
- [ ] Run full test suite (`dotnet test`) and verify 100% pass.

---

### Task 4: Frontend Layout, Markdown Formatter & Streaming Hook

**Files:**
- Modify: `inventory-frontend/src/services/assistantService.js`
- Modify: `inventory-frontend/src/pages/AssistantPage.jsx`
- Modify: `inventory-frontend/src/components/layout/Layout.jsx`

- [ ] Update `assistantService.js` to add `streamChatMessage(message, history, activeWarehouseId, onEvent, signal)`.
- [ ] Fix Layout & CSS constraints:
  - Add `min-w-0 max-w-full` across flex parents in `Layout.jsx` and `AssistantPage.jsx`.
  - Ensure tables scroll horizontally *inside* their message container without causing window scroll.
  - Set chat viewport height so input is always anchored at bottom without extra window scrolling.
- [ ] Enhance Markdown Renderer:
  - Support headers (`### `), bold (`**`), bullet lists, numbered lists, status badges, code, and responsive tables.
  - Gracefully handle in-flight partial markdown chunks during active stream.
- [ ] Add real-time streaming state:
  - Display "Consulting [tool]..." badge dynamically when `tool_start` arrives.
  - Stream incoming words progressively.
  - Allow user to click "Stop Generating" or "New Chat" with immediate abort of active stream.

---

### Task 5: End-to-End Verification with Live Provider & Final Report

- [ ] Test live streaming with simple prompt ("How many warehouses do we have?") confirming short, direct streamed answer.
- [ ] Test live streaming with complex tool-calling prompt ("Which warehouse has highest inventory?") confirming tool events + streamed table synthesis.
- [ ] Verify 0 horizontal scrollbars on desktop and mobile viewport sizes.
- [ ] Run production build and test suites.
