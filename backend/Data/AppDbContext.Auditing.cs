using System.Security.Claims;
using System.Text.Json;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace backend.Data;

public partial class AppDbContext
{
    private IHttpContextAccessor? HttpContextAccessor { get; }

    // Explicit allowlist: never capture passwords, codes, tokens, contact details,
    // addresses, review text, upload URLs or arbitrary request bodies.
    private static readonly Dictionary<Type, string[]> AuditedFields = new()
    {
        [typeof(Product)] = ["ProductName", "BasePrice", "SalePrice", "FkCategoryId", "IsActive"],
        [typeof(ProductVariant)] = ["Sku", "StockQuantity", "ReorderLevel", "PriceOverride", "IsActive", "FkSizeId", "FkColorId"],
        [typeof(Category)] = ["CategoryName", "Slug", "IsActive"],
        [typeof(Order)] = ["OrderNumber", "Status", "Subtotal", "DiscountAmount", "ShippingFee", "TotalAmount"],
        [typeof(Shipment)] = ["Courier", "Status", "ShippedAt", "DeliveredAt"],
        [typeof(PromoCode)] = ["Promocode", "DiscountType", "DiscountValue", "MaxUses", "IsActive"],
        [typeof(Review)] = ["FkProductId", "FkOrderItemId", "Rating"],
        [typeof(ProductImage)] = ["FkProductId"],
        [typeof(Product3DModel)] = ["FkProductId"],
    };

    private static string Area(Type type) => type == typeof(Order) ? "Orders"
        : type == typeof(Shipment) ? "Shipping" : type == typeof(ProductVariant) ? "Inventory"
        : type == typeof(Category) ? "Categories" : type == typeof(PromoCode) ? "Promotions"
        : type == typeof(Review) ? "Reviews" : "Catalog";

    public override async Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        ChangeTracker.DetectChanges();
        var http = HttpContextAccessor?.HttpContext;
        var actorId = http?.User.FindFirstValue(ClaimTypes.NameIdentifier);
        var actor = actorId == null ? null : await Users.FindAsync([actorId], cancellationToken);
        foreach (var entry in ChangeTracker.Entries<AuditLog>().Where(e => e.State == EntityState.Added))
        {
            entry.Entity.RequestId ??= http?.TraceIdentifier;
            entry.Entity.IpAddress ??= http?.Connection.RemoteIpAddress?.ToString();
        }
        var pending = ChangeTracker.Entries().Where(e => AuditedFields.ContainsKey(e.Metadata.ClrType)
            && e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .Select(e => new { Entry = e, State = e.State, Changes = Fields(e) })
            .Where(e => e.State != EntityState.Modified || e.Changes.Count > 0).ToList();
        if (pending.Count == 0) return await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);

        // Domain changes and their audit records commit or roll back together.
        await using var transaction = Database.CurrentTransaction == null
            ? await Database.BeginTransactionAsync(cancellationToken) : null;
        var count = await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
        foreach (var change in pending)
        {
            var entry = change.Entry;
            var type = entry.Metadata.ClrType;
            var id = string.Join(",", entry.Properties.Where(p => p.Metadata.IsPrimaryKey()).Select(p => p.CurrentValue));
            var label = new[] { "ProductName", "OrderNumber", "CategoryName", "Sku", "Promocode" }
                .Where(name => entry.Metadata.FindProperty(name) != null)
                .Select(name => entry.Property(name).CurrentValue?.ToString()).FirstOrDefault() ?? id;
            var verb = change.State == EntityState.Added ? "Created" : change.State == EntityState.Deleted ? "Deleted" : "Updated";
            var detail = change.State == EntityState.Modified
                ? string.Join("; ", change.Changes.Select(c => $"{c.Key}: {c.Value.Before ?? "(empty)"} → {c.Value.After ?? "(empty)"}"))
                : string.Join("; ", change.Changes.Select(c => $"{c.Key}: {(change.State == EntityState.Deleted ? c.Value.Before : c.Value.After) ?? "(empty)"}"));
            AuditLogs.Add(new AuditLog
            {
                FkUserId = actorId, ActorName = actor == null ? (http == null ? "System" : "Guest") : $"{actor.FirstName} {actor.LastName}".Trim(),
                ActorRole = actor?.Role.ToString() ?? (http == null ? "System" : "Guest"), ActionType = Area(type),
                Action = $"{type.Name.ToUpperInvariant()}_{verb.ToUpperInvariant()}",
                Description = $"{verb} {type.Name} “{label}”. {detail}", EntityType = type.Name, EntityId = id,
                Changes = JsonSerializer.Serialize(change.Changes), RequestId = http?.TraceIdentifier,
                IpAddress = http?.Connection.RemoteIpAddress?.ToString(), CreatedAt = DateTime.UtcNow
            });
        }
        await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
        if (transaction != null) await transaction.CommitAsync(cancellationToken);
        return count;
    }

    private sealed record FieldChange(object? Before, object? After);

    private static Dictionary<string, FieldChange> Fields(EntityEntry entry) => AuditedFields[entry.Metadata.ClrType]
        .Where(name => entry.Metadata.FindProperty(name) != null)
        .Select(name => entry.Property(name))
        .Where(p => entry.State != EntityState.Modified || p.IsModified && !Equals(p.OriginalValue, p.CurrentValue))
        .ToDictionary(p => p.Metadata.Name, p => new FieldChange(
            entry.State == EntityState.Added ? null : Display(p.OriginalValue),
            entry.State == EntityState.Deleted ? null : Display(p.CurrentValue)));

    private static object? Display(object? value) => value is Enum ? value.ToString() : value;
}
