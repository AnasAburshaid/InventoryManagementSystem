# Demand forecasting development seed

From the repository root, run with Windows authentication and SQL Server's `sqlcmd` client:

```powershell
sqlcmd -S lpc:localhost -E -C -d InventoryWarehouseManagementDB -b -X1 -v ForecastSeedMode=Development -i scripts/seed_demand_forecasting_dev.sql
```

This command is for the existing local demo database. It requires an installed local SQL Server instance, a shared-memory connection, and the Amman CityMall demo history from `seed_demo_data.sql`. It also requires the active **Amman Central DC** warehouse, **Beverages** category, **pcs** unit of measure, **Other / Manual Adjustment** reason, and an existing administrator associated with the demo history. The command uses the existing ledger actor to satisfy the database foreign key. Run it only on a development copy. The seed is separate from application startup.

The script creates `PRD-TEST-001` (**Test Coffee Beans**) and a dedicated demo customer. It adds 400 units through an opening adjustment, then creates and fulfills one ten-unit sales order on each of 30 consecutive UTC calendar days. Each order has a matching `Sale` ledger movement tied to its order line. It validates 30 fulfilled orders, 300 units sold, and 100 units on hand before committing.

The first run places 15 days of sales on either side of the latest boundary between two completed calendar months. The forecaster uses completed months and needs sales in at least two. This fixture should show **300 historical units**, **100 available units**, and roughly **150 predicted units** over 30 days with low confidence when run on a fresh demo copy. The modeled rate averages the two completed monthly totals, which include days outside the seeded window.

A second run validates the same product, customer, orders, and movements and reports **Already seeded**. Dates stay fixed. If the fixture has drifted or its SKU is already owned by another product, the command exits with an error. The fixture ages out of the forecast's 12-month window and is intentionally not refreshed by rerunning. Use a fresh development copy for a new history window.

In **Demand Forecasting**, use an account with access to **Amman Central DC** and search for `PRD-TEST-001`. The application must be connected to the local demo database seeded by the command.
