using System;
using System.Collections.Generic;
using InventoryManagementSystem.DataAccess.Entities;
using Microsoft.EntityFrameworkCore;
using InventoryManagementSystem.DataAccess.Enums;

namespace InventoryManagementSystem.DataAccess.Persistence;

public partial class InventoryDbContext : DbContext
{
    public InventoryDbContext(DbContextOptions<InventoryDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<AdjustmentReason> AdjustmentReasons { get; set; }
    public virtual DbSet<Brand> Brands { get; set; }
    public virtual DbSet<Category> Categories { get; set; }
    public virtual DbSet<Customer> Customers { get; set; }
    public virtual DbSet<Product> Products { get; set; }
    public virtual DbSet<Supplier> Suppliers { get; set; }
    public virtual DbSet<SupplierProduct> SupplierProducts { get; set; }
    public virtual DbSet<Warehouse> Warehouses { get; set; }
    public virtual DbSet<WarehouseAssignment> WarehouseAssignments { get; set; }
    public virtual DbSet<StockMovement> StockMovements { get; set; }
    public virtual DbSet<UnitOfMeasure> UnitOfMeasures { get; set; }
    public virtual DbSet<PurchaseOrder> PurchaseOrders { get; set; }
    public virtual DbSet<PurchaseOrderLine> PurchaseOrderLines { get; set; }
    public virtual DbSet<SalesOrder> SalesOrders { get; set; }
    public virtual DbSet<SalesOrderLine> SalesOrderLines { get; set; }

    // Phase 1 Additions
    public virtual DbSet<SupplierCategoryCapability> SupplierCategoryCapabilities { get; set; }
    public virtual DbSet<SupplierBrandCapability> SupplierBrandCapabilities { get; set; }
    public virtual DbSet<WarehouseCategoryRestriction> WarehouseCategoryRestrictions { get; set; }
    public virtual DbSet<SupplierStockMovement> SupplierStockMovements { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AdjustmentReason>(entity =>
        {
            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });

        modelBuilder.Entity<Brand>(entity =>
        {
            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.IsActive).HasDefaultValue(true);

            entity.HasOne(d => d.Brand).WithMany(p => p.Products).HasConstraintName("FK_Product_Brand");

            entity.HasOne(d => d.Category).WithMany(p => p.Products)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Product_Category");

            entity.HasOne(d => d.UnitOfMeasure).WithMany(p => p.Products)
                .HasForeignKey(d => d.UnitOfMeasureId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_Product_UnitOfMeasure");
        });

        modelBuilder.Entity<UnitOfMeasure>(entity =>
        {
            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });

        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.CanSupplyAllCategories).HasDefaultValue(false);
            entity.Property(e => e.CanSupplyAllBrands).HasDefaultValue(false);
        });

        modelBuilder.Entity<SupplierProduct>(entity =>
        {
            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.IsPreferred).HasDefaultValue(false);

            entity.HasIndex(e => new { e.SupplierId, e.SupplierProductCode }, "UQ_SupplierProduct_Supplier_SupplierProductCode")
                .IsUnique()
                .HasFilter("([SupplierProductCode] IS NOT NULL)");

            entity.HasIndex(e => e.ProductId, "UX_SupplierProduct_SinglePreferredPerProduct")
                .IsUnique()
                .HasFilter("([IsPreferred]=(1) AND [IsActive]=(1))");

            entity.HasOne(d => d.Product).WithMany(p => p.SupplierProducts)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_SupplierProduct_Product");

            entity.HasOne(d => d.Supplier).WithMany(p => p.SupplierProducts)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_SupplierProduct_Supplier");
        });

        modelBuilder.Entity<Warehouse>(entity =>
        {
            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.CanAcceptAllCategories).HasDefaultValue(true);
        });

        modelBuilder.Entity<WarehouseAssignment>(entity =>
        {
            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");

            entity.Property(e => e.AssignedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.Role).HasDefaultValue(WarehouseAssignmentRole.Employee);

            entity.HasOne(d => d.Warehouse)
                .WithMany(p => p.WarehouseAssignments)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_WarehouseAssignment_Warehouse");
        });

        modelBuilder.Entity<StockMovement>(entity =>
        {
            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");

            // Prevent deleting products or warehouses if they have movement history
            entity.HasOne(d => d.Product)
                .WithMany()
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_StockMovement_Product");

            entity.HasOne(d => d.Warehouse)
                .WithMany()
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_StockMovement_Warehouse");

            entity.HasOne(d => d.AdjustmentReason)
                .WithMany()
                .HasForeignKey(d => d.AdjustmentReasonId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_StockMovement_AdjustmentReason");

            entity.HasOne(d => d.LinkedMovement)
                .WithMany()
                .HasForeignKey(d => d.LinkedMovementId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_StockMovement_LinkedMovement");

            entity.Property(e => e.Type)
                .HasConversion<string>()
                .HasColumnName("MovementType");
        });

        modelBuilder.Entity<PurchaseOrder>(entity =>
        {
            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Status).HasDefaultValue("Draft");

            entity.HasOne(d => d.Supplier)
                .WithMany(p => p.PurchaseOrders)
                .HasForeignKey(d => d.SupplierId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_PurchaseOrder_Supplier");

            entity.HasOne(d => d.Warehouse)
                .WithMany(p => p.PurchaseOrders)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_PurchaseOrder_Warehouse");
        });

        modelBuilder.Entity<PurchaseOrderLine>(entity =>
        {
            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.QuantityReceived).HasDefaultValue(0m);

            entity.HasOne(d => d.PurchaseOrder)
                .WithMany(p => p.PurchaseOrderLines)
                .HasForeignKey(d => d.PurchaseOrderId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_PurchaseOrderLine_PurchaseOrder");

            entity.HasOne(d => d.Product)
                .WithMany(p => p.PurchaseOrderLines)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_PurchaseOrderLine_Product");
        });

        modelBuilder.Entity<SalesOrder>(entity =>
        {
            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Status).HasDefaultValue("Draft");

            entity.HasOne(d => d.Customer)
                .WithMany(p => p.SalesOrders)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_SalesOrder_Customer");

            entity.HasOne(d => d.Warehouse)
                .WithMany(p => p.SalesOrders)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_SalesOrder_Warehouse");
        });

        modelBuilder.Entity<SalesOrderLine>(entity =>
        {
            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.QuantityFulfilled).HasDefaultValue(0m);

            entity.HasOne(d => d.SalesOrder)
                .WithMany(p => p.SalesOrderLines)
                .HasForeignKey(d => d.SalesOrderId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_SalesOrderLine_SalesOrder");

            entity.HasOne(d => d.Product)
                .WithMany(p => p.SalesOrderLines)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_SalesOrderLine_Product");
        });

        // Phase 1 Model Configurations
        modelBuilder.Entity<SupplierCategoryCapability>(entity =>
        {
            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.Supplier)
                .WithMany(p => p.CategoryCapabilities)
                .HasForeignKey(d => d.SupplierId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_SupplierCategoryCapability_Supplier");

            entity.HasOne(d => d.Category)
                .WithMany(p => p.SupplierCategoryCapabilities)
                .HasForeignKey(d => d.CategoryId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_SupplierCategoryCapability_Category");
        });

        modelBuilder.Entity<SupplierBrandCapability>(entity =>
        {
            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.Supplier)
                .WithMany(p => p.BrandCapabilities)
                .HasForeignKey(d => d.SupplierId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_SupplierBrandCapability_Supplier");

            entity.HasOne(d => d.Brand)
                .WithMany(p => p.SupplierBrandCapabilities)
                .HasForeignKey(d => d.BrandId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_SupplierBrandCapability_Brand");
        });

        modelBuilder.Entity<WarehouseCategoryRestriction>(entity =>
        {
            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.Warehouse)
                .WithMany(p => p.CategoryRestrictions)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_WarehouseCategoryRestriction_Warehouse");

            entity.HasOne(d => d.Category)
                .WithMany(p => p.WarehouseCategoryRestrictions)
                .HasForeignKey(d => d.CategoryId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_WarehouseCategoryRestriction_Category");
        });

        modelBuilder.Entity<SupplierStockMovement>(entity =>
        {
            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.Property(e => e.MovementType)
                .HasConversion<string>()
                .HasColumnName("MovementType")
                .HasMaxLength(30)
                .IsUnicode(false);

            entity.HasIndex(e => new { e.ReferenceType, e.ReferenceId }, "UX_SupplierStockMovement_Idempotency")
                .IsUnique()
                .HasFilter("([ReferenceType] IS NOT NULL AND [ReferenceId] IS NOT NULL)");

            entity.HasOne(d => d.Supplier)
                .WithMany(p => p.SupplierStockMovements)
                .HasForeignKey(d => d.SupplierId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_SupplierStockMovement_Supplier");

            entity.HasOne(d => d.Product)
                .WithMany(p => p.SupplierStockMovements)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_SupplierStockMovement_Product");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
