using InventoryManagementSystem.DataAccess.Enums;

namespace InventoryManagementSystem.Business.DTOs.WarehouseAssignment
{
    public class WarehouseAssignmentResponse
    {
        public Guid Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public Guid WarehouseId { get; set; }
        public WarehouseAssignmentRole Role { get; set; }   
        public DateTime AssignedAt { get; set; }
        public bool IsActive { get; set; }
    }
}