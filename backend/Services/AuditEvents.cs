using backend.Models;

namespace backend.Services;

public static class AuditEvents
{
    public static AuditLog Authentication(User user, string action, string description) => new()
    {
        FkUser = user, FkUserId = user.PkUserId, Action = action, ActionType = "Authentication",
        Description = description, ActorName = $"{user.FirstName} {user.LastName}".Trim(),
        ActorRole = user.Role.ToString(), EntityType = "User", EntityId = user.PkUserId,
        CreatedAt = DateTime.UtcNow
    };
}
