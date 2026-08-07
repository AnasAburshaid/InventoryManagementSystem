using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace InventoryManagementSystem.Business.Authentication.DTOs
{
    public class LoginResponse
    {
        public string AccessToken { get; set; } = null!;

        public DateTime ExpiresAt { get; set; }

        public string UserId { get; set; } = null!;

        public string FullName { get; set; } = null!;

        public string Email { get; set; } = null!;

        public IReadOnlyCollection<string> Roles { get; set; } = Array.Empty<string>();
    }
}
