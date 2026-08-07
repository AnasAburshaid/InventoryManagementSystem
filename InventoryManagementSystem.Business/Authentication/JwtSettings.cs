using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace InventoryManagementSystem.Business.Authentication
{
    public class JwtSettings
    {
        public const string SectionName = "Jwt";

        public string Issuer { get; set; } = null!;

        public string Audience { get; set; } = null!;

        public string SigningKey { get; set; } = null!;

        public int ExpirationMinutes { get; set; }
    }
}
