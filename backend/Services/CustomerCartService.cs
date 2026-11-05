using backend.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public class CustomerCartService(AppDbContext context)
{
    // Runs inside the authentication transaction. Clearing the guest token makes
    // the transferred bag accessible only through the customer's server session.
    public async Task MergeGuestCart(string userId, string? sessionToken)
    {
        if (string.IsNullOrWhiteSpace(sessionToken)) return;
        var guest = await context.Carts.Include(c => c.CartItems)
            .FirstOrDefaultAsync(c => c.SessionToken == sessionToken && c.FkUserId == null);
        if (guest == null) return;
        var customer = await context.Carts.Include(c => c.CartItems)
            .FirstOrDefaultAsync(c => c.FkUserId == userId);
        if (customer == null)
        {
            guest.FkUserId = userId;
            guest.SessionToken = null;
            guest.UpdatedAt = DateTime.UtcNow;
            return;
        }
        foreach (var item in guest.CartItems.ToList())
        {
            var existing = customer.CartItems.FirstOrDefault(i => i.FkProductVariantId == item.FkProductVariantId);
            if (existing == null) item.FkCart = customer;
            else
            {
                existing.Quantity = (int)Math.Min(int.MaxValue, (long)existing.Quantity + item.Quantity);
                context.CartItems.Remove(item);
            }
        }
        customer.UpdatedAt = DateTime.UtcNow;
        context.Carts.Remove(guest);
    }
}
