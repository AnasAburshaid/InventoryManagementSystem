using InventoryManagementSystem.Business.Customers.DTOs;
using InventoryManagementSystem.DataAccess.Entities;
using InventoryManagementSystem.DataAccess.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagementSystem.Business.Customers.Services;

public class CustomerService : ICustomerService
{
    private readonly InventoryDbContext _context;

    public CustomerService(InventoryDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyCollection<CustomerResponse>> GetAllAsync()
    {
        return await _context.Customers
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CustomerResponse
            {
                Id = c.Id,
                Name = c.Name,
                Phone = c.Phone,
                Email = c.Email,
                CreatedAt = c.CreatedAt,
                IsActive = c.IsActive
            })
            .ToListAsync();
    }

    public async Task<CustomerResponse?> GetByIdAsync(Guid id)
    {
        return await _context.Customers
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new CustomerResponse
            {
                Id = c.Id,
                Name = c.Name,
                Phone = c.Phone,
                Email = c.Email,
                CreatedAt = c.CreatedAt,
                IsActive = c.IsActive
            })
            .FirstOrDefaultAsync();
    }

    public async Task<CustomerOperationResult<CustomerResponse>> CreateAsync(CreateCustomerRequest request)
    {
        var validationStatus = ValidateCustomerData(request.Phone, request.Email);
        if (validationStatus != CustomerOperationStatus.Success)
        {
            return new CustomerOperationResult<CustomerResponse> { Status = validationStatus };
        }

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            bool emailExists = await _context.Customers
                .AnyAsync(c => c.Email == request.Email.Trim());

            if (emailExists)
            {
                return new CustomerOperationResult<CustomerResponse> { Status = CustomerOperationStatus.DuplicateEmail };
            }
        }

        var customer = new Customer
        {
            Name = request.Name.Trim(),
            Phone = request.Phone?.Trim(),
            Email = request.Email?.Trim(),
            IsActive = true
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        return new CustomerOperationResult<CustomerResponse>
        {
            Status = CustomerOperationStatus.Success,
            Data = await GetByIdAsync(customer.Id)
        };
    }

    public async Task<CustomerOperationResult<CustomerResponse>> UpdateAsync(Guid id, UpdateCustomerRequest request)
    {
        var validationStatus = ValidateCustomerData(request.Phone, request.Email);
        if (validationStatus != CustomerOperationStatus.Success)
        {
            return new CustomerOperationResult<CustomerResponse> { Status = validationStatus };
        }

        var customer = await _context.Customers.FindAsync(id);
        if (customer is null)
        {
            return new CustomerOperationResult<CustomerResponse> { Status = CustomerOperationStatus.NotFound };
        }

        if (!string.IsNullOrWhiteSpace(request.Email) &&
            !string.Equals(customer.Email, request.Email.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            bool emailExists = await _context.Customers.AnyAsync(c => c.Email == request.Email.Trim());
            if (emailExists)
            {
                return new CustomerOperationResult<CustomerResponse> { Status = CustomerOperationStatus.DuplicateEmail };
            }
        }

        customer.Name = request.Name.Trim();
        customer.Phone = request.Phone?.Trim();
        customer.Email = request.Email?.Trim();

        await _context.SaveChangesAsync();

        return new CustomerOperationResult<CustomerResponse>
        {
            Status = CustomerOperationStatus.Success,
            Data = await GetByIdAsync(customer.Id)
        };
    }

    public async Task<CustomerOperationResult<CustomerResponse>> ChangeStatusAsync(Guid id, ChangeCustomerStatusRequest request)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer is null)
        {
            return new CustomerOperationResult<CustomerResponse> { Status = CustomerOperationStatus.NotFound };
        }

        customer.IsActive = request.IsActive;
        await _context.SaveChangesAsync();

        return new CustomerOperationResult<CustomerResponse>
        {
            Status = CustomerOperationStatus.Success,
            Data = await GetByIdAsync(customer.Id)
        };
    }
    private CustomerOperationStatus ValidateCustomerData(string? phone, string? email)
    {
        if (!string.IsNullOrWhiteSpace(phone))
        {
            // Ensures exactly 10 digits starting with 07
            var phoneRegex = new System.Text.RegularExpressions.Regex(@"^07\d{8}$");
            if (!phoneRegex.IsMatch(phone.Trim()))
            {
                return CustomerOperationStatus.InvalidPhone;
            }
        }

        if (!string.IsNullOrWhiteSpace(email))
        {
            // Basic format validation using built-in .NET MailAddress
            try
            {
                var addr = new System.Net.Mail.MailAddress(email.Trim());
                if (addr.Address != email.Trim())
                {
                    return CustomerOperationStatus.InvalidEmail;
                }
            }
            catch
            {
                return CustomerOperationStatus.InvalidEmail;
            }
        }

        return CustomerOperationStatus.Success;
    }
}