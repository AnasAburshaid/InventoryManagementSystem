using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using InventoryManagementSystem.Business.AuditLogs.Services;
using InventoryManagementSystem.Business.StockCounting.DTOs;
using InventoryManagementSystem.Business.StockMovements;
using InventoryManagementSystem.Business.StockMovements.DTOs;
using InventoryManagementSystem.Business.StockMovements.Services;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.StockCounting.Services;

public class StockCountService : IStockCountService
{
    private readonly InventoryDbContext _context;
    private readonly IStockMovementService _stockMovementService;
    private readonly IAuditLogService _auditLogService;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public StockCountService(
        InventoryDbContext context,
        IStockMovementService stockMovementService,
        IAuditLogService auditLogService,
        IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _stockMovementService = stockMovementService;
        _auditLogService = auditLogService;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<StockCountOperationResult<StockCountSessionResponse>> CreateSessionAsync(
        CreateStockCountSessionRequest request,
        CancellationToken cancellationToken = default)
    {
        string? userId = GetCurrentUserId();
        if (string.IsNullOrWhiteSpace(userId))
        {
            return new StockCountOperationResult<StockCountSessionResponse>
            {
                Status = StockCountOperationStatus.UnauthorizedActor,
                ErrorMessage = "User is not authenticated."
            };
        }

        var warehouse = await _context.Warehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.Id == request.WarehouseId, cancellationToken);

        if (warehouse == null || !warehouse.IsActive)
        {
            return new StockCountOperationResult<StockCountSessionResponse>
            {
                Status = StockCountOperationStatus.WarehouseNotFoundOrInactive,
                ErrorMessage = "Warehouse not found or inactive."
            };
        }

        List<Product> productsToCount;
        if (request.CountType == StockCountType.SelectedProducts)
        {
            if (request.ProductIds == null || request.ProductIds.Count == 0)
            {
                return new StockCountOperationResult<StockCountSessionResponse>
                {
                    Status = StockCountOperationStatus.EmptyProductList,
                    ErrorMessage = "Product list cannot be empty for selected-product count."
                };
            }

            productsToCount = await _context.Products
                .AsNoTracking()
                .Where(p => request.ProductIds.Contains(p.Id) && p.IsActive)
                .ToListAsync(cancellationToken);
        }
        else
        {
            productsToCount = await _context.Products
                .AsNoTracking()
                .Where(p => p.IsActive)
                .ToListAsync(cancellationToken);
        }

        // Generate Session Number
        int currentCount = await _context.StockCountSessions.CountAsync(cancellationToken);
        string sessionNumber = $"CNT-{DateTime.UtcNow:yyyyMM}-{currentCount + 1:D4}";

        var session = new StockCountSession
        {
            SessionNumber = sessionNumber,
            WarehouseId = request.WarehouseId,
            Status = StockCountStatus.Draft,
            CountType = request.CountType,
            Notes = request.Notes,
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        // Snapshot current system stock per product from the immutable ledger
        foreach (var product in productsToCount)
        {
            decimal systemQuantity = await GetCurrentSystemStockAsync(request.WarehouseId, product.Id, cancellationToken);

            session.Items.Add(new StockCountItem
            {
                ProductId = product.Id,
                SystemQuantity = systemQuantity,
                CountedQuantity = null,
                DiscrepancyQuantity = null
            });
        }

        _context.StockCountSessions.Add(session);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            "CreateStockCountSession",
            "StockCountSession",
            session.Id.ToString(),
            session.WarehouseId,
            new { session.SessionNumber, session.CountType, ItemCount = session.Items.Count },
            cancellationToken);

        return await GetSessionByIdAsync(session.Id, cancellationToken);
    }

    public async Task<StockCountOperationResult<StockCountSessionResponse>> GetSessionByIdAsync(
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        var session = await _context.StockCountSessions
            .AsNoTracking()
            .Include(s => s.Warehouse)
            .Include(s => s.Items)
                .ThenInclude(i => i.Product)
                    .ThenInclude(p => p.UnitOfMeasure)
            .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);

        if (session == null)
        {
            return new StockCountOperationResult<StockCountSessionResponse>
            {
                Status = StockCountOperationStatus.SessionNotFound,
                ErrorMessage = "Stock count session not found."
            };
        }

        return new StockCountOperationResult<StockCountSessionResponse>
        {
            Status = StockCountOperationStatus.Success,
            Data = MapToResponse(session)
        };
    }

    public async Task<IReadOnlyCollection<StockCountSessionResponse>> GetWarehouseSessionsAsync(
        Guid warehouseId,
        StockCountStatus? status = null,
        CancellationToken cancellationToken = default)
    {
        IQueryable<StockCountSession> query = _context.StockCountSessions
            .AsNoTracking()
            .Include(s => s.Warehouse)
            .Include(s => s.Items)
                .ThenInclude(i => i.Product)
                    .ThenInclude(p => p.UnitOfMeasure)
            .Where(s => s.WarehouseId == warehouseId);

        if (status.HasValue)
        {
            query = query.Where(s => s.Status == status.Value);
        }

        var sessions = await query
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(cancellationToken);

        return sessions.Select(MapToResponse).ToList();
    }

    public async Task<StockCountOperationResult<StockCountSessionResponse>> RecordCountsAsync(
        Guid sessionId,
        RecordStockCountItemsRequest request,
        CancellationToken cancellationToken = default)
    {
        var session = await _context.StockCountSessions
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);

        if (session == null)
        {
            return new StockCountOperationResult<StockCountSessionResponse>
            {
                Status = StockCountOperationStatus.SessionNotFound,
                ErrorMessage = "Stock count session not found."
            };
        }

        if (session.Status != StockCountStatus.Draft && session.Status != StockCountStatus.InProgress)
        {
            return new StockCountOperationResult<StockCountSessionResponse>
            {
                Status = StockCountOperationStatus.InvalidSessionState,
                ErrorMessage = $"Counts can only be recorded when session is Draft or InProgress. Current status: {session.Status}."
            };
        }

        foreach (var itemDto in request.Items)
        {
            if (itemDto.CountedQuantity < 0)
            {
                return new StockCountOperationResult<StockCountSessionResponse>
                {
                    Status = StockCountOperationStatus.InvalidQuantity,
                    ErrorMessage = "Counted quantity cannot be negative."
                };
            }

            var item = session.Items.FirstOrDefault(i => i.ProductId == itemDto.ProductId);
            if (item != null)
            {
                item.CountedQuantity = itemDto.CountedQuantity;
                item.DiscrepancyQuantity = itemDto.CountedQuantity - item.SystemQuantity;
                if (!string.IsNullOrWhiteSpace(itemDto.Notes))
                {
                    item.Notes = itemDto.Notes;
                }
            }
        }

        session.Status = StockCountStatus.InProgress;
        await _context.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            "RecordStockCounts",
            "StockCountSession",
            session.Id.ToString(),
            session.WarehouseId,
            new { session.SessionNumber, UpdatedCount = request.Items.Count },
            cancellationToken);

        return await GetSessionByIdAsync(session.Id, cancellationToken);
    }

    public async Task<StockCountOperationResult<StockCountSessionResponse>> SubmitForReviewAsync(
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        string? userId = GetCurrentUserId();
        var session = await _context.StockCountSessions
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);

        if (session == null)
        {
            return new StockCountOperationResult<StockCountSessionResponse>
            {
                Status = StockCountOperationStatus.SessionNotFound,
                ErrorMessage = "Stock count session not found."
            };
        }

        if (session.Status != StockCountStatus.Draft && session.Status != StockCountStatus.InProgress)
        {
            return new StockCountOperationResult<StockCountSessionResponse>
            {
                Status = StockCountOperationStatus.InvalidSessionState,
                ErrorMessage = $"Session can only be submitted from Draft or InProgress status. Current status: {session.Status}."
            };
        }

        session.Status = StockCountStatus.Submitted;
        session.SubmittedByUserId = userId;
        session.SubmittedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            "SubmitStockCountForReview",
            "StockCountSession",
            session.Id.ToString(),
            session.WarehouseId,
            new { session.SessionNumber, SubmittedBy = userId },
            cancellationToken);

        return await GetSessionByIdAsync(session.Id, cancellationToken);
    }

    public async Task<StockCountOperationResult<StockCountSessionResponse>> ReviewSessionAsync(
        Guid sessionId,
        ReviewStockCountSessionRequest request,
        CancellationToken cancellationToken = default)
    {
        string? userId = GetCurrentUserId();
        var session = await _context.StockCountSessions
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);

        if (session == null)
        {
            return new StockCountOperationResult<StockCountSessionResponse>
            {
                Status = StockCountOperationStatus.SessionNotFound,
                ErrorMessage = "Stock count session not found."
            };
        }

        if (session.Status != StockCountStatus.Submitted)
        {
            return new StockCountOperationResult<StockCountSessionResponse>
            {
                Status = StockCountOperationStatus.InvalidSessionState,
                ErrorMessage = $"Only submitted sessions can be reviewed. Current status: {session.Status}."
            };
        }

        if (!request.Approve)
        {
            session.Status = StockCountStatus.Rejected;
            session.ReviewedByUserId = userId;
            session.ReviewedAt = DateTime.UtcNow;
            session.ReviewNotes = request.ReviewNotes;

            await _context.SaveChangesAsync(cancellationToken);

            await _auditLogService.LogAsync(
                "RejectStockCountSession",
                "StockCountSession",
                session.Id.ToString(),
                session.WarehouseId,
                new { session.SessionNumber, Reason = request.ReviewNotes },
                cancellationToken);

            return await GetSessionByIdAsync(session.Id, cancellationToken);
        }

        // Approval: Apply discrepancies to immutable stock ledger
        int adjustmentCount = 0;
        foreach (var item in session.Items.Where(i => i.DiscrepancyQuantity.HasValue && i.DiscrepancyQuantity.Value != 0m))
        {
            decimal diff = item.DiscrepancyQuantity!.Value;

            if (diff > 0)
            {
                // Surplus: AdjustmentIn
                var recordReq = new RecordMovementRequest
                {
                    WarehouseId = session.WarehouseId,
                    ProductId = item.ProductId,
                    Quantity = diff,
                    Type = StockMovementType.AdjustmentIn,
                    ReferenceType = "StockCount",
                    ReferenceId = session.SessionNumber,
                    AdjustmentReasonId = request.DefaultAdjustmentReasonId
                };

                var movementResult = await _stockMovementService.RecordMovementAsync(recordReq);
                if (movementResult.Status != StockMovementOperationStatus.Success)
                {
                    return new StockCountOperationResult<StockCountSessionResponse>
                    {
                        Status = StockCountOperationStatus.AdjustmentFailed,
                        ErrorMessage = $"Failed to record surplus adjustment for Product {item.ProductId}: {movementResult.Status}"
                    };
                }
                adjustmentCount++;
            }
            else if (diff < 0)
            {
                // Shortage: AdjustmentOut (under sp_getapplock concurrency protection)
                var recordReq = new RecordMovementRequest
                {
                    WarehouseId = session.WarehouseId,
                    ProductId = item.ProductId,
                    Quantity = Math.Abs(diff),
                    Type = StockMovementType.AdjustmentOut,
                    ReferenceType = "StockCount",
                    ReferenceId = session.SessionNumber,
                    AdjustmentReasonId = request.DefaultAdjustmentReasonId
                };

                var movementResult = await _stockMovementService.RecordMovementAsync(recordReq);
                if (movementResult.Status != StockMovementOperationStatus.Success)
                {
                    return new StockCountOperationResult<StockCountSessionResponse>
                    {
                        Status = StockCountOperationStatus.AdjustmentFailed,
                        ErrorMessage = $"Failed to record shortage adjustment for Product {item.ProductId}: {movementResult.Status}"
                    };
                }
                adjustmentCount++;
            }
        }

        session.Status = StockCountStatus.Approved;
        session.ReviewedByUserId = userId;
        session.ReviewedAt = DateTime.UtcNow;
        session.ReviewNotes = request.ReviewNotes;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            "ApproveStockCountSession",
            "StockCountSession",
            session.Id.ToString(),
            session.WarehouseId,
            new { session.SessionNumber, AdjustmentsCreated = adjustmentCount, Notes = request.ReviewNotes },
            cancellationToken);

        return await GetSessionByIdAsync(session.Id, cancellationToken);
    }

    public async Task<StockCountOperationResult<bool>> CancelSessionAsync(
        Guid sessionId,
        string? reason = null,
        CancellationToken cancellationToken = default)
    {
        string? userId = GetCurrentUserId();
        var session = await _context.StockCountSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);

        if (session == null)
        {
            return new StockCountOperationResult<bool>
            {
                Status = StockCountOperationStatus.SessionNotFound,
                ErrorMessage = "Stock count session not found."
            };
        }

        if (session.Status == StockCountStatus.Approved)
        {
            return new StockCountOperationResult<bool>
            {
                Status = StockCountOperationStatus.InvalidSessionState,
                ErrorMessage = "Approved session cannot be cancelled because adjustments are already committed."
            };
        }

        session.Status = StockCountStatus.Cancelled;
        session.ReviewNotes = reason ?? "Cancelled by user";

        await _context.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            "CancelStockCountSession",
            "StockCountSession",
            session.Id.ToString(),
            session.WarehouseId,
            new { session.SessionNumber, Reason = reason },
            cancellationToken);

        return new StockCountOperationResult<bool>
        {
            Status = StockCountOperationStatus.Success,
            Data = true
        };
    }

    private async Task<decimal> GetCurrentSystemStockAsync(
        Guid warehouseId,
        Guid productId,
        CancellationToken cancellationToken)
    {
        var inboundTypes = new[]
        {
            StockMovementType.Purchase,
            StockMovementType.AdjustmentIn,
            StockMovementType.TransferIn
        };

        var outboundTypes = new[]
        {
            StockMovementType.Sale,
            StockMovementType.AdjustmentOut,
            StockMovementType.TransferOut
        };

        decimal inbound = await _context.StockMovements
            .AsNoTracking()
            .Where(m => m.WarehouseId == warehouseId && m.ProductId == productId && inboundTypes.Contains(m.Type))
            .SumAsync(m => (decimal?)m.Quantity, cancellationToken) ?? 0m;

        decimal outbound = await _context.StockMovements
            .AsNoTracking()
            .Where(m => m.WarehouseId == warehouseId && m.ProductId == productId && outboundTypes.Contains(m.Type))
            .SumAsync(m => (decimal?)m.Quantity, cancellationToken) ?? 0m;

        return inbound - outbound;
    }

    private static StockCountSessionResponse MapToResponse(StockCountSession session)
    {
        var items = session.Items.Select(i => new StockCountItemResponse
        {
            Id = i.Id,
            ProductId = i.ProductId,
            ProductSku = i.Product?.Sku ?? string.Empty,
            ProductName = i.Product?.Name ?? string.Empty,
            UnitOfMeasureName = i.Product?.UnitOfMeasure?.Name,
            SystemQuantity = i.SystemQuantity,
            CountedQuantity = i.CountedQuantity,
            DiscrepancyQuantity = i.DiscrepancyQuantity,
            Notes = i.Notes
        }).ToList();

        int discrepantCount = items.Count(i => i.DiscrepancyQuantity.HasValue && i.DiscrepancyQuantity.Value != 0m);

        return new StockCountSessionResponse
        {
            Id = session.Id,
            SessionNumber = session.SessionNumber,
            WarehouseId = session.WarehouseId,
            WarehouseName = session.Warehouse?.Name ?? string.Empty,
            WarehouseCode = session.Warehouse?.Code ?? string.Empty,
            Status = session.Status,
            CountType = session.CountType,
            Notes = session.Notes,
            CreatedByUserId = session.CreatedByUserId,
            CreatedAt = session.CreatedAt,
            SubmittedByUserId = session.SubmittedByUserId,
            SubmittedAt = session.SubmittedAt,
            ReviewedByUserId = session.ReviewedByUserId,
            ReviewedAt = session.ReviewedAt,
            ReviewNotes = session.ReviewNotes,
            TotalItemsCount = items.Count,
            DiscrepantItemsCount = discrepantCount,
            Items = items
        };
    }

    private string? GetCurrentUserId()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        return user?.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? user?.FindFirst("sub")?.Value;
    }
}
