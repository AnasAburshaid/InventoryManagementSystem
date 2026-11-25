# Phase 3 Feature 2: AI Demand Forecasting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a data-driven AI Demand Forecasting engine and interactive dashboard that analyzes 12-month historical sales ledger data, generates statistical forecasts (7, 30, and 90 days) with adaptive algorithms (SMA, WMA, Holt's Linear Exponential Smoothing), computes backtesting accuracy metrics (MAE, WAPE), calculates stockout dates/risks, integrates with the AI Assistant tool registry and AI executive explanation layer, and provides a polished enterprise React UI.

**Architecture:** 
- **Data Source:** Stock movement ledger (`StockMovementType.Sale`), strictly excluding transfers, adjustments, or non-sales transactions.
- **Engine Layer:** Pure statistical algorithms in `ForecastingEngine.cs` adaptively chosen based on historical frequency:
  - Insufficient data (< 2 sales or 0 sales) -> explicit `InsufficientData` status (no invented figures).
  - Low-frequency (< 5 sales) -> Simple Moving Average (SMA).
  - Regular history (>= 5 sales) -> Weighted Moving Average (WMA) & Holt's Linear Trend Exponential Smoothing.
- **Service & Security Layer:** `ForecastingService.cs` enforcing server-side JWT authentication and warehouse authorization (Admins see global or warehouse-scoped; Employees/Managers see only assigned facilities).
- **AI Integration:** 
  1. Assistant tool `get_demand_forecasts` for chat assistant queries.
  2. Endpoint `POST /api/forecasting/ai-insights` using `nvidia/nemotron-3-ultra-550b-a55b:free` grounded in real forecast numbers.
- **Frontend Layer:** `DemandForecastingPage.jsx` with KPI cards, horizon tabs (7, 30, 90 days), warehouse/category filters, dual historical/predicted charts, AI executive summary banner, and detailed forecast table with stockout badges and product detail modals.

**Tech Stack:** ASP.NET Core (.NET 8), Entity Framework Core, SQL Server, React 19, Tailwind CSS v4, Lucide Icons, OpenRouter API.

---

### Task 1: Forecasting Domain DTOs and Contracts

**Files:**
- Create: `InventoryManagementSystem.Business/Forecasting/DTOs/DemandForecastDto.cs`
- Create: `InventoryManagementSystem.Business/Forecasting/DTOs/ForecastSummaryDto.cs`
- Create: `InventoryManagementSystem.Business/Forecasting/DTOs/ProductForecastDetailDto.cs`
- Create: `InventoryManagementSystem.Business/Forecasting/DTOs/DemandForecastQueryRequest.cs`
- Create: `InventoryManagementSystem.Business/Forecasting/DTOs/ForecastingAiInsightRequest.cs`
- Create: `InventoryManagementSystem.Business/Forecasting/DTOs/ForecastingAiInsightResponse.cs`
- Create: `InventoryManagementSystem.Business/Forecasting/Services/IForecastingService.cs`

- [ ] Create DTOs containing predicted demand, average daily demand, trend (`Increasing`, `Stable`, `Decreasing`), current stock, estimated stockout date, stockout risk (`Critical`, `High`, `Moderate`, `Low`, `NoDemand`, `Overstocked`), confidence level (`High`, `Medium`, `Low`, `InsufficientData`), algorithm name, and backtesting metrics (MAE, WAPE).
- [ ] Define `IForecastingService` interface with methods: `GetForecastsAsync`, `GetSummaryAsync`, `GetProductForecastDetailAsync`, and `GenerateAiInsightsAsync`.

---

### Task 2: Statistical Forecasting Engine (`ForecastingEngine.cs`)

**Files:**
- Create: `InventoryManagementSystem.Business/Forecasting/Services/ForecastingEngine.cs`

- [ ] Implement historical sales aggregation: bucket sales by day/week/month from ledger sales.
- [ ] Implement adaptive algorithm selector:
  - If < 2 data points: return `InsufficientData` with 0 confidence.
  - If 2-4 data points: Simple Moving Average (SMA).
  - If >= 5 data points: Weighted Moving Average (WMA) and Holt's Linear Exponential Smoothing with trend parameter.
- [ ] Implement projection calculations for horizons: 7, 30, and 90 days.
- [ ] Implement stockout date calculation: $\text{CurrentStock} / \text{AvgDailyDemand}$ and risk categorization.
- [ ] Implement backtesting validator: hold out the most recent evaluation period, compare forecast vs actual sales, calculate MAE and WAPE.

---

### Task 3: Forecasting Service Implementation & API Controller

**Files:**
- Create: `InventoryManagementSystem.Business/Forecasting/Services/ForecastingService.cs`
- Create: `InventoryManagementSystem.API/Controllers/ForecastingController.cs`
- Modify: `InventoryManagementSystem.API/Program.cs`

- [ ] Implement `ForecastingService.cs` with EF Core queries, server-side warehouse authorization, and ledger stock calculation.
- [ ] Implement `GenerateAiInsightsAsync` using `IOpenRouterClient` with `nvidia/nemotron-3-ultra-550b-a55b:free` grounded strictly in calculated forecast facts.
- [ ] Implement `ForecastingController.cs` with routes:
  - `GET /api/forecasting`
  - `GET /api/forecasting/summary`
  - `GET /api/forecasting/products/{productId}`
  - `POST /api/forecasting/ai-insights`
- [ ] Register `IForecastingService` in `Program.cs`.

---

### Task 4: AI Assistant Tool Integration (`get_demand_forecasts`)

**Files:**
- Create: `InventoryManagementSystem.Business/Assistant/Tools/GetDemandForecastsTool.cs`
- Modify: `InventoryManagementSystem.Business/Assistant/Tools/AssistantToolRegistry.cs`
- Modify: `InventoryManagementSystem.API/Program.cs`

- [ ] Create `GetDemandForecastsTool.cs` implementing `IAssistantTool` accepting `product_id`, `warehouse_id`, `horizon_days`, and `stockout_risk`.
- [ ] Register the tool in `AssistantToolRegistry.cs` and DI container in `Program.cs`.
- [ ] Update assistant suggested prompts to include demand forecasting questions.

---

### Task 5: Frontend Demand Forecasting UI & Navigation

**Files:**
- Create: `inventory-frontend/src/services/forecastingService.js`
- Create: `inventory-frontend/src/pages/DemandForecastingPage.jsx`
- Modify: `inventory-frontend/src/components/layout/Sidebar.jsx`
- Modify: `inventory-frontend/src/App.jsx`
- Modify: `inventory-frontend/src/components/common/CommandPalette.jsx`

- [ ] Implement `forecastingService.js` with API calls (`getForecasts`, `getSummary`, `getProductForecastDetail`, `generateAiInsights`).
- [ ] Build `DemandForecastingPage.jsx`:
  - KPI cards: Total Predicted Demand, Stockout Risk Count, Average Confidence, Top Velocity Product.
  - Horizon selector (7, 30, 90 days), Warehouse filter, Category filter, Stockout Risk filter.
  - Interactive Demand Chart: Historical vs. Predicted Demand.
  - AI Executive Summary Banner with instant generation button.
  - Forecast Data Table with clean status badges, trend icons, and stockout date indicators.
  - Detailed product forecast inspection modal.
- [ ] Add navigation in `Sidebar.jsx` under Executive Oversight (shortcut `G F`), update `App.jsx` routes and `CommandPalette.jsx`.

---

### Task 6: Automated Integration Tests

**Files:**
- Create: `InventoryManagementSystem/ForecastingIntegrationTests.cs`

- [ ] Test historical demand isolation (only `Sale` movements counted; transfers/adjustments excluded).
- [ ] Test 7, 30, and 90-day forecast calculations.
- [ ] Test zero-sales / insufficient data handling.
- [ ] Test stockout date calculation and risk classification.
- [ ] Test MAE and WAPE accuracy calculations.
- [ ] Test server-side warehouse authorization (Admin vs. restricted Employee).
- [ ] Test AI Assistant tool invocation for `get_demand_forecasts`.

---

### Task 7: Verification & Build

- [ ] Run `dotnet test` across all integration tests.
- [ ] Run `npm run build` to verify frontend production build.
- [ ] Execute real OpenRouter test of AI Demand Insights.
- [ ] Verify zero horizontal scrollbars and dark/light mode compatibility.
