using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;

namespace InventoryManagementSystem.DataAccess.Identity
{
    public  class ApplicationUser : IdentityUser
    {
        public string FullName { get; set; } = null;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = true;  
    }
}
