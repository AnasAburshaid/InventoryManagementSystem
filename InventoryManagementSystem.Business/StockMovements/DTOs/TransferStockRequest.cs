namespace InventoryManagementSystem.Business.StockMovements.DTOs;

public class TransferStockRequest
{
    public Guid ProductId { get; set; }
    public Guid DestinationWarehouseId { get; set; }
    public decimal Quantity { get; set; }
    public string? ReferenceType { get; set; }
    public string? ReferenceId { get; set; }
}