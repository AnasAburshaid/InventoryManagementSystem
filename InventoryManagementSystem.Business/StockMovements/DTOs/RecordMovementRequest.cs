using InventoryManagementSystem.DataAccess.Enums;

namespace InventoryManagementSystem.Business.StockMovements.DTOs;

public class RecordMovementRequest
{
    public Guid ProductId { get; set; }
    public Guid WarehouseId { get; set; }
    public decimal Quantity { get; set; }
    public StockMovementType Type { get; set; }
    public Guid? AdjustmentReasonId { get; set; }
    public string? ReferenceType { get; set; }
    public string? ReferenceId { get; set; }
}