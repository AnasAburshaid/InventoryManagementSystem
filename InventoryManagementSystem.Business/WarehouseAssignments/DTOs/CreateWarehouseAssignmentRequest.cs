using InventoryManagementSystem.DataAccess.Enums;

namespace InventoryManagementSystem.Business.WarehouseAssignments.DTOs;

public class CreateWarehouseAssignmentRequest
{
    public string UserId { get; set; } = string.Empty;
    public WarehouseAssignmentRole Role { get; set; } 
    public Guid WarehouseId { get; set; }
}