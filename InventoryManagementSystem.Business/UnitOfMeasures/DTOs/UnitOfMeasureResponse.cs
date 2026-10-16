namespace InventoryManagementSystem.Business.UnitOfMeasures.DTOs;

public class UnitOfMeasureResponse
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public string Code { get; set; } = null!;

    public string? Description { get; set; }

    public bool IsActive { get; set; }
}
