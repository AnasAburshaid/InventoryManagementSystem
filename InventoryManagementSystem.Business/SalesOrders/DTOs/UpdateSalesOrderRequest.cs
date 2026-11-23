using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace InventoryManagementSystem.Business.SalesOrders.DTOs;

public class UpdateSalesOrderRequest
{
    public DateTime? OrderDate { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }

    public List<CreateSalesOrderLineRequest>? Lines { get; set; }
}
