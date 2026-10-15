using InventoryManagementSystem.DataAccess.Enums;

namespace InventoryManagementSystem.Business.StockMovements.DTOs;

public class StockMovementResponse
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Guid WarehouseId { get; set; }
    public decimal Quantity { get; set; }
    public StockMovementType Type { get; set; }
    public Guid? AdjustmentReasonId { get; set; }
    public string? ReferenceType { get; set; }
    public string? ReferenceId { get; set; }

    public Guid? LinkedMovementId { get; set; }

    public string CreatedByUserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}