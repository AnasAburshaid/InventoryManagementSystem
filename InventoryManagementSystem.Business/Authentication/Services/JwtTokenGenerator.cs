using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using InventoryManagementSystem.DataAccess.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace InventoryManagementSystem.Business.Authentication.Services;

public class JwtTokenGenerator
{
    private readonly JwtSettings _jwtSettings;

    public JwtTokenGenerator(IOptions<JwtSettings> jwtOptions)
    {
        _jwtSettings = jwtOptions.Value;
    }

    public JwtTokenResult GenerateToken(ApplicationUser user,IReadOnlyCollection<string> roles)
    {
        DateTime expiresAt = DateTime.UtcNow.AddMinutes(
            _jwtSettings.ExpirationMinutes);

        List<Claim> claims =
        [
            new Claim(
                JwtRegisteredClaimNames.Sub,
                user.Id),

            new Claim(
                ClaimTypes.NameIdentifier,
                user.Id),

            new Claim(
                JwtRegisteredClaimNames.Email,
                user.Email!),

            new Claim(
                ClaimTypes.Name,
                user.FullName),

            new Claim(
                JwtRegisteredClaimNames.Jti,
                Guid.NewGuid().ToString())
        ];

        foreach (string role in roles)
        {
            claims.Add(new Claim(
                ClaimTypes.Role,
                role));
        }

        SymmetricSecurityKey securityKey = new(
            Encoding.UTF8.GetBytes(_jwtSettings.SigningKey));

        SigningCredentials signingCredentials = new(
            securityKey,
            SecurityAlgorithms.HmacSha256);

        JwtSecurityToken token = new(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expiresAt,
            signingCredentials: signingCredentials);

        string accessToken =
            new JwtSecurityTokenHandler().WriteToken(token);

        return new JwtTokenResult
        {
            AccessToken = accessToken,  
            ExpiresAt = expiresAt
        };
    }
}