using System.Security.Cryptography;
using System.Text;

namespace backend.Services;

// Included only in the encrypted authentication ticket, never in API responses.
public static class PasswordSession
{
    public const string ClaimType = "password-version";
    public static string Version(string hash) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(hash)));
}
