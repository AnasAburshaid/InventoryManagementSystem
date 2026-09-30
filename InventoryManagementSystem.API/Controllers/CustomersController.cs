using InventoryManagementSystem.Business.Customers;
using InventoryManagementSystem.Business.Customers.DTOs;
using InventoryManagementSystem.Business.Customers.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace InventoryManagementSystem.API.Controllers;

[ApiController]
[Route("api/customers")]
[Authorize]
public class CustomersController : ControllerBase
{
    private readonly ICustomerService _customerService;

    public CustomersController(ICustomerService customerService)
    {
        _customerService = customerService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyCollection<CustomerResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<CustomerResponse>>> GetAll()
    {
        IReadOnlyCollection<CustomerResponse> customers =
            await _customerService.GetAllAsync();

        return Ok(customers);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(CustomerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerResponse>> GetById(Guid id)
    {
        CustomerResponse? customer =
            await _customerService.GetByIdAsync(id);

        if (customer is null)
        {
            return NotFound(new
            {
                message = "Customer was not found."
            });
        }

        return Ok(customer);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    [ProducesResponseType(typeof(CustomerResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<CustomerResponse>> Create(
      [FromBody] CreateCustomerRequest request)
    {

        CustomerOperationResult<CustomerResponse> result =
            await _customerService.CreateAsync(request);

        if (result.Status == CustomerOperationStatus.InvalidPhone)
        {
            return BadRequest(new
            {
                message = "Phone number must be exactly 10 digits and start with '07'."
            });
        }

        if (result.Status == CustomerOperationStatus.InvalidEmail)
        {
            return BadRequest(new
            {
                message = "The provided email format is invalid."
            });
        }
        if (result.Status == CustomerOperationStatus.DuplicateEmail)
        {
            return Conflict(new
            {
                message = "A customer with this email already exists."
            });
        }

        if (result.Status != CustomerOperationStatus.Success || result.Data is null)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    message = "An unexpected error occurred."
                });
        }

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.Data.Id },
            result.Data);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(CustomerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<CustomerResponse>> Update(
        Guid id,
        [FromBody] UpdateCustomerRequest request)
    {
        CustomerOperationResult<CustomerResponse> result =
            await _customerService.UpdateAsync(id, request); if (result.Status == CustomerOperationStatus.InvalidPhone)
        {
            return BadRequest(new
            {
                message = "Phone number must be exactly 10 digits and start with '07'."
            });
        }

        if (result.Status == CustomerOperationStatus.InvalidEmail)
        {
            return BadRequest(new
            {
                message = "The provided email format is invalid."
            });
        }

        if (result.Status == CustomerOperationStatus.NotFound)
        {
            return NotFound(new
            {
                message = "Customer was not found."
            });
        }

        if (result.Status == CustomerOperationStatus.DuplicateEmail)
        {
            return Conflict(new
            {
                message = "A customer with this email already exists."
            });
        }

        if (result.Status != CustomerOperationStatus.Success || result.Data is null)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    message = "An unexpected error occurred."
                });
        }

        return Ok(result.Data);
    }

    [Authorize(Roles = "Admin")]
    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(typeof(CustomerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<CustomerResponse>> ChangeStatus(
        Guid id,
        [FromBody] ChangeCustomerStatusRequest request)
    {
        CustomerOperationResult<CustomerResponse> result =
            await _customerService.ChangeStatusAsync(id, request);

        if (result.Status == CustomerOperationStatus.NotFound)
        {
            return NotFound(new
            {
                message = "Customer was not found."
            });
        }

        if (result.Status != CustomerOperationStatus.Success || result.Data is null)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    message = "An unexpected error occurred."
                });
        }

        return Ok(result.Data);
    }
}