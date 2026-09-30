namespace InventoryManagementSystem.DataAccess.Enums;

/// <summary>
/// Defines the specific authorization level a user has inside a single warehouse.
/// 0 = Employee (Basic access)
/// 1 = Supervisor (Elevated access)
/// 2 = Manager (Full access)
/// </summary>
public enum WarehouseAssignmentRole
{
    Employee = 0,
    Supervisor = 1,
    Manager = 2
}