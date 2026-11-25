# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Demand forecasting

Open **Executive Oversight → Demand Forecasting** or press **G F**. Choose a 7-, 30-, or 90-day horizon, filter the results, and select a product to inspect its sales history, projected demand, and backtest. The table shows product–warehouse pairs with inventory activity, confirmed demand, or replenishment settings. Warehouse access is enforced by the API.

Forecasts use up to 12 completed calendar months of gross fulfilled sales from the stock ledger. Months after the first eligible sale include zero-sale periods. Open-month sales, transfers, adjustments, and movements linked to cancelled sales orders are excluded from demand. The ledger has no dedicated customer-return movement, so the forecast cannot calculate net sales after returns. Available stock deducts outstanding confirmed and partially fulfilled sales commitments from on-hand inventory.

The engine requires sales in at least two completed months. It uses a simple or weighted moving average for sparse data and Holt's linear trend when sales occur in at least five months. Confidence is derived from rolling backtests when available and is not a probability. Estimate quality depends on representative sales history. Demo history, stockouts, and product seasonality can limit accuracy.

The optional OpenRouter explanation prioritizes supported forecast facts. Quantities, dates, and replenishment suggestions are calculated by the server. If OpenRouter is unavailable, the page displays a statistical summary. Forecasts and explanations are read-only and do not create purchase orders.
