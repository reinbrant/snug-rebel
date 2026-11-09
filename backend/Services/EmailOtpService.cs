using System.Globalization;
using System.Security.Cryptography;
using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public class EmailOtpService(AppDbContext context)
{
    public const string Verification = "verification";
    public const string SignIn = "sign-in";
    public const string PasswordReset = "password-reset";

    // All operations run inside the caller's transaction, including email delivery.
    public async Task<string?> Issue(User user, string purpose, CancellationToken cancellationToken)
    {
        var code = RandomNumberGenerator.GetInt32(1_000_000).ToString("D6", CultureInfo.InvariantCulture);
        // A salted slow hash protects low-entropy codes if the database is exposed.
        var hash = BCrypt.Net.BCrypt.HashPassword(code);
        var email = user.UserEmail.Trim().ToLowerInvariant();
        var now = DateTime.UtcNow;
        var expires = now.AddMinutes(10);
        var cooldown = now.AddSeconds(-60);
        var changed = await context.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO email_otps (_fk_user_id, purpose, email, code_hash, expires_at, sent_at, attempts)
            VALUES ({user.PkUserId}, {purpose}, {email}, {hash}, {expires}, {now}, 0)
            ON CONFLICT (_fk_user_id, purpose) DO UPDATE SET
                email = EXCLUDED.email, code_hash = EXCLUDED.code_hash,
                expires_at = EXCLUDED.expires_at, sent_at = EXCLUDED.sent_at, attempts = 0
            WHERE email_otps.sent_at <= {cooldown}
            """, cancellationToken);
        return changed > 0 ? code : null;
    }

    // Caller must commit failed attempts too. Row locks enforce the attempt limit
    // and single use across concurrent requests and backend instances.
    public async Task<User?> Consume(string email, string code, string purpose, CancellationToken cancellationToken)
    {
        // Lock the account before its challenges in every consume flow. Password
        // reset can invalidate sign-in codes without inverting the lock order.
        var user = await context.Users.FromSqlInterpolated($"""
            SELECT * FROM users WHERE lower(user_email) = {email} FOR UPDATE
            """).SingleOrDefaultAsync(cancellationToken);
        if (user == null || !user.IsActive || user.Role != UserRole.Customer) return null;
        var challenge = await context.EmailOtps.FromSqlInterpolated($"""
            SELECT * FROM email_otps WHERE email = {email} AND purpose = {purpose} FOR UPDATE
            """).SingleOrDefaultAsync(cancellationToken);
        if (challenge == null || challenge.ExpiresAt <= DateTime.UtcNow || challenge.Attempts >= 5) return null;
        challenge.Attempts++;
        if (!BCrypt.Net.BCrypt.Verify(code, challenge.CodeHash))
        {
            await context.SaveChangesAsync(cancellationToken);
            return null;
        }
        if (user.PkUserId != challenge.UserId || user.UserEmail.ToLowerInvariant() != email
            || (purpose == Verification && (!user.EmailVerificationRequired || user.EmailVerifiedAt != null)))
        {
            await context.SaveChangesAsync(cancellationToken);
            return null;
        }
        if (purpose != PasswordReset)
        {
            user.EmailVerifiedAt ??= DateTime.UtcNow;
            user.EmailVerificationRequired = false;
        }
        user.UpdatedAt = DateTime.UtcNow;
        // Keep the consumed row until the next send so the resend cooldown survives consumption.
        challenge.Attempts = 5;
        await context.SaveChangesAsync(cancellationToken);
        return user;
    }
}
