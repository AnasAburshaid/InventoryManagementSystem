-- =========================================================================================
-- Enterprise Supply Chain Demo Seed Data Script (12-Month Realistic Operations)
-- =========================================================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

PRINT 'Beginning Supply Chain Seed Data Migration...';

DECLARE @AdminUserId NVARCHAR(450) = (SELECT TOP 1 Id FROM AspNetUsers WHERE UserName = 'anasaburshaid@gmail.com');
IF @AdminUserId IS NULL
    SET @AdminUserId = (SELECT TOP 1 Id FROM AspNetUsers);

IF @AdminUserId IS NULL
BEGIN
    SET @AdminUserId = '28b7f423-3a13-4579-a9b3-841dc28780c9';
END;

-- =========================================================================================
-- 1. CATEGORIES (10 Categories)
-- =========================================================================================
PRINT '1. Seeding Categories...';

DECLARE @CatFreshProduce UNIQUEIDENTIFIER = '794BF0D8-5BC1-4F1B-AC7B-93A852E061E0';
DECLARE @CatElectronics UNIQUEIDENTIFIER  = 'E0173156-E0A8-4C31-AF6B-46FF3312B49D';
DECLARE @CatDairy UNIQUEIDENTIFIER        = 'A1000001-0000-0000-0000-000000000001';
DECLARE @CatBeverages UNIQUEIDENTIFIER    = 'A1000001-0000-0000-0000-000000000002';
DECLARE @CatSnacks UNIQUEIDENTIFIER       = 'A1000001-0000-0000-0000-000000000003';
DECLARE @CatMeat UNIQUEIDENTIFIER         = 'A1000001-0000-0000-0000-000000000004';
DECLARE @CatMobile UNIQUEIDENTIFIER       = 'A1000001-0000-0000-0000-000000000005';
DECLARE @CatComputers UNIQUEIDENTIFIER    = 'A1000001-0000-0000-0000-000000000006';
DECLARE @CatOffice UNIQUEIDENTIFIER       = 'A1000001-0000-0000-0000-000000000007';
DECLARE @CatAppliances UNIQUEIDENTIFIER   = 'A1000001-0000-0000-0000-000000000008';

UPDATE Category SET Name = 'Fresh Produce' WHERE Id = @CatFreshProduce;
UPDATE Category SET Name = 'Consumer Electronics' WHERE Id = @CatElectronics;

IF NOT EXISTS (SELECT 1 FROM Category WHERE Id = @CatDairy)
    INSERT INTO Category (Id, Name, CreatedAt, IsActive) VALUES (@CatDairy, 'Dairy & Eggs', '2025-10-01', 1);

IF NOT EXISTS (SELECT 1 FROM Category WHERE Id = @CatBeverages)
    INSERT INTO Category (Id, Name, CreatedAt, IsActive) VALUES (@CatBeverages, 'Beverages', '2025-10-01', 1);

IF NOT EXISTS (SELECT 1 FROM Category WHERE Id = @CatSnacks)
    INSERT INTO Category (Id, Name, CreatedAt, IsActive) VALUES (@CatSnacks, 'Snacks & Confectionery', '2025-10-01', 1);

IF NOT EXISTS (SELECT 1 FROM Category WHERE Id = @CatMeat)
    INSERT INTO Category (Id, Name, CreatedAt, IsActive) VALUES (@CatMeat, 'Meat & Seafood', '2025-10-01', 1);

IF NOT EXISTS (SELECT 1 FROM Category WHERE Id = @CatMobile)
    INSERT INTO Category (Id, Name, CreatedAt, IsActive) VALUES (@CatMobile, 'Mobile & Accessories', '2025-10-01', 1);

IF NOT EXISTS (SELECT 1 FROM Category WHERE Id = @CatComputers)
    INSERT INTO Category (Id, Name, CreatedAt, IsActive) VALUES (@CatComputers, 'Computer Hardware', '2025-10-01', 1);

IF NOT EXISTS (SELECT 1 FROM Category WHERE Id = @CatOffice)
    INSERT INTO Category (Id, Name, CreatedAt, IsActive) VALUES (@CatOffice, 'Office Supplies', '2025-10-01', 1);

IF NOT EXISTS (SELECT 1 FROM Category WHERE Id = @CatAppliances)
    INSERT INTO Category (Id, Name, CreatedAt, IsActive) VALUES (@CatAppliances, 'Small Home Appliances', '2025-10-01', 1);

-- =========================================================================================
-- 2. BRANDS (14 Brands)
-- =========================================================================================
PRINT '2. Seeding Brands...';

DECLARE @BrandApple UNIQUEIDENTIFIER   = 'CB4A4FE1-22D5-4BBA-9532-96114DFFFA6A';
DECLARE @BrandSamsung UNIQUEIDENTIFIER = 'AB2601CB-D37D-48CF-B45F-DACE1D4C6294';
DECLARE @BrandXiaomi UNIQUEIDENTIFIER  = '60614C30-10FA-4211-BC26-9EC0947AEBC2';
DECLARE @BrandSony UNIQUEIDENTIFIER    = 'B2000001-0000-0000-0000-000000000001';
DECLARE @BrandDell UNIQUEIDENTIFIER    = 'B2000001-0000-0000-0000-000000000002';
DECLARE @BrandLG UNIQUEIDENTIFIER      = 'B2000001-0000-0000-0000-000000000003';
DECLARE @BrandDole UNIQUEIDENTIFIER    = 'B2000001-0000-0000-0000-000000000004';
DECLARE @BrandChiquita UNIQUEIDENTIFIER= 'B2000001-0000-0000-0000-000000000005';
DECLARE @BrandNestle UNIQUEIDENTIFIER  = 'B2000001-0000-0000-0000-000000000006';
DECLARE @BrandPepsiCo UNIQUEIDENTIFIER = 'B2000001-0000-0000-0000-000000000007';
DECLARE @BrandTyson UNIQUEIDENTIFIER   = 'B2000001-0000-0000-0000-000000000008';
DECLARE @BrandHP UNIQUEIDENTIFIER      = 'B2000001-0000-0000-0000-000000000009';
DECLARE @BrandLogitech UNIQUEIDENTIFIER= 'B2000001-0000-0000-0000-000000000010';
DECLARE @BrandPhilips UNIQUEIDENTIFIER = 'B2000001-0000-0000-0000-000000000011';

IF NOT EXISTS (SELECT 1 FROM Brand WHERE Id = @BrandSony)
    INSERT INTO Brand (Id, Name, CreatedAt, IsActive) VALUES (@BrandSony, 'Sony', '2025-10-01', 1);

IF NOT EXISTS (SELECT 1 FROM Brand WHERE Id = @BrandDell)
    INSERT INTO Brand (Id, Name, CreatedAt, IsActive) VALUES (@BrandDell, 'Dell', '2025-10-01', 1);

IF NOT EXISTS (SELECT 1 FROM Brand WHERE Id = @BrandLG)
    INSERT INTO Brand (Id, Name, CreatedAt, IsActive) VALUES (@BrandLG, 'LG', '2025-10-01', 1);

IF NOT EXISTS (SELECT 1 FROM Brand WHERE Id = @BrandDole)
    INSERT INTO Brand (Id, Name, CreatedAt, IsActive) VALUES (@BrandDole, 'Dole', '2025-10-01', 1);

IF NOT EXISTS (SELECT 1 FROM Brand WHERE Id = @BrandChiquita)
    INSERT INTO Brand (Id, Name, CreatedAt, IsActive) VALUES (@BrandChiquita, 'Chiquita', '2025-10-01', 1);

IF NOT EXISTS (SELECT 1 FROM Brand WHERE Id = @BrandNestle)
    INSERT INTO Brand (Id, Name, CreatedAt, IsActive) VALUES (@BrandNestle, 'Nestle', '2025-10-01', 1);

IF NOT EXISTS (SELECT 1 FROM Brand WHERE Id = @BrandPepsiCo)
    INSERT INTO Brand (Id, Name, CreatedAt, IsActive) VALUES (@BrandPepsiCo, 'PepsiCo', '2025-10-01', 1);

IF NOT EXISTS (SELECT 1 FROM Brand WHERE Id = @BrandTyson)
    INSERT INTO Brand (Id, Name, CreatedAt, IsActive) VALUES (@BrandTyson, 'Tyson Foods', '2025-10-01', 1);

IF NOT EXISTS (SELECT 1 FROM Brand WHERE Id = @BrandHP)
    INSERT INTO Brand (Id, Name, CreatedAt, IsActive) VALUES (@BrandHP, 'HP', '2025-10-01', 1);

IF NOT EXISTS (SELECT 1 FROM Brand WHERE Id = @BrandLogitech)
    INSERT INTO Brand (Id, Name, CreatedAt, IsActive) VALUES (@BrandLogitech, 'Logitech', '2025-10-01', 1);

IF NOT EXISTS (SELECT 1 FROM Brand WHERE Id = @BrandPhilips)
    INSERT INTO Brand (Id, Name, CreatedAt, IsActive) VALUES (@BrandPhilips, 'Philips', '2025-10-01', 1);

-- =========================================================================================
-- 3. UNITS OF MEASURE
-- =========================================================================================
DECLARE @UomPcs UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM UnitOfMeasure WHERE Code = 'pcs');
DECLARE @UomKg UNIQUEIDENTIFIER  = (SELECT TOP 1 Id FROM UnitOfMeasure WHERE Code = 'kg');
DECLARE @UomBox UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM UnitOfMeasure WHERE Code = 'box');
DECLARE @UomL UNIQUEIDENTIFIER   = (SELECT TOP 1 Id FROM UnitOfMeasure WHERE Code = 'L');
DECLARE @UomPack UNIQUEIDENTIFIER= (SELECT TOP 1 Id FROM UnitOfMeasure WHERE Code = 'pack');

-- =========================================================================================
-- 4. WAREHOUSES (6 Specialized & General Warehouses)
-- =========================================================================================
PRINT '4. Seeding Warehouses & Restrictions...';

DECLARE @WhAmmanMain UNIQUEIDENTIFIER   = 'FE012011-9607-4CE1-BA62-A98E1878953B';
DECLARE @WhSouthAmman UNIQUEIDENTIFIER  = '04383E59-4CA5-435A-AFD8-07ABB1F22D40';
DECLARE @WhSalt UNIQUEIDENTIFIER        = '7437A14E-9BB1-45F2-838F-5B12208B77A2';
DECLARE @WhZarqaCold UNIQUEIDENTIFIER   = 'C3000001-0000-0000-0000-000000000001';
DECLARE @WhIrbidTech UNIQUEIDENTIFIER   = 'C3000001-0000-0000-0000-000000000002';
DECLARE @WhAqabaFood UNIQUEIDENTIFIER   = 'C3000001-0000-0000-0000-000000000003';

UPDATE Warehouse SET Name = 'Amman Central DC', Code = 'WH-CENTRAL', CanAcceptAllCategories = 1 WHERE Id = @WhAmmanMain;
UPDATE Warehouse SET Name = 'Sahab Regional Hub', Code = 'WH-EAST', CanAcceptAllCategories = 1 WHERE Id = @WhSouthAmman;
UPDATE Warehouse SET Name = 'Salt Equipment Hub', Code = 'WH-APPL', CanAcceptAllCategories = 0 WHERE Id = @WhSalt;

IF NOT EXISTS (SELECT 1 FROM Warehouse WHERE Id = @WhZarqaCold)
    INSERT INTO Warehouse (Id, Name, Code, Address, CreatedAt, IsActive, CanAcceptAllCategories)
    VALUES (@WhZarqaCold, 'Zarqa Cold Storage', 'WH-COLD', 'Zarqa Free Zone, Building 4', '2025-10-01', 1, 0);

IF NOT EXISTS (SELECT 1 FROM Warehouse WHERE Id = @WhIrbidTech)
    INSERT INTO Warehouse (Id, Name, Code, Address, CreatedAt, IsActive, CanAcceptAllCategories)
    VALUES (@WhIrbidTech, 'Irbid Tech Hub', 'WH-TECH', 'Irbid Cyber City, Sector 9', '2025-10-01', 1, 0);

IF NOT EXISTS (SELECT 1 FROM Warehouse WHERE Id = @WhAqabaFood)
    INSERT INTO Warehouse (Id, Name, Code, Address, CreatedAt, IsActive, CanAcceptAllCategories)
    VALUES (@WhAqabaFood, 'Aqaba Grocery Depot', 'WH-FOOD', 'Aqaba Port Logistics Area', '2025-10-01', 1, 0);

-- Warehouse Category Restrictions
DELETE FROM WarehouseCategoryRestriction WHERE WarehouseId = @WhZarqaCold;
INSERT INTO WarehouseCategoryRestriction (WarehouseId, CategoryId) VALUES
(@WhZarqaCold, @CatFreshProduce),
(@WhZarqaCold, @CatDairy),
(@WhZarqaCold, @CatMeat);

DELETE FROM WarehouseCategoryRestriction WHERE WarehouseId = @WhIrbidTech;
INSERT INTO WarehouseCategoryRestriction (WarehouseId, CategoryId) VALUES
(@WhIrbidTech, @CatElectronics),
(@WhIrbidTech, @CatMobile),
(@WhIrbidTech, @CatComputers);

DELETE FROM WarehouseCategoryRestriction WHERE WarehouseId = @WhAqabaFood;
INSERT INTO WarehouseCategoryRestriction (WarehouseId, CategoryId) VALUES
(@WhAqabaFood, @CatFreshProduce),
(@WhAqabaFood, @CatDairy),
(@WhAqabaFood, @CatBeverages),
(@WhAqabaFood, @CatSnacks);

DELETE FROM WarehouseCategoryRestriction WHERE WarehouseId = @WhSalt;
INSERT INTO WarehouseCategoryRestriction (WarehouseId, CategoryId) VALUES
(@WhSalt, @CatAppliances),
(@WhSalt, @CatOffice);

INSERT INTO WarehouseAssignment (Id, UserId, WarehouseId, Role, AssignedAt, IsActive)
SELECT NEWID(), @AdminUserId, w.Id, 2, '2025-10-01', 1
FROM Warehouse w
WHERE NOT EXISTS (SELECT 1 FROM WarehouseAssignment wa WHERE wa.UserId = @AdminUserId AND wa.WarehouseId = w.Id);

-- =========================================================================================
-- 5. SUPPLIERS (12 Suppliers with Capability Profiles)
-- =========================================================================================
PRINT '5. Seeding Suppliers & Capability Matrix...';

DECLARE @SupWasfi UNIQUEIDENTIFIER    = '8529CC8F-E94C-4249-AFC0-55BD3DBD671F';
DECLARE @SupSaif UNIQUEIDENTIFIER     = '971A33C6-F3E5-44CE-9A74-BA2948AC0966';
DECLARE @SupQusai UNIQUEIDENTIFIER    = '418A7A6F-2DA4-4414-9C2B-C86F799B8B57';
DECLARE @SupCupertino UNIQUEIDENTIFIER= 'D4000001-0000-0000-0000-000000000001';
DECLARE @SupNaseem UNIQUEIDENTIFIER   = 'D4000001-0000-0000-0000-000000000002';
DECLARE @SupOrient UNIQUEIDENTIFIER   = 'D4000001-0000-0000-0000-000000000003';
DECLARE @SupLevant UNIQUEIDENTIFIER   = 'D4000001-0000-0000-0000-000000000004';
DECLARE @SupHomeTech UNIQUEIDENTIFIER = 'D4000001-0000-0000-0000-000000000005';
DECLARE @SupDelta UNIQUEIDENTIFIER    = 'D4000001-0000-0000-0000-000000000006';
DECLARE @SupRedSea UNIQUEIDENTIFIER   = 'D4000001-0000-0000-0000-000000000007';
DECLARE @SupBarakah UNIQUEIDENTIFIER  = 'D4000001-0000-0000-0000-000000000008';
DECLARE @SupPrimeMeat UNIQUEIDENTIFIER= 'D4000001-0000-0000-0000-000000000009';

UPDATE Supplier SET Name = 'Wasfi Global Distribution', CanSupplyAllCategories = 1, CanSupplyAllBrands = 1 WHERE Id = @SupWasfi;
UPDATE Supplier SET Name = 'Saif Fresh Farms', CanSupplyAllCategories = 0, CanSupplyAllBrands = 0 WHERE Id = @SupSaif;
UPDATE Supplier SET Name = 'Qusai Electronics Trading', CanSupplyAllCategories = 0, CanSupplyAllBrands = 0 WHERE Id = @SupQusai;

IF NOT EXISTS (SELECT 1 FROM Supplier WHERE Id = @SupCupertino)
    INSERT INTO Supplier (Id, Name, Email, Phone, CreatedAt, IsActive, CanSupplyAllCategories, CanSupplyAllBrands)
    VALUES (@SupCupertino, 'Cupertino Direct (Apple Authorized)', 'orders@apple-levant.com', '+96265001111', '2025-10-01', 1, 0, 0);

IF NOT EXISTS (SELECT 1 FROM Supplier WHERE Id = @SupNaseem)
    INSERT INTO Supplier (Id, Name, Email, Phone, CreatedAt, IsActive, CanSupplyAllCategories, CanSupplyAllBrands)
    VALUES (@SupNaseem, 'Al-Naseem Dairy & Poultry', 'sales@alnaseem.jo', '+96265002222', '2025-10-01', 1, 0, 0);

IF NOT EXISTS (SELECT 1 FROM Supplier WHERE Id = @SupOrient)
    INSERT INTO Supplier (Id, Name, Email, Phone, CreatedAt, IsActive, CanSupplyAllCategories, CanSupplyAllBrands)
    VALUES (@SupOrient, 'Orient Tech Wholesale', 'info@orienttech.jo', '+96265003333', '2025-10-01', 1, 0, 0);

IF NOT EXISTS (SELECT 1 FROM Supplier WHERE Id = @SupLevant)
    INSERT INTO Supplier (Id, Name, Email, Phone, CreatedAt, IsActive, CanSupplyAllCategories, CanSupplyAllBrands)
    VALUES (@SupLevant, 'Levant Beverage & Snack Co', 'orders@levantbev.com', '+96265004444', '2025-10-01', 1, 0, 0);

IF NOT EXISTS (SELECT 1 FROM Supplier WHERE Id = @SupHomeTech)
    INSERT INTO Supplier (Id, Name, Email, Phone, CreatedAt, IsActive, CanSupplyAllCategories, CanSupplyAllBrands)
    VALUES (@SupHomeTech, 'HomeTech Middle East', 'b2b@hometech-me.com', '+96265005555', '2025-10-01', 1, 0, 0);

IF NOT EXISTS (SELECT 1 FROM Supplier WHERE Id = @SupDelta)
    INSERT INTO Supplier (Id, Name, Email, Phone, CreatedAt, IsActive, CanSupplyAllCategories, CanSupplyAllBrands)
    VALUES (@SupDelta, 'Delta Office Solutions', 'corporate@delta-office.jo', '+96265006666', '2025-10-01', 1, 0, 0);

IF NOT EXISTS (SELECT 1 FROM Supplier WHERE Id = @SupRedSea)
    INSERT INTO Supplier (Id, Name, Email, Phone, CreatedAt, IsActive, CanSupplyAllCategories, CanSupplyAllBrands)
    VALUES (@SupRedSea, 'Red Sea Seafood Imports', 'supply@redseafish.jo', '+96232007777', '2025-10-01', 1, 0, 0);

IF NOT EXISTS (SELECT 1 FROM Supplier WHERE Id = @SupBarakah)
    INSERT INTO Supplier (Id, Name, Email, Phone, CreatedAt, IsActive, CanSupplyAllCategories, CanSupplyAllBrands)
    VALUES (@SupBarakah, 'Al-Barakah Bulk Produce', 'sales@albarakah-farms.jo', '+96253008888', '2025-10-01', 1, 0, 0);

IF NOT EXISTS (SELECT 1 FROM Supplier WHERE Id = @SupPrimeMeat)
    INSERT INTO Supplier (Id, Name, Email, Phone, CreatedAt, IsActive, CanSupplyAllCategories, CanSupplyAllBrands)
    VALUES (@SupPrimeMeat, 'Prime Meat Suppliers', 'orders@primemeat.jo', '+96265009999', '2025-10-01', 1, 0, 0);

-- Supplier Category Capabilities
DELETE FROM SupplierCategoryCapability;
INSERT INTO SupplierCategoryCapability (SupplierId, CategoryId) VALUES
(@SupSaif, @CatFreshProduce), (@SupSaif, @CatDairy),
(@SupQusai, @CatElectronics), (@SupQusai, @CatMobile),
(@SupCupertino, @CatElectronics), (@SupCupertino, @CatMobile),
(@SupNaseem, @CatDairy), (@SupNaseem, @CatMeat),
(@SupOrient, @CatMobile), (@SupOrient, @CatComputers),
(@SupLevant, @CatBeverages), (@SupLevant, @CatSnacks),
(@SupHomeTech, @CatAppliances), (@SupHomeTech, @CatElectronics),
(@SupDelta, @CatOffice), (@SupDelta, @CatComputers),
(@SupRedSea, @CatMeat),
(@SupBarakah, @CatFreshProduce),
(@SupPrimeMeat, @CatMeat);

-- Supplier Brand Capabilities
DELETE FROM SupplierBrandCapability;
INSERT INTO SupplierBrandCapability (SupplierId, BrandId) VALUES
(@SupSaif, @BrandDole), (@SupSaif, @BrandChiquita),
(@SupQusai, @BrandSamsung), (@SupQusai, @BrandXiaomi),
(@SupCupertino, @BrandApple),
(@SupNaseem, @BrandTyson),
(@SupOrient, @BrandDell), (@SupOrient, @BrandHP), (@SupOrient, @BrandLogitech), (@SupOrient, @BrandSony),
(@SupLevant, @BrandNestle), (@SupLevant, @BrandPepsiCo),
(@SupHomeTech, @BrandPhilips), (@SupHomeTech, @BrandLG), (@SupHomeTech, @BrandSamsung),
(@SupDelta, @BrandHP), (@SupDelta, @BrandDell), (@SupDelta, @BrandLogitech),
(@SupPrimeMeat, @BrandTyson);

-- =========================================================================================
-- 6. CUSTOMERS (Corporate & Retail B2B Clients)
-- =========================================================================================
PRINT '6. Seeding Customers...';

DECLARE @CustCarrefour UNIQUEIDENTIFIER = 'E5000001-0000-0000-0000-000000000001';
DECLARE @CustSafeway UNIQUEIDENTIFIER   = 'E5000001-0000-0000-0000-000000000002';
DECLARE @CustCityMall UNIQUEIDENTIFIER  = 'E5000001-0000-0000-0000-000000000003';
DECLARE @CustTechMart UNIQUEIDENTIFIER  = 'E5000001-0000-0000-0000-000000000004';
DECLARE @CustLocalGrocer UNIQUEIDENTIFIER='E5000001-0000-0000-0000-000000000005';

IF NOT EXISTS (SELECT 1 FROM Customer WHERE Id = @CustCarrefour)
    INSERT INTO Customer (Id, Name, Email, Phone, CreatedAt, IsActive)
    VALUES (@CustCarrefour, 'Carrefour Jordan (Majid Al Futtaim)', 'purchasing@carrefour-jo.com', '+96265801000', '2025-10-01', 1);

IF NOT EXISTS (SELECT 1 FROM Customer WHERE Id = @CustSafeway)
    INSERT INTO Customer (Id, Name, Email, Phone, CreatedAt, IsActive)
    VALUES (@CustSafeway, 'Safeway Jordan Co', 'procurement@safeway.com.jo', '+96265802000', '2025-10-01', 1);

IF NOT EXISTS (SELECT 1 FROM Customer WHERE Id = @CustCityMall)
    INSERT INTO Customer (Id, Name, Email, Phone, CreatedAt, IsActive)
    VALUES (@CustCityMall, 'CityMall Electronics Hyper', 'inventory@citymallelectronics.jo', '+96265803000', '2025-10-01', 1);

IF NOT EXISTS (SELECT 1 FROM Customer WHERE Id = @CustTechMart)
    INSERT INTO Customer (Id, Name, Email, Phone, CreatedAt, IsActive)
    VALUES (@CustTechMart, 'TechMart Levant Retailers', 'tech@techmart.jo', '+96265804000', '2025-10-01', 1);

IF NOT EXISTS (SELECT 1 FROM Customer WHERE Id = @CustLocalGrocer)
    INSERT INTO Customer (Id, Name, Email, Phone, CreatedAt, IsActive)
    VALUES (@CustLocalGrocer, 'Al-Bustan Supermarket Network', 'albustan@grocery.jo', '+96265805000', '2025-10-01', 1);

-- =========================================================================================
-- 7. 65 REALISTIC PRODUCTS
-- =========================================================================================
PRINT '7. Seeding Products...';

UPDATE Product SET CategoryId = @CatMobile, BrandId = @BrandApple WHERE Sku = 'PRD-1D23805E';
UPDATE Product SET CategoryId = @CatFreshProduce, BrandId = NULL WHERE Sku = 'PRD-0ED39CAE';
UPDATE Product SET CategoryId = @CatMobile, BrandId = @BrandApple WHERE Sku = 'PRD-92BA3B2D';
UPDATE Product SET CategoryId = @CatMobile, BrandId = @BrandSamsung WHERE Sku = 'PRD-026B5B82';

DECLARE @ProductsToSeed TABLE (
    Id UNIQUEIDENTIFIER,
    Name NVARCHAR(200),
    Sku VARCHAR(50),
    CategoryId UNIQUEIDENTIFIER,
    BrandId UNIQUEIDENTIFIER,
    UomId UNIQUEIDENTIFIER
);

INSERT INTO @ProductsToSeed VALUES
('F6000001-0000-0000-0000-000000000001', 'Dole Organic Cavendish Bananas', 'PRD-BAN-DOLE', @CatFreshProduce, @BrandDole, @UomKg),
('F6000001-0000-0000-0000-000000000002', 'Chiquita Premium Yellow Bananas', 'PRD-BAN-CHIQ', @CatFreshProduce, @BrandChiquita, @UomKg),
('F6000001-0000-0000-0000-000000000003', 'Fresh Red Roma Tomatoes', 'PRD-TOM-ROMA', @CatFreshProduce, NULL, @UomKg),
('F6000001-0000-0000-0000-000000000004', 'Jordan Valley Potatoes 5kg Bag', 'PRD-POT-5KG', @CatFreshProduce, NULL, @UomBox),
('F6000001-0000-0000-0000-000000000005', 'Dole Valencia Juicing Oranges', 'PRD-ORG-DOLE', @CatFreshProduce, @BrandDole, @UomKg),
('F6000001-0000-0000-0000-000000000006', 'Green Crisp Cucumbers', 'PRD-CUC-CRISP', @CatFreshProduce, NULL, @UomKg),
('F6000001-0000-0000-0000-000000000007', 'Sweet Crunchy Carrots 1kg', 'PRD-CAR-1KG', @CatFreshProduce, NULL, @UomPack),

('F6000001-0000-0000-0000-000000000008', 'Fresh Whole Milk 1L Bottle', 'PRD-MLK-1L', @CatDairy, NULL, @UomL),
('F6000001-0000-0000-0000-000000000009', 'Farm Fresh White Eggs 30-Pack Tray', 'PRD-EGG-30PK', @CatDairy, NULL, @UomBox),
('F6000001-0000-0000-0000-000000000010', 'Nestle Full Cream Evaporated Milk 170g', 'PRD-MLK-NESTLE', @CatDairy, @BrandNestle, @UomPcs),
('F6000001-0000-0000-0000-000000000011', 'Greek Style Plain Yogurt 500g', 'PRD-YOG-500G', @CatDairy, NULL, @UomPcs),
('F6000001-0000-0000-0000-000000000012', 'Pure Creamery Unsalted Butter 250g', 'PRD-BTR-250G', @CatDairy, NULL, @UomPcs),
('F6000001-0000-0000-0000-000000000013', 'Sharp Cheddar Cheese Block 200g', 'PRD-CHS-200G', @CatDairy, NULL, @UomPcs),

('F6000001-0000-0000-0000-000000000014', 'Pepsi Cola Can 330ml (Pack of 24)', 'PRD-PEP-330ML', @CatBeverages, @BrandPepsiCo, @UomBox),
('F6000001-0000-0000-0000-000000000015', 'Diet Pepsi 330ml Can', 'PRD-PEP-DIET', @CatBeverages, @BrandPepsiCo, @UomPcs),
('F6000001-0000-0000-0000-000000000016', 'Nescafe Classic Instant Coffee 200g Jar', 'PRD-COF-NES200', @CatBeverages, @BrandNestle, @UomPcs),
('F6000001-0000-0000-0000-000000000017', 'Nestle Pure Life Mineral Water 500ml x 12', 'PRD-WTR-NESTLE', @CatBeverages, @BrandNestle, @UomPack),
('F6000001-0000-0000-0000-000000000018', 'Fresh Squeezed Orange Juice 1L', 'PRD-JUC-ORG1L', @CatBeverages, NULL, @UomL),
('F6000001-0000-0000-0000-000000000019', 'Lipton Pure Green Tea 50 Tea Bags', 'PRD-TEA-GRN50', @CatBeverages, NULL, @UomBox),

('F6000001-0000-0000-0000-000000000020', 'KitKat 4-Finger Milk Chocolate 41.5g x 24', 'PRD-KIT-24PK', @CatSnacks, @BrandNestle, @UomBox),
('F6000001-0000-0000-0000-000000000021', 'Lays Salted Potato Chips 170g', 'PRD-LAY-SALT', @CatSnacks, @BrandPepsiCo, @UomPcs),
('F6000001-0000-0000-0000-000000000022', 'Doritos Nacho Cheese Tortilla Chips 175g', 'PRD-DOR-NACHO', @CatSnacks, @BrandPepsiCo, @UomPcs),
('F6000001-0000-0000-0000-000000000023', 'Oreo Original Sandwich Cookies 120g', 'PRD-OREO-120G', @CatSnacks, NULL, @UomPcs),
('F6000001-0000-0000-0000-000000000024', 'Roasted Mixed Salted Nuts 250g Tin', 'PRD-NUT-250G', @CatSnacks, NULL, @UomPcs),
('F6000001-0000-0000-0000-000000000025', 'Swiss Dark Chocolate 70% Cocoa 100g', 'PRD-CHO-DRK100', @CatSnacks, @BrandNestle, @UomPcs),

('F6000001-0000-0000-0000-000000000026', 'Tyson Fresh Boneless Chicken Breast 1kg', 'PRD-TYS-CHK1KG', @CatMeat, @BrandTyson, @UomKg),
('F6000001-0000-0000-0000-000000000027', 'Tyson Breaded Chicken Tenders 750g', 'PRD-TYS-TND750', @CatMeat, @BrandTyson, @UomPack),
('F6000001-0000-0000-0000-000000000028', 'Fresh Angus Ribeye Beef Steak 500g', 'PRD-BEEF-RIBEYE', @CatMeat, NULL, @UomKg),
('F6000001-0000-0000-0000-000000000029', 'Lean Ground Beef 85/15 1kg Pack', 'PRD-BEEF-GRND1K', @CatMeat, NULL, @UomKg),
('F6000001-0000-0000-0000-000000000030', 'Atlantic Fresh Salmon Fillet 500g', 'PRD-FSH-SALM500', @CatMeat, NULL, @UomKg),
('F6000001-0000-0000-0000-000000000031', 'Red Sea Jumbo Tiger Shrimp 1kg', 'PRD-SHR-JUMB1KG', @CatMeat, NULL, @UomKg),

('F6000001-0000-0000-0000-000000000032', 'Sony BRAVIA 55-Inch 4K OLED Smart TV', 'PRD-SNY-TV55', @CatElectronics, @BrandSony, @UomPcs),
('F6000001-0000-0000-0000-000000000033', 'Sony WH-1000XM5 Noise Cancelling Headphones', 'PRD-SNY-XM5', @CatElectronics, @BrandSony, @UomPcs),
('F6000001-0000-0000-0000-000000000034', 'Sony PlayStation 5 Slim Digital Console', 'PRD-SNY-PS5SLM', @CatElectronics, @BrandSony, @UomPcs),
('F6000001-0000-0000-0000-000000000035', 'LG 65-Inch QNED 4K HDR Smart TV', 'PRD-LG-QNED65', @CatElectronics, @BrandLG, @UomPcs),
('F6000001-0000-0000-0000-000000000036', 'LG Soundbar 3.1ch with Wireless Subwoofer', 'PRD-LG-SND31', @CatElectronics, @BrandLG, @UomPcs),
('F6000001-0000-0000-0000-000000000037', 'Samsung 50-Inch Crystal UHD 4K TV', 'PRD-SAM-TV50', @CatElectronics, @BrandSamsung, @UomPcs),
('F6000001-0000-0000-0000-000000000038', 'Apple AirPods Pro 2 with USB-C MagSafe', 'PRD-APL-AIRPOD2', @CatElectronics, @BrandApple, @UomPcs),

('F6000001-0000-0000-0000-000000000039', 'Apple iPhone 16 Pro 256GB Desert Titanium', 'PRD-APL-IP16PRO', @CatMobile, @BrandApple, @UomPcs),
('F6000001-0000-0000-0000-000000000040', 'Apple iPhone 15 Plus 128GB Black', 'PRD-APL-IP15PLS', @CatMobile, @BrandApple, @UomPcs),
('F6000001-0000-0000-0000-000000000041', 'Apple 20W USB-C Fast Power Adapter', 'PRD-APL-20WCHG', @CatMobile, @BrandApple, @UomPcs),
('F6000001-0000-0000-0000-000000000042', 'Samsung Galaxy S24 FE 256GB Graphite', 'PRD-SAM-S24FE', @CatMobile, @BrandSamsung, @UomPcs),
('F6000001-0000-0000-0000-000000000043', 'Samsung Galaxy A55 5G 128GB Awesome Navy', 'PRD-SAM-A55', @CatMobile, @BrandSamsung, @UomPcs),
('F6000001-0000-0000-0000-000000000044', 'Samsung 45W USB-C Super Fast Charger', 'PRD-SAM-45WCHG', @CatMobile, @BrandSamsung, @UomPcs),
('F6000001-0000-0000-0000-000000000045', 'Xiaomi 14 Ultra 512GB Leica Photography', 'PRD-XIA-14ULT', @CatMobile, @BrandXiaomi, @UomPcs),
('F6000001-0000-0000-0000-000000000046', 'Xiaomi Redmi Note 13 Pro 256GB Midnight Black', 'PRD-XIA-RN13PR', @CatMobile, @BrandXiaomi, @UomPcs),

('F6000001-0000-0000-0000-000000000047', 'Dell XPS 15 9530 i9 32GB 1TB RTX4070', 'PRD-DEL-XPS15', @CatComputers, @BrandDell, @UomPcs),
('F6000001-0000-0000-0000-000000000048', 'Dell UltraSharp 27-Inch 4K USB-C Hub Monitor', 'PRD-DEL-U274K', @CatComputers, @BrandDell, @UomPcs),
('F6000001-0000-0000-0000-000000000049', 'HP Spectre x360 2-in-1 14-Inch Touch OLED', 'PRD-HP-SPEC14', @CatComputers, @BrandHP, @UomPcs),
('F6000001-0000-0000-0000-000000000050', 'HP LaserJet Pro MFP Wireless Monochrome Printer', 'PRD-HP-LJPRO', @CatComputers, @BrandHP, @UomPcs),
('F6000001-0000-0000-0000-000000000051', 'Logitech MX Master 3S Wireless Performance Mouse', 'PRD-LOG-MXM3S', @CatComputers, @BrandLogitech, @UomPcs),
('F6000001-0000-0000-0000-000000000052', 'Logitech MX Keys S Wireless Illuminated Keyboard', 'PRD-LOG-MXKEYS', @CatComputers, @BrandLogitech, @UomPcs),
('F6000001-0000-0000-0000-000000000053', 'Sony Nextorage 2TB PCIe 4.0 NVMe SSD PS5/PC', 'PRD-SNY-SSD2TB', @CatComputers, @BrandSony, @UomPcs),

('F6000001-0000-0000-0000-000000000054', 'Double A Premium A4 Copy Paper 80gsm 500 Sheets', 'PRD-OFC-PAPA4', @CatOffice, NULL, @UomBox),
('F6000001-0000-0000-0000-000000000055', 'Pilot G2 0.7mm Retractable Gel Pens Black 12pk', 'PRD-OFC-PEN12', @CatOffice, NULL, @UomBox),
('F6000001-0000-0000-0000-000000000056', 'Heavy Duty Office Desktop Stapler 50 Sheet Capacity', 'PRD-OFC-STAPL', @CatOffice, NULL, @UomPcs),
('F6000001-0000-0000-0000-000000000057', 'Ergonomic Memory Foam Mouse Pad with Wrist Rest', 'PRD-OFC-MSPAD', @CatOffice, @BrandLogitech, @UomPcs),
('F6000001-0000-0000-0000-000000000058', 'Lever Arch File Document Binder 75mm Blue', 'PRD-OFC-BINDR', @CatOffice, NULL, @UomPcs),
('F6000001-0000-0000-0000-000000000059', 'HP Original 106A Black Laser Toner Cartridge', 'PRD-HP-TNR106', @CatOffice, @BrandHP, @UomPcs),

('F6000001-0000-0000-0000-000000000060', 'Philips Premium Airfryer XXL 7.2L Connected', 'PRD-PHI-AIRXXL', @CatAppliances, @BrandPhilips, @UomPcs),
('F6000001-0000-0000-0000-000000000061', 'Philips Daily Collection 1.7L Electric Kettle', 'PRD-PHI-KET17L', @CatAppliances, @BrandPhilips, @UomPcs),
('F6000001-0000-0000-0000-000000000062', 'Philips Series 3000 Compact Food Processor 800W', 'PRD-PHI-FDP300', @CatAppliances, @BrandPhilips, @UomPcs),
('F6000001-0000-0000-0000-000000000063', 'LG NeoChef 25L Smart Inverter Microwave Oven', 'PRD-LG-MCR25L', @CatAppliances, @BrandLG, @UomPcs),
('F6000001-0000-0000-0000-000000000064', 'Samsung Bespoke Jet Complete Cordless Vacuum 210W', 'PRD-SAM-VACJET', @CatAppliances, @BrandSamsung, @UomPcs),
('F6000001-0000-0000-0000-000000000065', 'Xiaomi Smart Blender 1000W Hot and Cold OLED', 'PRD-XIA-BLNDR', @CatAppliances, @BrandXiaomi, @UomPcs);

INSERT INTO Product (Id, Name, Sku, CategoryId, BrandId, UnitOfMeasureId, CreatedAt, IsActive)
SELECT s.Id, s.Name, s.Sku, s.CategoryId, s.BrandId, s.UomId, '2025-10-01', 1
FROM @ProductsToSeed s
WHERE NOT EXISTS (SELECT 1 FROM Product p WHERE p.Sku = s.Sku OR p.Id = s.Id);

-- =========================================================================================
-- 8. SUPPLIER PRODUCT CATALOG & PREFERRED STATUS
-- =========================================================================================
PRINT '8. Seeding Supplier Product Catalog...';

DELETE FROM SupplierProduct;

-- Fresh Produce
INSERT INTO SupplierProduct (Id, SupplierId, ProductId, SupplierProductCode, LastPurchasePrice, LeadTimeDays, IsPreferred, CreatedAt, IsActive)
VALUES
(NEWID(), @SupSaif, 'F6000001-0000-0000-0000-000000000001', 'SAIF-BAN-DOLE', 1.10, 2, 1, '2025-10-01', 1),
(NEWID(), @SupWasfi, 'F6000001-0000-0000-0000-000000000001', 'WASFI-BAN-DOLE', 1.25, 4, 0, '2025-10-01', 1),
(NEWID(), @SupSaif, 'F6000001-0000-0000-0000-000000000002', 'SAIF-BAN-CHIQ', 1.15, 2, 1, '2025-10-01', 1),
(NEWID(), @SupBarakah, 'F6000001-0000-0000-0000-000000000003', 'BAR-TOM-01', 0.45, 1, 1, '2025-10-01', 1),
(NEWID(), @SupSaif, 'F6000001-0000-0000-0000-000000000003', 'SAIF-TOM-01', 0.50, 2, 0, '2025-10-01', 1),
(NEWID(), @SupBarakah, 'F6000001-0000-0000-0000-000000000004', 'BAR-POT-5KG', 2.20, 1, 1, '2025-10-01', 1),
(NEWID(), @SupSaif, 'F6000001-0000-0000-0000-000000000005', 'SAIF-ORG-DOLE', 0.85, 3, 1, '2025-10-01', 1),
(NEWID(), @SupBarakah, 'F6000001-0000-0000-0000-000000000006', 'BAR-CUC-01', 0.40, 1, 1, '2025-10-01', 1),
(NEWID(), @SupBarakah, 'F6000001-0000-0000-0000-000000000007', 'BAR-CAR-1K', 0.60, 1, 1, '2025-10-01', 1);

-- Dairy & Eggs
INSERT INTO SupplierProduct (Id, SupplierId, ProductId, SupplierProductCode, LastPurchasePrice, LeadTimeDays, IsPreferred, CreatedAt, IsActive)
VALUES
(NEWID(), @SupNaseem, 'F6000001-0000-0000-0000-000000000008', 'NAS-MLK-1L', 0.85, 1, 1, '2025-10-01', 1),
(NEWID(), @SupSaif, 'F6000001-0000-0000-0000-000000000008', 'SAIF-MLK-1L', 0.90, 2, 0, '2025-10-01', 1),
(NEWID(), @SupNaseem, 'F6000001-0000-0000-0000-000000000009', 'NAS-EGG-30', 2.80, 1, 1, '2025-10-01', 1),
(NEWID(), @SupLevant, 'F6000001-0000-0000-0000-000000000010', 'LEV-EVMLK', 0.70, 3, 1, '2025-10-01', 1),
(NEWID(), @SupNaseem, 'F6000001-0000-0000-0000-000000000011', 'NAS-YOG-500', 1.10, 1, 1, '2025-10-01', 1),
(NEWID(), @SupNaseem, 'F6000001-0000-0000-0000-000000000012', 'NAS-BTR-250', 1.75, 2, 1, '2025-10-01', 1),
(NEWID(), @SupNaseem, 'F6000001-0000-0000-0000-000000000013', 'NAS-CHS-200', 1.95, 2, 1, '2025-10-01', 1);

-- Beverages & Snacks
INSERT INTO SupplierProduct (Id, SupplierId, ProductId, SupplierProductCode, LastPurchasePrice, LeadTimeDays, IsPreferred, CreatedAt, IsActive)
VALUES
(NEWID(), @SupLevant, 'F6000001-0000-0000-0000-000000000014', 'LEV-PEP-24PK', 7.50, 3, 1, '2025-10-01', 1),
(NEWID(), @SupLevant, 'F6000001-0000-0000-0000-000000000015', 'LEV-PEP-DIET', 0.35, 3, 1, '2025-10-01', 1),
(NEWID(), @SupLevant, 'F6000001-0000-0000-0000-000000000016', 'LEV-NES-200', 4.80, 4, 1, '2025-10-01', 1),
(NEWID(), @SupLevant, 'F6000001-0000-0000-0000-000000000017', 'LEV-WTR-12PK', 1.90, 2, 1, '2025-10-01', 1),
(NEWID(), @SupSaif, 'F6000001-0000-0000-0000-000000000018', 'SAIF-JUC-ORG', 1.20, 2, 1, '2025-10-01', 1),
(NEWID(), @SupLevant, 'F6000001-0000-0000-0000-000000000019', 'LEV-TEA-50PK', 1.60, 4, 1, '2025-10-01', 1),
(NEWID(), @SupLevant, 'F6000001-0000-0000-0000-000000000020', 'LEV-KIT-24PK', 6.20, 3, 1, '2025-10-01', 1),
(NEWID(), @SupLevant, 'F6000001-0000-0000-0000-000000000021', 'LEV-LAY-SALT', 0.85, 3, 1, '2025-10-01', 1),
(NEWID(), @SupLevant, 'F6000001-0000-0000-0000-000000000022', 'LEV-DOR-NACHO', 0.90, 3, 1, '2025-10-01', 1),
(NEWID(), @SupLevant, 'F6000001-0000-0000-0000-000000000023', 'LEV-OREO-120', 0.50, 4, 1, '2025-10-01', 1),
(NEWID(), @SupWasfi, 'F6000001-0000-0000-0000-000000000024', 'WAS-NUT-250', 2.80, 5, 1, '2025-10-01', 1),
(NEWID(), @SupLevant, 'F6000001-0000-0000-0000-000000000025', 'LEV-CHO-DRK', 1.40, 3, 1, '2025-10-01', 1);

-- Meat & Seafood
INSERT INTO SupplierProduct (Id, SupplierId, ProductId, SupplierProductCode, LastPurchasePrice, LeadTimeDays, IsPreferred, CreatedAt, IsActive)
VALUES
(NEWID(), @SupPrimeMeat, 'F6000001-0000-0000-0000-000000000026', 'PRM-TYS-CHK', 3.90, 2, 1, '2025-10-01', 1),
(NEWID(), @SupNaseem, 'F6000001-0000-0000-0000-000000000026', 'NAS-TYS-CHK', 4.10, 2, 0, '2025-10-01', 1),
(NEWID(), @SupPrimeMeat, 'F6000001-0000-0000-0000-000000000027', 'PRM-TYS-TND', 4.20, 2, 1, '2025-10-01', 1),
(NEWID(), @SupPrimeMeat, 'F6000001-0000-0000-0000-000000000028', 'PRM-BEEF-RIB', 11.50, 2, 1, '2025-10-01', 1),
(NEWID(), @SupPrimeMeat, 'F6000001-0000-0000-0000-000000000029', 'PRM-BEEF-GRN', 6.20, 2, 1, '2025-10-01', 1),
(NEWID(), @SupRedSea, 'F6000001-0000-0000-0000-000000000030', 'RED-SALM-500', 8.50, 3, 1, '2025-10-01', 1),
(NEWID(), @SupRedSea, 'F6000001-0000-0000-0000-000000000031', 'RED-SHR-JUMB', 12.00, 3, 1, '2025-10-01', 1);

-- Consumer Electronics
INSERT INTO SupplierProduct (Id, SupplierId, ProductId, SupplierProductCode, LastPurchasePrice, LeadTimeDays, IsPreferred, CreatedAt, IsActive)
VALUES
(NEWID(), @SupOrient, 'F6000001-0000-0000-0000-000000000032', 'ORT-SNY-TV55', 850.00, 7, 1, '2025-10-01', 1),
(NEWID(), @SupOrient, 'F6000001-0000-0000-0000-000000000033', 'ORT-SNY-XM5', 260.00, 5, 1, '2025-10-01', 1),
(NEWID(), @SupOrient, 'F6000001-0000-0000-0000-000000000034', 'ORT-SNY-PS5', 380.00, 6, 1, '2025-10-01', 1),
(NEWID(), @SupHomeTech, 'F6000001-0000-0000-0000-000000000035', 'HOM-LG-TV65', 590.00, 6, 1, '2025-10-01', 1),
(NEWID(), @SupHomeTech, 'F6000001-0000-0000-0000-000000000036', 'HOM-LG-SND31', 140.00, 5, 1, '2025-10-01', 1),
(NEWID(), @SupQusai, 'F6000001-0000-0000-0000-000000000037', 'QUS-SAM-TV50', 320.00, 4, 1, '2025-10-01', 1),
(NEWID(), @SupCupertino, 'F6000001-0000-0000-0000-000000000038', 'CUP-APL-AIRP2', 175.00, 3, 1, '2025-10-01', 1);

-- Mobile & Accessories
INSERT INTO SupplierProduct (Id, SupplierId, ProductId, SupplierProductCode, LastPurchasePrice, LeadTimeDays, IsPreferred, CreatedAt, IsActive)
VALUES
(NEWID(), @SupCupertino, 'F6000001-0000-0000-0000-000000000039', 'CUP-IP16PRO-256', 890.00, 3, 1, '2025-10-01', 1),
(NEWID(), @SupCupertino, 'F6000001-0000-0000-0000-000000000040', 'CUP-IP15PLS-128', 680.00, 3, 1, '2025-10-01', 1),
(NEWID(), @SupCupertino, 'F6000001-0000-0000-0000-000000000041', 'CUP-20WCHG', 14.50, 2, 1, '2025-10-01', 1),
(NEWID(), @SupQusai, 'F6000001-0000-0000-0000-000000000042', 'QUS-SAM-S24FE', 460.00, 3, 1, '2025-10-01', 1),
(NEWID(), @SupQusai, 'F6000001-0000-0000-0000-000000000043', 'QUS-SAM-A55', 255.00, 3, 1, '2025-10-01', 1),
(NEWID(), @SupQusai, 'F6000001-0000-0000-0000-000000000044', 'QUS-SAM-45W', 18.00, 2, 1, '2025-10-01', 1),
(NEWID(), @SupQusai, 'F6000001-0000-0000-0000-000000000045', 'QUS-XIA-14ULT', 720.00, 4, 1, '2025-10-01', 1),
(NEWID(), @SupQusai, 'F6000001-0000-0000-0000-000000000046', 'QUS-XIA-RN13P', 185.00, 3, 1, '2025-10-01', 1);

-- Computer Hardware
INSERT INTO SupplierProduct (Id, SupplierId, ProductId, SupplierProductCode, LastPurchasePrice, LeadTimeDays, IsPreferred, CreatedAt, IsActive)
VALUES
(NEWID(), @SupOrient, 'F6000001-0000-0000-0000-000000000047', 'ORT-DEL-XPS15', 1650.00, 8, 1, '2025-10-01', 1),
(NEWID(), @SupDelta, 'F6000001-0000-0000-0000-000000000047', 'DLT-DEL-XPS15', 1690.00, 10, 0, '2025-10-01', 1),
(NEWID(), @SupOrient, 'F6000001-0000-0000-0000-000000000048', 'ORT-DEL-U274K', 420.00, 6, 1, '2025-10-01', 1),
(NEWID(), @SupDelta, 'F6000001-0000-0000-0000-000000000049', 'DLT-HP-SPEC14', 1150.00, 7, 1, '2025-10-01', 1),
(NEWID(), @SupDelta, 'F6000001-0000-0000-0000-000000000050', 'DLT-HP-LJPRO', 210.00, 5, 1, '2025-10-01', 1),
(NEWID(), @SupOrient, 'F6000001-0000-0000-0000-000000000051', 'ORT-LOG-MXM3S', 72.00, 4, 1, '2025-10-01', 1),
(NEWID(), @SupDelta, 'F6000001-0000-0000-0000-000000000051', 'DLT-LOG-MXM3S', 75.00, 5, 0, '2025-10-01', 1),
(NEWID(), @SupOrient, 'F6000001-0000-0000-0000-000000000052', 'ORT-LOG-MXKEY', 85.00, 4, 1, '2025-10-01', 1),
(NEWID(), @SupOrient, 'F6000001-0000-0000-0000-000000000053', 'ORT-SNY-SSD2TB', 125.00, 5, 1, '2025-10-01', 1);

-- Office Supplies
INSERT INTO SupplierProduct (Id, SupplierId, ProductId, SupplierProductCode, LastPurchasePrice, LeadTimeDays, IsPreferred, CreatedAt, IsActive)
VALUES
(NEWID(), @SupDelta, 'F6000001-0000-0000-0000-000000000054', 'DLT-OFC-PAPA4', 3.20, 2, 1, '2025-10-01', 1),
(NEWID(), @SupDelta, 'F6000001-0000-0000-0000-000000000055', 'DLT-OFC-PEN12', 4.50, 2, 1, '2025-10-01', 1),
(NEWID(), @SupDelta, 'F6000001-0000-0000-0000-000000000056', 'DLT-OFC-STAPL', 5.80, 2, 1, '2025-10-01', 1),
(NEWID(), @SupDelta, 'F6000001-0000-0000-0000-000000000057', 'DLT-OFC-MSPAD', 8.50, 3, 1, '2025-10-01', 1),
(NEWID(), @SupDelta, 'F6000001-0000-0000-0000-000000000058', 'DLT-OFC-BINDR', 1.40, 2, 1, '2025-10-01', 1),
(NEWID(), @SupDelta, 'F6000001-0000-0000-0000-000000000059', 'DLT-HP-TNR106', 42.00, 3, 1, '2025-10-01', 1);

-- Small Home Appliances
INSERT INTO SupplierProduct (Id, SupplierId, ProductId, SupplierProductCode, LastPurchasePrice, LeadTimeDays, IsPreferred, CreatedAt, IsActive)
VALUES
(NEWID(), @SupHomeTech, 'F6000001-0000-0000-0000-000000000060', 'HOM-PHI-AIRXXL', 155.00, 5, 1, '2025-10-01', 1),
(NEWID(), @SupHomeTech, 'F6000001-0000-0000-0000-000000000061', 'HOM-PHI-KET17', 22.00, 4, 1, '2025-10-01', 1),
(NEWID(), @SupHomeTech, 'F6000001-0000-0000-0000-000000000062', 'HOM-PHI-FDP30', 65.00, 4, 1, '2025-10-01', 1),
(NEWID(), @SupHomeTech, 'F6000001-0000-0000-0000-000000000063', 'HOM-LG-MCR25', 95.00, 5, 1, '2025-10-01', 1),
(NEWID(), @SupHomeTech, 'F6000001-0000-0000-0000-000000000064', 'HOM-SAM-VACJET', 340.00, 6, 1, '2025-10-01', 1),
(NEWID(), @SupWasfi, 'F6000001-0000-0000-0000-000000000065', 'WAS-XIA-BLND', 55.00, 6, 1, '2025-10-01', 1);

INSERT INTO SupplierProduct (Id, SupplierId, ProductId, SupplierProductCode, LastPurchasePrice, LeadTimeDays, IsPreferred, CreatedAt, IsActive)
SELECT NEWID(), @SupCupertino, '2200439B-77C5-4D2B-832C-4F66F75BC5F8', 'CUP-IP15-128', 580.00, 3, 1, '2025-10-01', 1;

INSERT INTO SupplierProduct (Id, SupplierId, ProductId, SupplierProductCode, LastPurchasePrice, LeadTimeDays, IsPreferred, CreatedAt, IsActive)
SELECT NEWID(), @SupSaif, '44AC24D1-75CF-4ABC-B3A5-518065D681A2', 'SAIF-APL-FRT', 0.95, 2, 1, '2025-10-01', 1;

INSERT INTO SupplierProduct (Id, SupplierId, ProductId, SupplierProductCode, LastPurchasePrice, LeadTimeDays, IsPreferred, CreatedAt, IsActive)
SELECT NEWID(), @SupCupertino, '28F0DB73-69C2-42E8-A72F-824175DEBD76', 'CUP-IP16-256', 740.00, 3, 1, '2025-10-01', 1;

INSERT INTO SupplierProduct (Id, SupplierId, ProductId, SupplierProductCode, LastPurchasePrice, LeadTimeDays, IsPreferred, CreatedAt, IsActive)
SELECT NEWID(), @SupQusai, 'AE8AABA2-F308-45C4-8E0C-DD2A160569AF', 'QUS-S25U-256', 820.00, 4, 1, '2025-10-01', 1;

-- =========================================================================================
-- 9. SUPPLIER INITIAL REPLENISHMENTS (Supplier Stock Ledger)
-- =========================================================================================
PRINT '9. Seeding Supplier Stock Movements (Replenishments)...';

DELETE FROM SupplierStockMovement;

INSERT INTO SupplierStockMovement (Id, SupplierId, ProductId, MovementType, Quantity, UnitCost, ReferenceType, ReferenceId, Notes, CreatedByUserId, CreatedAt)
SELECT
    NEWID(),
    sp.SupplierId,
    sp.ProductId,
    'ExternalReplenishment',
    CASE
        WHEN p.CategoryId = @CatFreshProduce THEN 1500.000
        WHEN p.CategoryId = @CatDairy THEN 1200.000
        WHEN p.CategoryId = @CatBeverages THEN 2000.000
        WHEN p.CategoryId = @CatSnacks THEN 1800.000
        WHEN p.CategoryId = @CatMeat THEN 800.000
        WHEN p.CategoryId = @CatMobile THEN 250.000
        WHEN p.CategoryId = @CatElectronics THEN 100.000
        WHEN p.CategoryId = @CatComputers THEN 80.000
        WHEN p.CategoryId = @CatOffice THEN 500.000
        WHEN p.CategoryId = @CatAppliances THEN 120.000
        ELSE 300.000
    END,
    sp.LastPurchasePrice,
    'FactoryBatch',
    'BATCH-2025-INIT-' + SUBSTRING(CONVERT(VARCHAR(40), sp.Id), 1, 8),
    'Initial commercial factory replenishment',
    @AdminUserId,
    '2025-10-15 08:00:00'
FROM SupplierProduct sp
JOIN Product p ON sp.ProductId = p.Id;

-- =========================================================================================
-- 10. 12 MONTHS OF HISTORICAL STOCK MOVEMENTS & TRANSACTIONS
-- =========================================================================================
PRINT '10. Seeding 12 Months of Historical Operations (POs, SOs, Stock Movements, Transfers)...';

DECLARE @AdjReasonDamage UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM AdjustmentReason WHERE Name LIKE '%Damage%');
DECLARE @AdjReasonExpire UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM AdjustmentReason WHERE Name LIKE '%Expir%');
DECLARE @AdjReasonFound  UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM AdjustmentReason WHERE Name LIKE '%Found%');
DECLARE @AdjReasonLost   UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM AdjustmentReason WHERE Name LIKE '%Lost%');

DELETE FROM StockMovement WHERE ReferenceType IN ('PO-HIST', 'SO-HIST', 'TRN-HIST', 'ADJ-HIST');

DECLARE @MonthList TABLE (MonthIndex INT, MonthDate DATETIME2);
DECLARE @m INT = 0;
WHILE @m < 12
BEGIN
    INSERT INTO @MonthList VALUES (@m, DATEADD(MONTH, @m, '2025-11-01 09:00:00'));
    SET @m = @m + 1;
END;

DECLARE @curMonthIndex INT;
DECLARE @curMonthDate DATETIME2;

DECLARE month_cursor CURSOR FOR SELECT MonthIndex, MonthDate FROM @MonthList ORDER BY MonthIndex;
OPEN month_cursor;
FETCH NEXT FROM month_cursor INTO @curMonthIndex, @curMonthDate;

WHILE @@FETCH_STATUS = 0
BEGIN
    PRINT '  Generating month ' + CAST(@curMonthIndex + 1 AS VARCHAR(5)) + ' operations (' + FORMAT(@curMonthDate, 'yyyy-MM') + ')...';

    -- -------------------------------------------------------------
    -- A. PURCHASE ORDERS & INBOUND RECEIPTS
    -- -------------------------------------------------------------
    -- 1. Cold Chain to Zarqa Cold Storage
    DECLARE @poId1 UNIQUEIDENTIFIER = NEWID();
    DECLARE @poNum1 VARCHAR(30) = 'PO-COLD-' + FORMAT(@curMonthDate, 'yyyyMM') + '-01';
    
    INSERT INTO PurchaseOrder (Id, PurchaseOrderNumber, SupplierId, WarehouseId, OrderDate, ExpectedDeliveryDate, Status, Notes, CreatedByUserId, CreatedAt)
    VALUES (@poId1, @poNum1, @SupSaif, @WhZarqaCold, @curMonthDate, DATEADD(DAY, 2, @curMonthDate), 'Received', 'Scheduled cold produce replenishment', @AdminUserId, @curMonthDate);

    INSERT INTO PurchaseOrderLine (Id, PurchaseOrderId, LineNumber, ProductId, QuantityOrdered, QuantityReceived, UnitCost, CreatedAt)
    VALUES
    (NEWID(), @poId1, 1, 'F6000001-0000-0000-0000-000000000001', 350.000, 350.000, 1.10, @curMonthDate),
    (NEWID(), @poId1, 2, 'F6000001-0000-0000-0000-000000000002', 300.000, 300.000, 1.15, @curMonthDate);

    INSERT INTO StockMovement (Id, ProductId, WarehouseId, Quantity, MovementType, ReferenceType, ReferenceId, CreatedByUserId, CreatedAt)
    VALUES
    (NEWID(), 'F6000001-0000-0000-0000-000000000001', @WhZarqaCold, 350.000, 'Purchase', 'PO-HIST', @poNum1 + '#L1', @AdminUserId, DATEADD(DAY, 2, @curMonthDate)),
    (NEWID(), 'F6000001-0000-0000-0000-000000000002', @WhZarqaCold, 300.000, 'Purchase', 'PO-HIST', @poNum1 + '#L2', @AdminUserId, DATEADD(DAY, 2, @curMonthDate));

    INSERT INTO SupplierStockMovement (Id, SupplierId, ProductId, MovementType, Quantity, UnitCost, ReferenceType, ReferenceId, Notes, CreatedByUserId, CreatedAt)
    VALUES
    (NEWID(), @SupSaif, 'F6000001-0000-0000-0000-000000000001', 'OrderFulfilledToWarehouse', 350.000, 1.10, 'PurchaseOrderReceipt', @poNum1 + '#L1', 'Fulfilled to Zarqa Cold Storage', @AdminUserId, DATEADD(DAY, 2, @curMonthDate)),
    (NEWID(), @SupSaif, 'F6000001-0000-0000-0000-000000000002', 'OrderFulfilledToWarehouse', 300.000, 1.15, 'PurchaseOrderReceipt', @poNum1 + '#L2', 'Fulfilled to Zarqa Cold Storage', @AdminUserId, DATEADD(DAY, 2, @curMonthDate));

    -- 2. Tech Purchases to Amman Central DC
    DECLARE @poId2 UNIQUEIDENTIFIER = NEWID();
    DECLARE @poNum2 VARCHAR(30) = 'PO-TECH-' + FORMAT(@curMonthDate, 'yyyyMM') + '-01';
    
    INSERT INTO PurchaseOrder (Id, PurchaseOrderNumber, SupplierId, WarehouseId, OrderDate, ExpectedDeliveryDate, Status, Notes, CreatedByUserId, CreatedAt)
    VALUES (@poId2, @poNum2, @SupCupertino, @WhAmmanMain, DATEADD(DAY, 3, @curMonthDate), DATEADD(DAY, 6, @curMonthDate), 'Received', 'Monthly Apple replenishment', @AdminUserId, DATEADD(DAY, 3, @curMonthDate));

    INSERT INTO PurchaseOrderLine (Id, PurchaseOrderId, LineNumber, ProductId, QuantityOrdered, QuantityReceived, UnitCost, CreatedAt)
    VALUES
    (NEWID(), @poId2, 1, 'F6000001-0000-0000-0000-000000000039', 25.000, 25.000, 890.00, DATEADD(DAY, 3, @curMonthDate)),
    (NEWID(), @poId2, 2, 'F6000001-0000-0000-0000-000000000038', 40.000, 40.000, 175.00, DATEADD(DAY, 3, @curMonthDate));

    INSERT INTO StockMovement (Id, ProductId, WarehouseId, Quantity, MovementType, ReferenceType, ReferenceId, CreatedByUserId, CreatedAt)
    VALUES
    (NEWID(), 'F6000001-0000-0000-0000-000000000039', @WhAmmanMain, 25.000, 'Purchase', 'PO-HIST', @poNum2 + '#L1', @AdminUserId, DATEADD(DAY, 6, @curMonthDate)),
    (NEWID(), 'F6000001-0000-0000-0000-000000000038', @WhAmmanMain, 40.000, 'Purchase', 'PO-HIST', @poNum2 + '#L2', @AdminUserId, DATEADD(DAY, 6, @curMonthDate));

    INSERT INTO SupplierStockMovement (Id, SupplierId, ProductId, MovementType, Quantity, UnitCost, ReferenceType, ReferenceId, Notes, CreatedByUserId, CreatedAt)
    VALUES
    (NEWID(), @SupCupertino, 'F6000001-0000-0000-0000-000000000039', 'OrderFulfilledToWarehouse', 25.000, 890.00, 'PurchaseOrderReceipt', @poNum2 + '#L1', 'Fulfilled to Amman Central', @AdminUserId, DATEADD(DAY, 6, @curMonthDate)),
    (NEWID(), @SupCupertino, 'F6000001-0000-0000-0000-000000000038', 'OrderFulfilledToWarehouse', 40.000, 175.00, 'PurchaseOrderReceipt', @poNum2 + '#L2', 'Fulfilled to Amman Central', @AdminUserId, DATEADD(DAY, 6, @curMonthDate));

    -- 3. Samsung Tech Purchases to Irbid Tech Hub
    DECLARE @poId3 UNIQUEIDENTIFIER = NEWID();
    DECLARE @poNum3 VARCHAR(30) = 'PO-SAM-' + FORMAT(@curMonthDate, 'yyyyMM') + '-01';
    
    INSERT INTO PurchaseOrder (Id, PurchaseOrderNumber, SupplierId, WarehouseId, OrderDate, ExpectedDeliveryDate, Status, Notes, CreatedByUserId, CreatedAt)
    VALUES (@poId3, @poNum3, @SupQusai, @WhIrbidTech, DATEADD(DAY, 5, @curMonthDate), DATEADD(DAY, 8, @curMonthDate), 'Received', 'Samsung batch from Qusai', @AdminUserId, DATEADD(DAY, 5, @curMonthDate));

    INSERT INTO PurchaseOrderLine (Id, PurchaseOrderId, LineNumber, ProductId, QuantityOrdered, QuantityReceived, UnitCost, CreatedAt)
    VALUES
    (NEWID(), @poId3, 1, 'F6000001-0000-0000-0000-000000000042', 30.000, 30.000, 460.00, DATEADD(DAY, 5, @curMonthDate)),
    (NEWID(), @poId3, 2, 'F6000001-0000-0000-0000-000000000043', 50.000, 50.000, 255.00, DATEADD(DAY, 5, @curMonthDate));

    INSERT INTO StockMovement (Id, ProductId, WarehouseId, Quantity, MovementType, ReferenceType, ReferenceId, CreatedByUserId, CreatedAt)
    VALUES
    (NEWID(), 'F6000001-0000-0000-0000-000000000042', @WhIrbidTech, 30.000, 'Purchase', 'PO-HIST', @poNum3 + '#L1', @AdminUserId, DATEADD(DAY, 8, @curMonthDate)),
    (NEWID(), 'F6000001-0000-0000-0000-000000000043', @WhIrbidTech, 50.000, 'Purchase', 'PO-HIST', @poNum3 + '#L2', @AdminUserId, DATEADD(DAY, 8, @curMonthDate));

    INSERT INTO SupplierStockMovement (Id, SupplierId, ProductId, MovementType, Quantity, UnitCost, ReferenceType, ReferenceId, Notes, CreatedByUserId, CreatedAt)
    VALUES
    (NEWID(), @SupQusai, 'F6000001-0000-0000-0000-000000000042', 'OrderFulfilledToWarehouse', 30.000, 460.00, 'PurchaseOrderReceipt', @poNum3 + '#L1', 'Fulfilled to Irbid Tech', @AdminUserId, DATEADD(DAY, 8, @curMonthDate)),
    (NEWID(), @SupQusai, 'F6000001-0000-0000-0000-000000000043', 'OrderFulfilledToWarehouse', 50.000, 255.00, 'PurchaseOrderReceipt', @poNum3 + '#L2', 'Fulfilled to Irbid Tech', @AdminUserId, DATEADD(DAY, 8, @curMonthDate));

    -- 4. Beverage & Snacks to Aqaba Grocery Depot
    DECLARE @poId4 UNIQUEIDENTIFIER = NEWID();
    DECLARE @poNum4 VARCHAR(30) = 'PO-AQB-' + FORMAT(@curMonthDate, 'yyyyMM') + '-01';
    
    INSERT INTO PurchaseOrder (Id, PurchaseOrderNumber, SupplierId, WarehouseId, OrderDate, ExpectedDeliveryDate, Status, Notes, CreatedByUserId, CreatedAt)
    VALUES (@poId4, @poNum4, @SupLevant, @WhAqabaFood, DATEADD(DAY, 6, @curMonthDate), DATEADD(DAY, 9, @curMonthDate), 'Received', 'Port grocery supplies', @AdminUserId, DATEADD(DAY, 6, @curMonthDate));

    INSERT INTO PurchaseOrderLine (Id, PurchaseOrderId, LineNumber, ProductId, QuantityOrdered, QuantityReceived, UnitCost, CreatedAt)
    VALUES
    (NEWID(), @poId4, 1, 'F6000001-0000-0000-0000-000000000014', 150.000, 150.000, 7.50, DATEADD(DAY, 6, @curMonthDate)),
    (NEWID(), @poId4, 2, 'F6000001-0000-0000-0000-000000000021', 200.000, 200.000, 0.85, DATEADD(DAY, 6, @curMonthDate));

    INSERT INTO StockMovement (Id, ProductId, WarehouseId, Quantity, MovementType, ReferenceType, ReferenceId, CreatedByUserId, CreatedAt)
    VALUES
    (NEWID(), 'F6000001-0000-0000-0000-000000000014', @WhAqabaFood, 150.000, 'Purchase', 'PO-HIST', @poNum4 + '#L1', @AdminUserId, DATEADD(DAY, 9, @curMonthDate)),
    (NEWID(), 'F6000001-0000-0000-0000-000000000021', @WhAqabaFood, 200.000, 'Purchase', 'PO-HIST', @poNum4 + '#L2', @AdminUserId, DATEADD(DAY, 9, @curMonthDate));

    INSERT INTO SupplierStockMovement (Id, SupplierId, ProductId, MovementType, Quantity, UnitCost, ReferenceType, ReferenceId, Notes, CreatedByUserId, CreatedAt)
    VALUES
    (NEWID(), @SupLevant, 'F6000001-0000-0000-0000-000000000014', 'OrderFulfilledToWarehouse', 150.000, 7.50, 'PurchaseOrderReceipt', @poNum4 + '#L1', 'Fulfilled to Aqaba Depot', @AdminUserId, DATEADD(DAY, 9, @curMonthDate)),
    (NEWID(), @SupLevant, 'F6000001-0000-0000-0000-000000000021', 'OrderFulfilledToWarehouse', 200.000, 0.85, 'PurchaseOrderReceipt', @poNum4 + '#L2', 'Fulfilled to Aqaba Depot', @AdminUserId, DATEADD(DAY, 9, @curMonthDate));

    -- 5. Appliances to Salt Equipment Hub
    DECLARE @poId5 UNIQUEIDENTIFIER = NEWID();
    DECLARE @poNum5 VARCHAR(30) = 'PO-SLT-' + FORMAT(@curMonthDate, 'yyyyMM') + '-01';
    
    INSERT INTO PurchaseOrder (Id, PurchaseOrderNumber, SupplierId, WarehouseId, OrderDate, ExpectedDeliveryDate, Status, Notes, CreatedByUserId, CreatedAt)
    VALUES (@poId5, @poNum5, @SupHomeTech, @WhSalt, DATEADD(DAY, 7, @curMonthDate), DATEADD(DAY, 11, @curMonthDate), 'Received', 'Salt equipment replenishment', @AdminUserId, DATEADD(DAY, 7, @curMonthDate));

    INSERT INTO PurchaseOrderLine (Id, PurchaseOrderId, LineNumber, ProductId, QuantityOrdered, QuantityReceived, UnitCost, CreatedAt)
    VALUES
    (NEWID(), @poId5, 1, 'F6000001-0000-0000-0000-000000000060', 15.000, 15.000, 155.00, DATEADD(DAY, 7, @curMonthDate)),
    (NEWID(), @poId5, 2, 'F6000001-0000-0000-0000-000000000061', 25.000, 25.000, 22.00, DATEADD(DAY, 7, @curMonthDate));

    INSERT INTO StockMovement (Id, ProductId, WarehouseId, Quantity, MovementType, ReferenceType, ReferenceId, CreatedByUserId, CreatedAt)
    VALUES
    (NEWID(), 'F6000001-0000-0000-0000-000000000060', @WhSalt, 15.000, 'Purchase', 'PO-HIST', @poNum5 + '#L1', @AdminUserId, DATEADD(DAY, 11, @curMonthDate)),
    (NEWID(), 'F6000001-0000-0000-0000-000000000061', @WhSalt, 25.000, 'Purchase', 'PO-HIST', @poNum5 + '#L2', @AdminUserId, DATEADD(DAY, 11, @curMonthDate));

    INSERT INTO SupplierStockMovement (Id, SupplierId, ProductId, MovementType, Quantity, UnitCost, ReferenceType, ReferenceId, Notes, CreatedByUserId, CreatedAt)
    VALUES
    (NEWID(), @SupHomeTech, 'F6000001-0000-0000-0000-000000000060', 'OrderFulfilledToWarehouse', 15.000, 155.00, 'PurchaseOrderReceipt', @poNum5 + '#L1', 'Fulfilled to Salt Hub', @AdminUserId, DATEADD(DAY, 11, @curMonthDate)),
    (NEWID(), @SupHomeTech, 'F6000001-0000-0000-0000-000000000061', 'OrderFulfilledToWarehouse', 25.000, 22.00, 'PurchaseOrderReceipt', @poNum5 + '#L2', 'Fulfilled to Salt Hub', @AdminUserId, DATEADD(DAY, 11, @curMonthDate));

    -- -------------------------------------------------------------
    -- B. SALES ORDERS & OUTBOUND FULFILLMENTS
    -- -------------------------------------------------------------
    -- 1. Carrefour Order from Zarqa Cold Storage
    DECLARE @soId1 UNIQUEIDENTIFIER = NEWID();
    DECLARE @soNum1 VARCHAR(30) = 'SO-CRF-' + FORMAT(@curMonthDate, 'yyyyMM') + '-01';
    
    INSERT INTO SalesOrder (Id, SalesOrderNumber, CustomerId, WarehouseId, OrderDate, Status, Notes, CreatedByUserId, CreatedAt)
    VALUES (@soId1, @soNum1, @CustCarrefour, @WhZarqaCold, DATEADD(DAY, 12, @curMonthDate), 'Fulfilled', 'Weekly fresh grocery delivery', @AdminUserId, DATEADD(DAY, 12, @curMonthDate));

    INSERT INTO SalesOrderLine (Id, SalesOrderId, LineNumber, ProductId, QuantityOrdered, QuantityFulfilled, UnitPrice, CreatedAt)
    VALUES
    (NEWID(), @soId1, 1, 'F6000001-0000-0000-0000-000000000001', 280.000, 280.000, 1.45, DATEADD(DAY, 12, @curMonthDate)),
    (NEWID(), @soId1, 2, 'F6000001-0000-0000-0000-000000000002', 240.000, 240.000, 1.50, DATEADD(DAY, 12, @curMonthDate));

    INSERT INTO StockMovement (Id, ProductId, WarehouseId, Quantity, MovementType, ReferenceType, ReferenceId, CreatedByUserId, CreatedAt)
    VALUES
    (NEWID(), 'F6000001-0000-0000-0000-000000000001', @WhZarqaCold, 280.000, 'Sale', 'SO-HIST', @soNum1 + '#L1', @AdminUserId, DATEADD(DAY, 13, @curMonthDate)),
    (NEWID(), 'F6000001-0000-0000-0000-000000000002', @WhZarqaCold, 240.000, 'Sale', 'SO-HIST', @soNum1 + '#L2', @AdminUserId, DATEADD(DAY, 13, @curMonthDate));

    -- 2. CityMall Order from Amman Central DC
    DECLARE @soId2 UNIQUEIDENTIFIER = NEWID();
    DECLARE @soNum2 VARCHAR(30) = 'SO-CTY-' + FORMAT(@curMonthDate, 'yyyyMM') + '-01';
    
    INSERT INTO SalesOrder (Id, SalesOrderNumber, CustomerId, WarehouseId, OrderDate, Status, Notes, CreatedByUserId, CreatedAt)
    VALUES (@soId2, @soNum2, @CustCityMall, @WhAmmanMain, DATEADD(DAY, 14, @curMonthDate), 'Fulfilled', 'CityMall store replenishment', @AdminUserId, DATEADD(DAY, 14, @curMonthDate));

    INSERT INTO SalesOrderLine (Id, SalesOrderId, LineNumber, ProductId, QuantityOrdered, QuantityFulfilled, UnitPrice, CreatedAt)
    VALUES
    (NEWID(), @soId2, 1, 'F6000001-0000-0000-0000-000000000039', 20.000, 20.000, 1099.00, DATEADD(DAY, 14, @curMonthDate)),
    (NEWID(), @soId2, 2, 'F6000001-0000-0000-0000-000000000038', 35.000, 35.000, 229.00, DATEADD(DAY, 14, @curMonthDate));

    INSERT INTO StockMovement (Id, ProductId, WarehouseId, Quantity, MovementType, ReferenceType, ReferenceId, CreatedByUserId, CreatedAt)
    VALUES
    (NEWID(), 'F6000001-0000-0000-0000-000000000039', @WhAmmanMain, 20.000, 'Sale', 'SO-HIST', @soNum2 + '#L1', @AdminUserId, DATEADD(DAY, 15, @curMonthDate)),
    (NEWID(), 'F6000001-0000-0000-0000-000000000038', @WhAmmanMain, 35.000, 'Sale', 'SO-HIST', @soNum2 + '#L2', @AdminUserId, DATEADD(DAY, 15, @curMonthDate));

    -- 3. TechMart Order from Irbid Tech Hub
    DECLARE @soId3 UNIQUEIDENTIFIER = NEWID();
    DECLARE @soNum3 VARCHAR(30) = 'SO-TCH-' + FORMAT(@curMonthDate, 'yyyyMM') + '-01';
    
    INSERT INTO SalesOrder (Id, SalesOrderNumber, CustomerId, WarehouseId, OrderDate, Status, Notes, CreatedByUserId, CreatedAt)
    VALUES (@soId3, @soNum3, @CustTechMart, @WhIrbidTech, DATEADD(DAY, 16, @curMonthDate), 'Fulfilled', 'Samsung stock dispatch', @AdminUserId, DATEADD(DAY, 16, @curMonthDate));

    INSERT INTO SalesOrderLine (Id, SalesOrderId, LineNumber, ProductId, QuantityOrdered, QuantityFulfilled, UnitPrice, CreatedAt)
    VALUES
    (NEWID(), @soId3, 1, 'F6000001-0000-0000-0000-000000000042', 25.000, 25.000, 579.00, DATEADD(DAY, 16, @curMonthDate)),
    (NEWID(), @soId3, 2, 'F6000001-0000-0000-0000-000000000043', 40.000, 40.000, 329.00, DATEADD(DAY, 16, @curMonthDate));

    INSERT INTO StockMovement (Id, ProductId, WarehouseId, Quantity, MovementType, ReferenceType, ReferenceId, CreatedByUserId, CreatedAt)
    VALUES
    (NEWID(), 'F6000001-0000-0000-0000-000000000042', @WhIrbidTech, 25.000, 'Sale', 'SO-HIST', @soNum3 + '#L1', @AdminUserId, DATEADD(DAY, 17, @curMonthDate)),
    (NEWID(), 'F6000001-0000-0000-0000-000000000043', @WhIrbidTech, 40.000, 'Sale', 'SO-HIST', @soNum3 + '#L2', @AdminUserId, DATEADD(DAY, 17, @curMonthDate));

    -- -------------------------------------------------------------
    -- C. INTER-WAREHOUSE TRANSFERS (Transactional Mutual Links)
    -- -------------------------------------------------------------
    DECLARE @trnOutId UNIQUEIDENTIFIER = NEWID();
    DECLARE @trnInId  UNIQUEIDENTIFIER = NEWID();
    DECLARE @trnCode  VARCHAR(30) = 'TRN-HUB-' + FORMAT(@curMonthDate, 'yyyyMM');

    INSERT INTO StockMovement (Id, ProductId, WarehouseId, Quantity, MovementType, ReferenceType, ReferenceId, LinkedMovementId, CreatedByUserId, CreatedAt)
    VALUES
    (@trnOutId, 'F6000001-0000-0000-0000-000000000039', @WhAmmanMain, 2.000, 'TransferOut', 'TRN-HIST', @trnCode + '#OUT', @trnInId, @AdminUserId, DATEADD(DAY, 20, @curMonthDate)),
    (@trnInId,  'F6000001-0000-0000-0000-000000000039', @WhIrbidTech,  2.000, 'TransferIn',  'TRN-HIST', @trnCode + '#IN',  @trnOutId, @AdminUserId, DATEADD(DAY, 20, @curMonthDate));

    -- -------------------------------------------------------------
    -- D. REALISTIC STOCK ADJUSTMENTS
    -- -------------------------------------------------------------
    IF (@curMonthIndex % 2 = 0)
    BEGIN
        INSERT INTO StockMovement (Id, ProductId, WarehouseId, Quantity, MovementType, AdjustmentReasonId, ReferenceType, ReferenceId, CreatedByUserId, CreatedAt)
        VALUES
        (NEWID(), 'F6000001-0000-0000-0000-000000000001', @WhZarqaCold, 5.000, 'AdjustmentOut', @AdjReasonExpire, 'ADJ-HIST', 'Inspection spoiled fruit disposal ' + FORMAT(@curMonthDate, 'yyyyMM'), @AdminUserId, DATEADD(DAY, 24, @curMonthDate));
    END;

    IF (@curMonthIndex % 3 = 0)
    BEGIN
        INSERT INTO StockMovement (Id, ProductId, WarehouseId, Quantity, MovementType, AdjustmentReasonId, ReferenceType, ReferenceId, CreatedByUserId, CreatedAt)
        VALUES
        (NEWID(), 'F6000001-0000-0000-0000-000000000014', @WhAqabaFood, 2.000, 'AdjustmentOut', @AdjReasonDamage, 'ADJ-HIST', 'Crushed beverage can ' + FORMAT(@curMonthDate, 'yyyyMM'), @AdminUserId, DATEADD(DAY, 25, @curMonthDate));
    END;

    FETCH NEXT FROM month_cursor INTO @curMonthIndex, @curMonthDate;
END;

CLOSE month_cursor;
DEALLOCATE month_cursor;

-- =========================================================================================
-- 11. SEED DORMANT & LOW-STOCK ITEMS FOR ANALYTICS TESTING
-- =========================================================================================
PRINT '11. Seeding Dormant & Low-Stock Test Items...';

INSERT INTO StockMovement (Id, ProductId, WarehouseId, Quantity, MovementType, ReferenceType, ReferenceId, CreatedByUserId, CreatedAt)
VALUES
(NEWID(), 'F6000001-0000-0000-0000-000000000053', @WhIrbidTech, 18.000, 'Purchase', 'PO-HIST', 'PO-DORMANT-01', @AdminUserId, '2026-02-10 10:00:00');

INSERT INTO StockMovement (Id, ProductId, WarehouseId, Quantity, MovementType, ReferenceType, ReferenceId, CreatedByUserId, CreatedAt)
VALUES
(NEWID(), 'F6000001-0000-0000-0000-000000000054', @WhSalt, 120.000, 'Purchase', 'PO-HIST', 'PO-SALT-PAPER', @AdminUserId, '2026-03-05 11:00:00');

COMMIT TRANSACTION;

PRINT 'Supply Chain Seed Data successfully executed and committed!';
