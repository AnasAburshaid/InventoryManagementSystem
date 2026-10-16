using System.Security.Claims;
using InventoryManagementSystem.Business.StockMovements.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Enums;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.StockMovements.Services;

public class StockMovementService : IStockMovementService
{
    private readonly InventoryDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public StockMovementService(InventoryDbContext context, IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<StockMovementOperationResult<StockMovementResponse>> RecordMovementAsync(RecordMovementRequest request)
    {
        // Rule 10: Extract actor from JWT
        string? userId = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return new StockMovementOperationResult<StockMovementResponse> { Status = StockMovementOperationStatus.UnauthorizedActor };
        }

        // Rule 1: Quantity > 0
        if (request.Quantity <= 0)
        {
            return new StockMovementOperationResult<StockMovementResponse> { Status = StockMovementOperationStatus.InvalidQuantity };
        }

        // Rule 7 & 8: Validate Product and Warehouse are active
        bool isProductValid = await _context.Products.AnyAsync(p => p.Id == request.ProductId && p.IsActive);
        if (!isProductValid)
            return new StockMovementOperationResult<StockMovementResponse> { Status = StockMovementOperationStatus.ProductNotFoundOrInactive };

        bool isWarehouseValid = await _context.Warehouses.AnyAsync(w => w.Id == request.WarehouseId && w.IsActive);
        if (!isWarehouseValid)
            return new StockMovementOperationResult<StockMovementResponse> { Status = StockMovementOperationStatus.WarehouseNotFoundOrInactive };

        // Rule 4: Prevent negative physical stock for outgoing movements
        if (request.Type == StockMovementType.Sale ||
            request.Type == StockMovementType.AdjustmentOut ||
            request.Type == StockMovementType.TransferOut)
        {
            decimal currentStock = await GetCurrentStockAsync(request.WarehouseId, request.ProductId);

            if (currentStock - request.Quantity < 0)
            {
                return new StockMovementOperationResult<StockMovementResponse>
                {
                    Status = StockMovementOperationStatus.InsufficientStock
                };
            }
        }

        // Rule 9: Adjustment Requires Reason or Explanatory Note
        if (request.Type == StockMovementType.AdjustmentIn || request.Type == StockMovementType.AdjustmentOut)
        {
            if (request.AdjustmentReasonId.HasValue)
            {
                bool isReasonValid = await _context.AdjustmentReasons.AnyAsync(r => r.Id == request.AdjustmentReasonId && r.IsActive);
                if (!isReasonValid)
                {
                    return new StockMovementOperationResult<StockMovementResponse> { Status = StockMovementOperationStatus.AdjustmentReasonNotFound };
                }
            }
            else
            {
                // If AdjustmentReasonId was not provided, check if an explanatory note was given
                if (string.IsNullOrWhiteSpace(request.ReferenceId))
                {
                    return new StockMovementOperationResult<StockMovementResponse> { Status = StockMovementOperationStatus.AdjustmentReasonRequired };
                }

                // Automatically link note to best matching reason or default reason
                string lowerNote = request.ReferenceId.ToLowerInvariant();
                AdjustmentReason? matchingReason = null;

                if (lowerNote.Contains("damag"))
                {
                    matchingReason = await _context.AdjustmentReasons.FirstOrDefaultAsync(r => r.IsActive && r.Name.Contains("Damage"));
                }
                else if (lowerNote.Contains("expir") || lowerNote.Contains("spoil"))
                {
                    matchingReason = await _context.AdjustmentReasons.FirstOrDefaultAsync(r => r.IsActive && r.Name.Contains("Expire"));
                }
                else if (lowerNote.Contains("lost") || lowerNote.Contains("steal") || lowerNote.Contains("stolen") || lowerNote.Contains("shrink"))
                {
                    matchingReason = await _context.AdjustmentReasons.FirstOrDefaultAsync(r => r.IsActive && r.Name.Contains("Lost"));
                }
                else if (lowerNote.Contains("found") || lowerNote.Contains("surplus"))
                {
                    matchingReason = await _context.AdjustmentReasons.FirstOrDefaultAsync(r => r.IsActive && r.Name.Contains("Found"));
                }

                if (matchingReason == null)
                {
                    matchingReason = await _context.AdjustmentReasons.FirstOrDefaultAsync(r => r.IsActive && r.Name.Contains("Other"))
                                     ?? await _context.AdjustmentReasons.FirstOrDefaultAsync(r => r.IsActive);
                }

                if (matchingReason != null)
                {
                    request.AdjustmentReasonId = matchingReason.Id;
                }
            }
        }

        // Create the Append-Only record
        var movement = new StockMovement
        {
            ProductId = request.ProductId,
            WarehouseId = request.WarehouseId,
            Quantity = request.Quantity,
            Type = request.Type,
            AdjustmentReasonId = request.AdjustmentReasonId,
            ReferenceType = request.ReferenceType ?? (request.AdjustmentReasonId.HasValue ? "Adjustment" : null),
            ReferenceId = request.ReferenceId,
            CreatedByUserId = userId
        };

        _context.StockMovements.Add(movement);
        await _context.SaveChangesAsync();

        string? adjustmentReasonName = null;
        if (movement.AdjustmentReasonId.HasValue)
        {
            adjustmentReasonName = (await _context.AdjustmentReasons.FindAsync(movement.AdjustmentReasonId.Value))?.Name;
        }

        return new StockMovementOperationResult<StockMovementResponse>
        {
            Status = StockMovementOperationStatus.Success,
            Data = new StockMovementResponse
            {
                Id = movement.Id,
                ProductId = movement.ProductId,
                WarehouseId = movement.WarehouseId,
                Quantity = movement.Quantity,
                Type = movement.Type,
                AdjustmentReasonId = movement.AdjustmentReasonId,
                AdjustmentReasonName = adjustmentReasonName,
                ReferenceType = movement.ReferenceType,
                ReferenceId = movement.ReferenceId,
                CreatedByUserId = movement.CreatedByUserId,
                CreatedAt = movement.CreatedAt
            }
        };
    }

    public async Task<IReadOnlyCollection<StockMovementResponse>> GetHistoryAsync(Guid warehouseId, Guid productId)
    {
        return await _context.StockMovements
            .AsNoTracking()
            .Where(sm => sm.WarehouseId == warehouseId && sm.ProductId == productId)
            .OrderByDescending(sm => sm.CreatedAt)
            .Select(sm => new StockMovementResponse
            {
                Id = sm.Id,
                ProductId = sm.ProductId,
                WarehouseId = sm.WarehouseId,
                Quantity = sm.Quantity,
                Type = sm.Type,
                AdjustmentReasonId = sm.AdjustmentReasonId,
                AdjustmentReasonName = sm.AdjustmentReason != null ? sm.AdjustmentReason.Name : null,
                ReferenceType = sm.ReferenceType,
                ReferenceId = sm.ReferenceId,
                CreatedByUserId = sm.CreatedByUserId,
                CreatedAt = sm.CreatedAt
            })
            .ToListAsync();
    }
    public async Task<decimal> GetCurrentStockAsync(Guid warehouseId, Guid productId)
    {
        return await _context.StockMovements
            .AsNoTracking()
            .Where(sm => sm.WarehouseId == warehouseId && sm.ProductId == productId)
            .SumAsync(sm =>
                (sm.Type == StockMovementType.Purchase ||
                 sm.Type == StockMovementType.AdjustmentIn ||
                 sm.Type == StockMovementType.TransferIn) ? sm.Quantity :

                (sm.Type == StockMovementType.Sale ||
                 sm.Type == StockMovementType.AdjustmentOut ||
                 sm.Type == StockMovementType.TransferOut) ? -sm.Quantity : 0);
    }
    public async Task<StockMovementOperationResult<List<StockMovementResponse>>> TransferStockAsync(Guid sourceWarehouseId, TransferStockRequest request)
    {
        string? userId = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
                         _httpContextAccessor.HttpContext?.User.FindFirst("sub")?.Value;

        if (string.IsNullOrWhiteSpace(userId))
            return new StockMovementOperationResult<List<StockMovementResponse>> { Status = StockMovementOperationStatus.UnauthorizedActor };

        if (request.Quantity <= 0)
            return new StockMovementOperationResult<List<StockMovementResponse>> { Status = StockMovementOperationStatus.InvalidQuantity };

        // Rule 6: Source and Destination must differ
        if (sourceWarehouseId == request.DestinationWarehouseId)
            return new StockMovementOperationResult<List<StockMovementResponse>> { Status = StockMovementOperationStatus.SameSourceAndDestination };

        bool isProductValid = await _context.Products.AnyAsync(p => p.Id == request.ProductId && p.IsActive);
        if (!isProductValid)
            return new StockMovementOperationResult<List<StockMovementResponse>> { Status = StockMovementOperationStatus.ProductNotFoundOrInactive };

        bool isDestWarehouseValid = await _context.Warehouses.AnyAsync(w => w.Id == request.DestinationWarehouseId && w.IsActive);
        if (!isDestWarehouseValid)
            return new StockMovementOperationResult<List<StockMovementResponse>> { Status = StockMovementOperationStatus.DestinationWarehouseNotFoundOrInactive };

        // Rule 4: Check if source has enough physical stock
        decimal currentStock = await GetCurrentStockAsync(sourceWarehouseId, request.ProductId);
        if (currentStock - request.Quantity < 0)
        {
            return new StockMovementOperationResult<List<StockMovementResponse>> { Status = StockMovementOperationStatus.InsufficientStock };
        }

        // FIX: Only begin a transaction if we are using a real SQL database (skips during In-Memory tests)
        bool isRelational = _context.Database.IsRelational();
        using var transaction = isRelational ? await _context.Database.BeginTransactionAsync() : null;

        try
        {
            // 1. Create the Transfer Out (Source)
            var transferOut = new StockMovement
            {
                ProductId = request.ProductId,
                WarehouseId = sourceWarehouseId,
                Quantity = request.Quantity,
                Type = StockMovementType.TransferOut,
                ReferenceType = request.ReferenceType,
                ReferenceId = request.ReferenceId,
                CreatedByUserId = userId
            };
            _context.StockMovements.Add(transferOut);
            await _context.SaveChangesAsync(); // Saves so we can generate the ID

            // 2. Create the Transfer In (Destination) and link it to the Out
            var transferIn = new StockMovement
            {
                ProductId = request.ProductId,
                WarehouseId = request.DestinationWarehouseId,
                Quantity = request.Quantity,
                Type = StockMovementType.TransferIn,
                ReferenceType = request.ReferenceType,
                ReferenceId = request.ReferenceId,
                LinkedMovementId = transferOut.Id, // Linking!
                CreatedByUserId = userId
            };
            _context.StockMovements.Add(transferIn);
            await _context.SaveChangesAsync();

            // 3. Update the Out to point to the In (Mutual connection)
            transferOut.LinkedMovementId = transferIn.Id;
            await _context.SaveChangesAsync();

            // FIX: Only commit if we actually started a transaction
            if (transaction != null)
            {
                await transaction.CommitAsync();
            }

            var responses = new List<StockMovementResponse>
            {
                new StockMovementResponse { Id = transferOut.Id, ProductId = transferOut.ProductId, WarehouseId = transferOut.WarehouseId, Quantity = transferOut.Quantity, Type = transferOut.Type, LinkedMovementId = transferOut.LinkedMovementId, CreatedAt = transferOut.CreatedAt },
                new StockMovementResponse { Id = transferIn.Id, ProductId = transferIn.ProductId, WarehouseId = transferIn.WarehouseId, Quantity = transferIn.Quantity, Type = transferIn.Type, LinkedMovementId = transferIn.LinkedMovementId, CreatedAt = transferIn.CreatedAt }
            };

            return new StockMovementOperationResult<List<StockMovementResponse>> { Status = StockMovementOperationStatus.Success, Data = responses };
        }
        catch
        {
            // FIX: Only rollback if we actually started a transaction
            if (transaction != null)
            {
                await transaction.RollbackAsync();
            }
            throw;
        }
    }
}