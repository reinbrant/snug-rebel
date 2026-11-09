using System.Security.Cryptography;
using System.Text;
using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public class EmailVerificationService(AppDbContext context, VerificationEmailSender sender, EmailOtpService otp)
{
    public bool IsConfigured => sender.IsConfigured;

    // Caller owns the transaction: a failed delivery rolls back the replacement
    // so the last successfully delivered link remains usable.
    public async Task Send(User user, CancellationToken cancellationToken)
    {
        var token = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        var hash = Hash(token);
        var now = DateTime.UtcNow;
        var expires = now.AddHours(1);
        var cooldown = now.AddSeconds(-60);
        var changed = await context.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO email_verifications (_fk_user_id, email, token_hash, expires_at, sent_at)
            VALUES ({user.PkUserId}, {user.UserEmail}, {hash}, {expires}, {now})
            ON CONFLICT (_fk_user_id) DO UPDATE SET
                email = EXCLUDED.email, token_hash = EXCLUDED.token_hash,
                expires_at = EXCLUDED.expires_at, sent_at = EXCLUDED.sent_at
            WHERE email_verifications.sent_at <= {cooldown}
            """, cancellationToken);
        if (changed > 0)
        {
            var code = await otp.Issue(user, EmailOtpService.Verification, cancellationToken);
            if (code == null) throw new EmailDeliveryException();
            await sender.Send(user.UserEmail, token, code, cancellationToken);
        }
    }

    public async Task<bool> Verify(string token, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var hash = Hash(token);
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
        // Lock the challenge so verification, replay, and resends serialize.
        var challenge = await context.EmailVerifications.FromSqlInterpolated($"""
            SELECT * FROM email_verifications WHERE token_hash = {hash} AND expires_at > {now} FOR UPDATE
            """).SingleOrDefaultAsync(cancellationToken);
        if (challenge == null) return false;
        var changed = await context.Users
            .Where(u => u.PkUserId == challenge.UserId && u.UserEmail == challenge.Email && u.IsActive
                && u.EmailVerificationRequired && u.EmailVerifiedAt == null)
            .ExecuteUpdateAsync(update => update.SetProperty(u => u.EmailVerifiedAt, now)
                .SetProperty(u => u.EmailVerificationRequired, false).SetProperty(u => u.UpdatedAt, now), cancellationToken);
        if (changed == 0) return false;
        context.EmailVerifications.Remove(challenge);
        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return true;
    }

    private static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
