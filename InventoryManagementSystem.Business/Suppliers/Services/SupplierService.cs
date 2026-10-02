using InventoryManagementSystem.Business.Suppliers.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.Suppliers.Services;

public class SupplierService : ISupplierService
{
    private readonly InventoryDbContext _context;

    public SupplierService(InventoryDbContext context)
    {
        _context = context;
    }

    private SupplierOperationStatus ValidateSupplierData(string? phone, string? email)
    {
        if (!string.IsNullOrWhiteSpace(phone))
        {
            var phoneRegex = new System.Text.RegularExpressions.Regex(@"^07\d{8}$");
            if (!phoneRegex.IsMatch(phone.Trim()))
            {
                return SupplierOperationStatus.InvalidPhone;
            }
        }

        if (!string.IsNullOrWhiteSpace(email))
        {
            try
            {
                var addr = new System.Net.Mail.MailAddress(email.Trim());
                if (addr.Address != email.Trim())
                {
                    return SupplierOperationStatus.InvalidEmail;
                }
            }
            catch
            {
                return SupplierOperationStatus.InvalidEmail;
            }
        }

        return SupplierOperationStatus.Success;
    }

    public async Task<IReadOnlyCollection<SupplierResponse>> GetAllAsync()
    {
        return await _context.Suppliers
            .AsNoTracking()
            .OrderBy(s => s.Name)
            .Select(s => new SupplierResponse
            {
                Id = s.Id,
                Name = s.Name,
                Phone = s.Phone,
                Email = s.Email,
                CreatedAt = s.CreatedAt,
                IsActive = s.IsActive
            })
            .ToListAsync();
    }

    public async Task<SupplierResponse?> GetByIdAsync(Guid id)
    {
        return await _context.Suppliers
            .AsNoTracking()
            .Where(s => s.Id == id)
            .Select(s => new SupplierResponse
            {
                Id = s.Id,
                Name = s.Name,
                Phone = s.Phone,
                Email = s.Email,
                CreatedAt = s.CreatedAt,
                IsActive = s.IsActive
            })
            .FirstOrDefaultAsync();
    }

    public async Task<SupplierOperationResult<SupplierResponse>> CreateAsync(CreateSupplierRequest request)
    {
        var validationStatus = ValidateSupplierData(request.Phone, request.Email);
        if (validationStatus != SupplierOperationStatus.Success)
        {
            return new SupplierOperationResult<SupplierResponse> { Status = validationStatus };
        }

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            bool emailExists = await _context.Suppliers.AnyAsync(s => s.Email == request.Email.Trim());
            if (emailExists)
            {
                return new SupplierOperationResult<SupplierResponse> { Status = SupplierOperationStatus.DuplicateEmail };
            }
        }

        var supplier = new Supplier
        {
            Name = request.Name.Trim(),
            Phone = request.Phone?.Trim(),
            Email = request.Email?.Trim(),
            IsActive = true
        };

        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync();

        return new SupplierOperationResult<SupplierResponse>
        {
            Status = SupplierOperationStatus.Success,
            Data = await GetByIdAsync(supplier.Id)
        };
    }

    public async Task<SupplierOperationResult<SupplierResponse>> UpdateAsync(Guid id, UpdateSupplierRequest request)
    {
        var validationStatus = ValidateSupplierData(request.Phone, request.Email);
        if (validationStatus != SupplierOperationStatus.Success)
        {
            return new SupplierOperationResult<SupplierResponse> { Status = validationStatus };
        }

        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier is null)
        {
            return new SupplierOperationResult<SupplierResponse> { Status = SupplierOperationStatus.NotFound };
        }

        if (!string.IsNullOrWhiteSpace(request.Email) &&
            !string.Equals(supplier.Email, request.Email.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            bool emailExists = await _context.Suppliers.AnyAsync(s => s.Email == request.Email.Trim());
            if (emailExists)
            {
                return new SupplierOperationResult<SupplierResponse> { Status = SupplierOperationStatus.DuplicateEmail };
            }
        }

        supplier.Name = request.Name.Trim();
        supplier.Phone = request.Phone?.Trim();
        supplier.Email = request.Email?.Trim();

        await _context.SaveChangesAsync();

        return new SupplierOperationResult<SupplierResponse>
        {
            Status = SupplierOperationStatus.Success,
            Data = await GetByIdAsync(supplier.Id)
        };
    }

    public async Task<SupplierOperationResult<SupplierResponse>> ChangeStatusAsync(Guid id, ChangeSupplierStatusRequest request)
    {
        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier is null)
        {
            return new SupplierOperationResult<SupplierResponse> { Status = SupplierOperationStatus.NotFound };
        }

        supplier.IsActive = request.IsActive;
        await _context.SaveChangesAsync();

        return new SupplierOperationResult<SupplierResponse>
        {
            Status = SupplierOperationStatus.Success,
            Data = await GetByIdAsync(supplier.Id)
        };
    }
}