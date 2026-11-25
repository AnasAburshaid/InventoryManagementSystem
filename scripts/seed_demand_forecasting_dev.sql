-- Standalone SQLCMD fixture. See docs/development/demand-forecasting-seed.md.
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF N'$(ForecastSeedMode)' <> N'Development'
   OR DB_NAME() <> N'InventoryWarehouseManagementDB'
   OR ISNULL(CONVERT(nvarchar(32), CONNECTIONPROPERTY('net_transport')), N'') <> N'Shared memory'
    THROW 51000, 'This seed requires explicit Development mode and the local demo database over shared memory.', 1;

-- Confirm the Amman CityMall fixture written by seed_demo_data.sql is present.
IF NOT EXISTS (
    SELECT 1
    FROM dbo.StockMovement movement
    JOIN dbo.SalesOrder orders ON movement.WarehouseId = orders.WarehouseId
        AND movement.ReferenceId = orders.SalesOrderNumber + '#L1'
    JOIN dbo.Warehouse warehouse ON warehouse.Id = orders.WarehouseId
    WHERE movement.MovementType = 'Sale' AND movement.ReferenceType = 'SO-HIST'
        AND orders.SalesOrderNumber LIKE 'SO-CTY-%' AND orders.Notes = N'CityMall store replenishment'
        AND warehouse.Name = N'Amman Central DC'
)
    THROW 51001, 'Demo sales history was not found. This database is not eligible for the forecasting seed.', 1;

DECLARE @ProductId uniqueidentifier = '803EF738-08B8-4940-9BEB-FCEE3359D6DE';
DECLARE @CustomerId uniqueidentifier = 'B132C49A-42B3-49BE-A8BD-D2152F190519';
DECLARE @Sku varchar(50) = 'PRD-TEST-001';
DECLARE @ProductName nvarchar(200) = N'Test Coffee Beans';
DECLARE @CustomerName nvarchar(150) = N'Forecast Demo Customer - Test Coffee Beans';
DECLARE @Marker nvarchar(100) = N'Development forecast seed PRD-TEST-001 v1';
DECLARE @WarehouseId uniqueidentifier;
DECLARE @CategoryId uniqueidentifier;
DECLARE @UnitId uniqueidentifier;
DECLARE @ReasonId uniqueidentifier;
DECLARE @ActorId nvarchar(450);
DECLARE @LockResult int;
DECLARE @StockLock nvarchar(255);
DECLARE @OpeningAt datetime2;
DECLARE @StartDate date;
DECLARE @Existing bit = 0;

BEGIN TRY
    BEGIN TRANSACTION;

    EXEC @LockResult = sys.sp_getapplock
        @Resource = 'DevelopmentForecastSeed_PRD_TEST_001', @LockMode = 'Exclusive',
        @LockOwner = 'Transaction', @LockTimeout = 15000, @DbPrincipal = 'public';
    IF @LockResult < 0
        THROW 51002, 'Could not lock the forecasting seed.', 1;

    IF (SELECT COUNT(*) FROM dbo.Warehouse WHERE Name = N'Amman Central DC' AND IsActive = 1) <> 1
        THROW 51003, 'Expected one active warehouse named Amman Central DC.', 1;
    SELECT @WarehouseId = Id FROM dbo.Warehouse WHERE Name = N'Amman Central DC' AND IsActive = 1;

    -- Same transaction-owned warehouse/product lock as StockMovementService.
    SET @StockLock = CONCAT('StockLock_', LOWER(REPLACE(CONVERT(varchar(36), @WarehouseId), '-', '')),
        '_', LOWER(REPLACE(CONVERT(varchar(36), @ProductId), '-', '')));
    EXEC @LockResult = sys.sp_getapplock
        @Resource = @StockLock, @LockMode = 'Exclusive', @LockOwner = 'Transaction',
        @LockTimeout = 15000, @DbPrincipal = 'public';
    IF @LockResult < 0
        THROW 51004, 'Could not lock stock for the test product.', 1;

    SELECT @CategoryId = Id FROM dbo.Category WHERE Name = N'Beverages' AND IsActive = 1;
    SELECT @UnitId = Id FROM dbo.UnitOfMeasure WHERE Code = 'pcs' AND IsActive = 1;
    SELECT @ReasonId = Id FROM dbo.AdjustmentReason WHERE Name = N'Other / Manual Adjustment' AND IsActive = 1;
    IF @CategoryId IS NULL OR @UnitId IS NULL OR @ReasonId IS NULL
        THROW 51005, 'The active Beverages category, pcs unit, and Other / Manual Adjustment reason are required.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Warehouse WHERE Id = @WarehouseId AND CanAcceptAllCategories = 1)
       AND NOT EXISTS (
           SELECT 1 FROM dbo.WarehouseCategoryRestriction WHERE WarehouseId = @WarehouseId AND CategoryId = @CategoryId
       )
        THROW 51006, 'Amman Central DC does not accept the Beverages category.', 1;

    IF EXISTS (SELECT 1 FROM dbo.Product WHERE SKU = @Sku AND Id <> @ProductId)
       OR EXISTS (SELECT 1 FROM dbo.Product WHERE Id = @ProductId AND
          (SKU <> @Sku OR Name <> @ProductName OR IsActive <> 1 OR CategoryId <> @CategoryId OR UnitOfMeasureId <> @UnitId))
       OR EXISTS (SELECT 1 FROM dbo.Customer WHERE Name = @CustomerName AND Id <> @CustomerId)
       OR EXISTS (SELECT 1 FROM dbo.Customer WHERE Id = @CustomerId AND (Name <> @CustomerName OR IsActive <> 1))
        THROW 51007, 'A product or customer conflicts with the seed identity. No records were changed.', 1;

    SELECT @OpeningAt = CreatedAt, @ActorId = CreatedByUserId
    FROM dbo.StockMovement
    WHERE ProductId = @ProductId AND WarehouseId = @WarehouseId
        AND ReferenceType = 'ForecastDevelopmentSeed' AND ReferenceId = @Marker
        AND MovementType = 'AdjustmentIn' AND Quantity = 400 AND AdjustmentReasonId = @ReasonId;

    IF @OpeningAt IS NOT NULL
    BEGIN
        SET @Existing = 1;
        SET @StartDate = DATEADD(day, 1, CONVERT(date, @OpeningAt));
    END
    ELSE
    BEGIN
        IF EXISTS (SELECT 1 FROM dbo.Product WHERE Id = @ProductId)
           OR EXISTS (SELECT 1 FROM dbo.Customer WHERE Id = @CustomerId)
           OR EXISTS (SELECT 1 FROM dbo.SalesOrder WHERE SalesOrderNumber LIKE 'SO-DFTEST-%')
            THROW 51008, 'Found incomplete or conflicting fixture records. The seed will not repair or overwrite them.', 1;

        SELECT TOP (1) @ActorId = u.Id
        FROM dbo.AspNetUsers u
        JOIN dbo.AspNetUserRoles ur ON ur.UserId = u.Id
        JOIN dbo.AspNetRoles role ON role.Id = ur.RoleId
        WHERE role.NormalizedName = 'ADMIN' AND EXISTS (
            SELECT 1 FROM dbo.StockMovement m
            WHERE m.CreatedByUserId = u.Id AND m.ReferenceType = 'SO-HIST' AND m.MovementType = 'Sale'
        )
        ORDER BY u.Id;
        IF @ActorId IS NULL
            THROW 51009, 'No existing administrator associated with demo sales was found for ledger attribution.', 1;

        DECLARE @UtcToday date = CONVERT(date, SYSUTCDATETIME());
        DECLARE @CurrentMonth date = DATEFROMPARTS(YEAR(@UtcToday), MONTH(@UtcToday), 1);
        DECLARE @PreviousMonth date = DATEADD(month, -1, @CurrentMonth);
        SET @StartDate = DATEADD(day, -15, @PreviousMonth);
        SET @OpeningAt = DATEADD(day, -1, CONVERT(datetime2, @StartDate));
    END;

    DECLARE @Sales TABLE (
        Number varchar(30) PRIMARY KEY,
        OrderAt datetime2 NOT NULL,
        FulfilledAt datetime2 NOT NULL,
        OrderId uniqueidentifier NOT NULL
    );
    WITH Days AS (
        SELECT 0 AS OffsetDays
        UNION ALL
        SELECT OffsetDays + 1 FROM Days WHERE OffsetDays < 29
    )
    INSERT INTO @Sales (Number, OrderAt, FulfilledAt, OrderId)
    SELECT 'SO-DFTEST-' + CONVERT(char(8), DATEADD(day, OffsetDays, @StartDate), 112),
        DATEADD(hour, 9, CONVERT(datetime2, DATEADD(day, OffsetDays, @StartDate))),
        DATEADD(hour, 15, CONVERT(datetime2, DATEADD(day, OffsetDays, @StartDate))), NEWID()
    FROM Days;

    IF @Existing = 0
    BEGIN
        INSERT INTO dbo.Product (Id, SKU, Name, UnitOfMeasureId, CategoryId, ReorderThreshold, SellingPrice, CreatedAt, IsActive)
        VALUES (@ProductId, @Sku, @ProductName, @UnitId, @CategoryId, 0, 12.50, @OpeningAt, 1);

        INSERT INTO dbo.Customer (Id, Name, CreatedAt, IsActive)
        VALUES (@CustomerId, @CustomerName, @OpeningAt, 1);

        INSERT INTO dbo.StockMovement (Id, ProductId, WarehouseId, Quantity, MovementType, AdjustmentReasonId,
            ReferenceType, ReferenceId, CreatedByUserId, CreatedAt)
        VALUES (NEWID(), @ProductId, @WarehouseId, 400, 'AdjustmentIn', @ReasonId,
            'ForecastDevelopmentSeed', @Marker, @ActorId, @OpeningAt);

        -- Materialize the same confirmed order, fulfilled line and sale ledger state
        -- as the normal sales workflow. The application stamps fulfillment with today's
        -- date, so the fixture supplies historical dates when the rows are first written.
        INSERT INTO dbo.SalesOrder (Id, SalesOrderNumber, CustomerId, WarehouseId, OrderDate, Status, Notes,
            CreatedByUserId, CreatedAt, UpdatedAt)
        SELECT OrderId, Number, @CustomerId, @WarehouseId, OrderAt, 'Draft', @Marker, @ActorId, OrderAt, NULL
        FROM @Sales;

        INSERT INTO dbo.SalesOrderLine (Id, SalesOrderId, LineNumber, ProductId, QuantityOrdered, QuantityFulfilled,
            UnitPrice, CreatedAt)
        SELECT NEWID(), OrderId, 1, @ProductId, 10, 0, 12.50, OrderAt FROM @Sales;

        UPDATE orders SET Status = 'Confirmed', UpdatedAt = sale.OrderAt
        FROM dbo.SalesOrder orders JOIN @Sales sale ON sale.OrderId = orders.Id
        WHERE orders.Status = 'Draft';

        IF (SELECT SUM(Quantity) FROM dbo.StockMovement WHERE ProductId = @ProductId AND WarehouseId = @WarehouseId
            AND MovementType = 'AdjustmentIn') < (SELECT COUNT(*) * 10 FROM @Sales)
            THROW 51010, 'The opening stock cannot cover all seeded sales.', 1;

        INSERT INTO dbo.StockMovement (Id, ProductId, WarehouseId, Quantity, MovementType, ReferenceType,
            ReferenceId, CreatedByUserId, CreatedAt)
        SELECT NEWID(), @ProductId, @WarehouseId, 10, 'Sale', 'SalesOrder', Number + '#L1', @ActorId, FulfilledAt
        FROM @Sales;

        UPDATE line SET QuantityFulfilled = line.QuantityOrdered
        FROM dbo.SalesOrderLine line JOIN @Sales sale ON sale.OrderId = line.SalesOrderId;

        UPDATE orders SET Status = 'Fulfilled', UpdatedAt = sale.FulfilledAt
        FROM dbo.SalesOrder orders JOIN @Sales sale ON sale.OrderId = orders.Id
        WHERE orders.Status = 'Confirmed';
    END;

    -- A rerun verifies ownership and the full fixture instead of repairing drift.
    IF (SELECT COUNT(*) FROM dbo.Product WHERE Id = @ProductId AND SKU = @Sku) <> 1
       OR (SELECT COUNT(*) FROM dbo.Customer WHERE Id = @CustomerId) <> 1
       OR (SELECT COUNT(*) FROM dbo.SalesOrder WHERE CustomerId = @CustomerId OR SalesOrderNumber LIKE 'SO-DFTEST-%') <> 30
       OR (SELECT COUNT(*) FROM dbo.SalesOrderLine WHERE ProductId = @ProductId) <> 30
       OR (SELECT COUNT(*) FROM dbo.StockMovement WHERE ProductId = @ProductId) <> 31
       OR EXISTS (
           SELECT 1 FROM @Sales expected
           WHERE (SELECT COUNT(*) FROM dbo.SalesOrder orders
               JOIN dbo.SalesOrderLine line ON line.SalesOrderId = orders.Id
               JOIN dbo.StockMovement movement ON movement.ProductId = line.ProductId
               WHERE orders.SalesOrderNumber = expected.Number AND orders.Status = 'Fulfilled'
                   AND orders.CustomerId = @CustomerId AND orders.WarehouseId = @WarehouseId
                   AND orders.Notes = @Marker AND orders.OrderDate = expected.OrderAt
                   AND orders.UpdatedAt = expected.FulfilledAt
                   AND line.ProductId = @ProductId AND line.LineNumber = 1
                   AND line.QuantityOrdered = 10 AND line.QuantityFulfilled = 10
                   AND (SELECT COUNT(*) FROM dbo.SalesOrderLine item WHERE item.SalesOrderId = orders.Id) = 1
                   AND movement.WarehouseId = @WarehouseId AND movement.MovementType = 'Sale'
                   AND movement.Quantity = 10 AND movement.ReferenceType = 'SalesOrder'
                   AND movement.ReferenceId = expected.Number + '#L1'
                   AND movement.CreatedAt = expected.FulfilledAt) <> 1
       )
        THROW 51011, 'Forecasting fixture differs from the complete expected data. No records were changed.', 1;

    DECLARE @CurrentStock decimal(18,4) = (
        SELECT SUM(CASE WHEN MovementType IN ('Purchase', 'AdjustmentIn', 'TransferIn') THEN Quantity ELSE -Quantity END)
        FROM dbo.StockMovement WHERE ProductId = @ProductId AND WarehouseId = @WarehouseId
    );
    IF @CurrentStock IS NULL OR @CurrentStock <> 100
        THROW 51012, 'Expected 100 units on hand after seeding.', 1;

    COMMIT TRANSACTION;
    SELECT CASE WHEN @Existing = 1 THEN 'Already seeded' ELSE 'Seeded' END AS Outcome,
        @Sku AS SKU, 'Amman Central DC' AS Warehouse, @StartDate AS FirstSaleUtc,
        DATEADD(day, 29, @StartDate) AS LastSaleUtc, 30 AS FulfilledOrders,
        400 AS OpeningStock, 300 AS UnitsSold, @CurrentStock AS CurrentStock;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
