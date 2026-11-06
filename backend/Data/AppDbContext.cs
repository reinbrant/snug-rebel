using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data;

public partial class AppDbContext : DbContext
{
    public AppDbContext()
    {
    }

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Address> Addresses { get; set; }

    public virtual DbSet<AuditLog> AuditLogs { get; set; }

    public virtual DbSet<Cart> Carts { get; set; }

    public virtual DbSet<CartItem> CartItems { get; set; }

    public virtual DbSet<Category> Categories { get; set; }

    public virtual DbSet<Color> Colors { get; set; }

    public virtual DbSet<DashboardMetric> DashboardMetrics { get; set; }

    public virtual DbSet<DashboardNotification> DashboardNotifications { get; set; }

    public virtual DbSet<Order> Orders { get; set; }

    public virtual DbSet<OrderItem> OrderItems { get; set; }

    public virtual DbSet<OrderStatusHistory> OrderStatusHistories { get; set; }

    public virtual DbSet<Payment> Payments { get; set; }

    public virtual DbSet<Courier> Couriers { get; set; }

    public virtual DbSet<Product> Products { get; set; }

    public virtual DbSet<Product3DModel> Product3DModels { get; set; }

    public virtual DbSet<ProductImage> ProductImages { get; set; }

    public virtual DbSet<ProductVariant> ProductVariants { get; set; }

    public virtual DbSet<PromoCode> PromoCodes { get; set; }

    public virtual DbSet<Review> Reviews { get; set; }

    public virtual DbSet<Shipment> Shipments { get; set; }

    public virtual DbSet<Size> Sizes { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<WishlistItem> WishlistItems { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasSequence("order_number_seq").StartsAt(1000L);

        modelBuilder.Entity<Address>(entity =>
        {
            entity.HasKey(e => e.PkAddressId).HasName("addresses_pkey");

            entity.ToTable("addresses");

            entity.HasIndex(e => e.FkUserId, "idx_user_id_adr");

            entity.Property(e => e.PkAddressId)
                .HasMaxLength(40)
                .HasDefaultValueSql("('adr'::text || (gen_random_uuid())::text)")
                .HasColumnName("_pk_address_id");
            entity.Property(e => e.Barangay)
                .HasMaxLength(100)
                .HasColumnName("barangay");
            entity.Property(e => e.City)
                .HasMaxLength(100)
                .HasColumnName("city");
            entity.Property(e => e.Country)
                .HasMaxLength(2)
                .HasDefaultValueSql("'PH'::character varying")
                .HasColumnName("country");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.FkUserId)
                .HasMaxLength(40)
                .HasColumnName("_fk_user_id");
            entity.Property(e => e.IsDefault).HasColumnName("is_default");
            entity.Property(e => e.Line1)
                .HasColumnType("character varying")
                .HasColumnName("line1");
            entity.Property(e => e.Line2)
                .HasColumnType("character varying")
                .HasColumnName("line2");
            entity.Property(e => e.Phone)
                .HasMaxLength(30)
                .HasColumnName("phone");
            entity.Property(e => e.PostalCode)
                .HasMaxLength(20)
                .HasColumnName("postal_code");
            entity.Property(e => e.Province)
                .HasMaxLength(100)
                .HasColumnName("province");
            entity.Property(e => e.RecipientName)
                .HasMaxLength(150)
                .HasColumnName("recipient_name");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");
            entity.Property(e => e.ArchivedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("archived_at");

            entity.HasOne(d => d.FkUser).WithMany(p => p.Addresses)
                .HasForeignKey(d => d.FkUserId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("addresses__fk_user_id_fkey");
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.PkAuditLogId).HasName("audit_logs_pkey");

            entity.ToTable("audit_logs");

            entity.HasIndex(e => e.FkUserId, "idx_user_id_logs");

            entity.Property(e => e.PkAuditLogId)
                .HasMaxLength(40)
                .HasDefaultValueSql("('log'::text || (gen_random_uuid())::text)")
                .HasColumnName("_pk_audit_log_id");
            entity.Property(e => e.Action)
                .HasMaxLength(100)
                .HasColumnName("action");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.FkUserId)
                .HasMaxLength(40)
                .HasColumnName("_fk_user_id");
            entity.Property(e => e.IpAddress)
                .HasMaxLength(45)
                .HasColumnName("ip_address");

            entity.HasOne(d => d.FkUser).WithMany(p => p.AuditLogs)
                .HasForeignKey(d => d.FkUserId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("audit_logs__fk_user_id_fkey");
        });

        modelBuilder.Entity<Cart>(entity =>
        {
            entity.HasKey(e => e.PkCartId).HasName("carts_pkey");

            entity.ToTable("carts", t => t.HasCheckConstraint("ck_carts_owner", "_fk_user_id IS NOT NULL OR session_token IS NOT NULL"));

            entity.HasIndex(e => e.FkUserId, "ux_carts_user").IsUnique().HasFilter("_fk_user_id IS NOT NULL");
            entity.HasIndex(e => e.SessionToken, "ux_carts_session").IsUnique().HasFilter("session_token IS NOT NULL");

            entity.Property(e => e.PkCartId)
                .HasMaxLength(40)
                .HasDefaultValueSql("('cart'::text || (gen_random_uuid())::text)")
                .HasColumnName("_pk_cart_id")
                .ValueGeneratedOnAdd();
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.FkUserId)
                .HasMaxLength(40)
                .HasColumnName("_fk_user_id");
            entity.Property(e => e.SessionToken)
                .HasMaxLength(100)
                .HasColumnName("session_token");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.FkUser).WithMany(p => p.Carts)
                .HasForeignKey(d => d.FkUserId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("carts__fk_user_id_fkey");
        });

        modelBuilder.Entity<CartItem>(entity =>
        {
            entity.HasKey(e => e.PkCartItemId).HasName("cart_items_pkey");

            entity.ToTable("cart_items", t => t.HasCheckConstraint("ck_cart_items_qty", "quantity > 0"));

            entity.HasIndex(e => new { e.FkCartId, e.FkProductVariantId }, "idx_unique_variant").IsUnique();

            entity.Property(e => e.PkCartItemId)
                .HasMaxLength(64)
                .HasDefaultValueSql("('c-item'::text || (gen_random_uuid())::text)")
                .HasColumnName("_pk_cart_item_id")
                .ValueGeneratedOnAdd();
            entity.Property(e => e.AddedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("added_at");
            entity.Property(e => e.FkCartId)
                .HasMaxLength(40)
                .HasColumnName("_fk_cart_id");
            entity.Property(e => e.FkProductVariantId)
                .HasMaxLength(40)
                .HasColumnName("_fk_product_variant_id");
            entity.Property(e => e.Quantity)
                .HasDefaultValue(1)
                .HasColumnName("quantity");

            entity.HasOne(d => d.FkCart).WithMany(p => p.CartItems)
                .HasForeignKey(d => d.FkCartId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("cart_items__fk_cart_id_fkey");

            entity.HasOne(d => d.FkProductVariant).WithMany(p => p.CartItems)
                .HasForeignKey(d => d.FkProductVariantId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("cart_items__fk_product_variant_id_fkey");
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(e => e.PkCategoryId).HasName("categories_pkey");

            entity.ToTable("categories");

            entity.HasIndex(e => e.Slug, "categories_slug_key").IsUnique();

            entity.Property(e => e.PkCategoryId)
                .HasMaxLength(40)
                .HasDefaultValueSql("('ctg'::text || (gen_random_uuid())::text)")
                .HasColumnName("_pk_category_id");
            entity.Property(e => e.CategoryName)
                .HasMaxLength(100)
                .HasColumnName("category_name");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.FkParentCategoryId)
                .HasMaxLength(40)
                .HasColumnName("_fk_parent_category_id");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.Slug)
                .HasMaxLength(120)
                .HasColumnName("slug");

            entity.HasOne(d => d.FkParentCategory).WithMany(p => p.InverseFkParentCategory)
                .HasForeignKey(d => d.FkParentCategoryId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("categories__fk_parent_category_id_fkey");
        });

        modelBuilder.Entity<Color>(entity =>
        {
            entity.HasKey(e => e.PkColorId).HasName("colors_pkey");

            entity.ToTable("colors");

            entity.Property(e => e.PkColorId)
                .UseIdentityAlwaysColumn()
                .HasColumnName("_pk_color_id");
            entity.Property(e => e.HexCode)
                .HasMaxLength(7)
                .HasColumnName("hex_code");
            entity.Property(e => e.Name)
                .HasMaxLength(50)
                .HasColumnName("name");
        });

        modelBuilder.Entity<Courier>(entity =>
        {
            entity.HasKey(e => e.PkCourierId).HasName("couriers_pkey");
            entity.ToTable("couriers");

            entity.HasIndex(e => e.Code, "couriers_code_key").IsUnique();

            entity.Property(e => e.PkCourierId)
                .HasMaxLength(40)
                .HasDefaultValueSql("('cour'::text || gen_random_uuid()::text)")
                .HasColumnName("_pk_courier_id");
            entity.Property(e => e.Code)
                .HasMaxLength(20)
                .HasColumnName("code");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.Fee)
                .HasPrecision(10, 2)
                .HasColumnName("fee");
            entity.Property(e => e.DaysMin)
                .HasColumnName("days_min");
            entity.Property(e => e.DaysMax)
                .HasColumnName("days_max");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.PkOrderId).HasName("orders_pkey");

            entity.ToTable("orders", t =>
            {
                t.HasCheckConstraint("ck_orders_money", "subtotal >= 0 AND discount_amount >= 0 AND shipping_fee >= 0 AND shipping_discount >= 0 AND total_amount = GREATEST(0, subtotal + shipping_fee - discount_amount)");
                t.HasCheckConstraint("ck_orders_owner", "_fk_user_id IS NOT NULL OR contact_email IS NOT NULL");
            });

            entity.HasIndex(e => e.PlacedAt, "idx_placed_at");

            entity.HasIndex(e => e.FkUserId, "idx_user_id_orders");

            entity.HasIndex(e => e.OrderNumber, "orders_order_number_key").IsUnique();

            entity.HasIndex(e => e.IdempotencyKey, "ux_orders_idempotency_key").IsUnique().HasFilter("idempotency_key IS NOT NULL");

            entity.HasIndex(e => new { e.FkUserId, e.PlacedAt }, "ix_orders_user_placed").IsDescending(false, true);

            entity.Property(e => e.PkOrderId)
                .HasMaxLength(40)
                .HasDefaultValueSql("('ord'::text || (gen_random_uuid())::text)")
                .HasColumnName("_pk_order_id");
            entity.Property(e => e.CustomerNote).HasColumnName("customer_note");
            entity.Property(e => e.DiscountAmount)
                .HasPrecision(10, 2)
                .HasColumnName("discount_amount");
            entity.Property(e => e.FkBillingAddressId)
                .HasMaxLength(40)
                .HasColumnName("_fk_billing_address_id");
            entity.Property(e => e.FkPromoCodeId)
                .HasMaxLength(40)
                .HasColumnName("_fk_promo_code_id");
            entity.Property(e => e.FkShippingAddressId)
                .HasMaxLength(40)
                .HasColumnName("_fk_shipping_address_id");
            entity.Property(e => e.FkUserId)
                .HasMaxLength(40)
                .HasColumnName("_fk_user_id")
                .IsRequired(false);
            entity.Property(e => e.OrderNumber)
                .HasMaxLength(30)
                .HasColumnName("order_number");
            entity.Property(e => e.PlacedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("placed_at");
            entity.Property(e => e.ShippingFee)
                .HasPrecision(10, 2)
                .HasColumnName("shipping_fee");
            entity.Property(e => e.Subtotal)
                .HasPrecision(10, 2)
                .HasColumnName("subtotal");
            entity.Property(e => e.TotalAmount)
                .HasPrecision(10, 2)
                .HasColumnName("total_amount");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");
            entity.Property(e => e.ContactEmail)
                .HasMaxLength(255)
                .HasColumnName("contact_email");
            entity.Property(e => e.ContactPhone)
                .HasMaxLength(30)
                .HasColumnName("contact_phone");
            entity.Property(e => e.CashReadyOption)
                .HasMaxLength(50)
                .HasColumnName("cash_ready_option");
            entity.Property(e => e.ShippingDiscount)
                .HasPrecision(10, 2)
                .HasDefaultValue(0m)
                .HasColumnName("shipping_discount");
            entity.Property(e => e.IdempotencyKey)
                .HasMaxLength(64)
                .HasColumnName("idempotency_key");
            entity.Property(e => e.IsTest)
                .HasDefaultValue(false)
                .HasColumnName("is_test");
            entity.Property(e => e.Version)
                .IsRowVersion();

            entity.HasOne(d => d.FkBillingAddress).WithMany(p => p.OrderFkBillingAddresses)
                .HasForeignKey(d => d.FkBillingAddressId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("orders__fk_billing_address_id_fkey");

            entity.HasOne(d => d.FkPromoCode).WithMany(p => p.Orders)
                .HasForeignKey(d => d.FkPromoCodeId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("orders__fk_promo_code_id_fkey");

            entity.HasOne(d => d.FkShippingAddress).WithMany(p => p.OrderFkShippingAddresses)
                .HasForeignKey(d => d.FkShippingAddressId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("orders__fk_shipping_address_id_fkey");

            entity.HasOne(d => d.FkUser).WithMany(p => p.Orders)
                .HasForeignKey(d => d.FkUserId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("orders__fk_user_id_fkey");
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.HasKey(e => e.PkOrderItemId).HasName("order_items_pkey");

            entity.ToTable("order_items", t =>
            {
                t.HasCheckConstraint("ck_order_items_qty", "quantity > 0");
                t.HasCheckConstraint("ck_order_items_price", "unit_price >= 0 AND line_total = unit_price * quantity");
            });

            entity.HasIndex(e => e.FkOrderId, "idx_order_id");

            entity.HasIndex(e => e.FkProductVariantId, "idx_variant_id");

            entity.Property(e => e.PkOrderItemId)
                .HasMaxLength(64)
                .HasDefaultValueSql("('o-item'::text || (gen_random_uuid())::text)")
                .HasColumnName("_pk_order_item_id");
            entity.Property(e => e.ColorName)
                .HasMaxLength(50)
                .HasColumnName("color_name");
            entity.Property(e => e.FkOrderId)
                .HasMaxLength(40)
                .HasColumnName("_fk_order_id");
            entity.Property(e => e.FkProductVariantId)
                .HasMaxLength(40)
                .HasColumnName("_fk_product_variant_id");
            entity.Property(e => e.LineTotal)
                .HasPrecision(10, 2)
                .HasColumnName("line_total");
            entity.Property(e => e.ProductName)
                .HasMaxLength(200)
                .HasColumnName("product_name");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.SizeLabel)
                .HasMaxLength(10)
                .HasColumnName("size_label");
            entity.Property(e => e.Sku)
                .HasMaxLength(64)
                .HasColumnName("sku");
            entity.Property(e => e.UnitPrice)
                .HasPrecision(10, 2)
                .HasColumnName("unit_price");

            entity.HasOne(d => d.FkOrder).WithMany(p => p.OrderItems)
                .HasForeignKey(d => d.FkOrderId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("order_items__fk_order_id_fkey");

            entity.HasOne(d => d.FkProductVariant).WithMany(p => p.OrderItems)
                .HasForeignKey(d => d.FkProductVariantId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("order_items__fk_product_variant_id_fkey");
        });

        modelBuilder.Entity<OrderStatusHistory>(entity =>
        {
            entity.HasKey(e => e.PkOrderStatusHistoryId).HasName("order_status_history_pkey");

            entity.ToTable("order_status_history");

            entity.HasIndex(e => e.FkOrderId, "idx_order_id_history");

            entity.HasIndex(e => e.ChangedBy, "IX_order_status_history_changed_by");

            entity.Property(e => e.PkOrderStatusHistoryId)
                .HasMaxLength(64)
                .HasDefaultValueSql("('o-history'::text || (gen_random_uuid())::text)")
                .HasColumnName("_pk_order_status_history_id");
            entity.Property(e => e.ChangedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("changed_at");
            entity.Property(e => e.ChangedBy)
                .HasMaxLength(40)
                .HasColumnName("changed_by")
                .IsRequired(false);
            entity.Property(e => e.FkOrderId)
                .HasMaxLength(40)
                .HasColumnName("_fk_order_id");
            entity.Property(e => e.Note).HasColumnName("note");

            entity.HasOne(d => d.ChangedByNavigation).WithMany(p => p.OrderStatusHistories)
                .HasForeignKey(d => d.ChangedBy)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("order_status_history_changed_by_fkey");

            entity.HasOne(d => d.FkOrder).WithMany(p => p.OrderStatusHistories)
                .HasForeignKey(d => d.FkOrderId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("order_status_history__fk_order_id_fkey");
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasKey(e => e.PkPaymentId).HasName("payments_pkey");

            entity.ToTable("payments", t => t.HasCheckConstraint("ck_payments_amount", "amount >= 0"));

            entity.HasIndex(e => e.FkOrderId, "idx_order_id_payments");

            entity.HasIndex(e => e.FkOrderId, "ux_payments_one_paid").IsUnique().HasFilter("status = 2");

            entity.Property(e => e.PkPaymentId)
                .HasMaxLength(40)
                .HasDefaultValueSql("('pay'::text || (gen_random_uuid())::text)")
                .HasColumnName("_pk_payment_id");
            entity.Property(e => e.Amount)
                .HasPrecision(10, 2)
                .HasColumnName("amount");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.FkOrderId)
                .HasMaxLength(40)
                .HasColumnName("_fk_order_id");
            entity.Property(e => e.PaidAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("paid_at");
            entity.Property(e => e.ProviderReference)
                .HasMaxLength(120)
                .HasColumnName("provider_reference");

            entity.HasOne(d => d.FkOrder).WithMany(p => p.Payments)
                .HasForeignKey(d => d.FkOrderId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("payments__fk_order_id_fkey");
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.PkProductId).HasName("products_pkey");

            entity.ToTable("products", t => t.HasCheckConstraint("ck_products_price", "base_price >= 0"));

            entity.HasIndex(e => e.FkCategoryId, "idx_category_id");

            entity.HasIndex(e => e.ProductName, "idx_product_name");

            entity.HasIndex(e => e.DisplayId, "products_display_id_key").IsUnique();

            entity.HasIndex(e => e.Slug, "products_slug_key").IsUnique();

            entity.Property(e => e.PkProductId)
                .HasMaxLength(40)
                .HasDefaultValueSql("('prd'::text || (gen_random_uuid())::text)")
                .HasColumnName("_pk_product_id");
            entity.Property(e => e.BasePrice)
                .HasPrecision(10, 2)
                .HasColumnName("base_price");
            entity.Property(e => e.SalePrice)
                .HasPrecision(10, 2)
                .HasColumnName("sale_price");
            entity.Property(e => e.Badge)
                .HasMaxLength(50)
                .HasColumnName("badge");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.DisplayId)
                .HasMaxLength(20)
                .HasDefaultValueSql("('PRD-'::text || (nextval('product_display_seq'::regclass))::text)")
                .HasColumnName("display_id");
            entity.Property(e => e.FkCategoryId)
                .HasMaxLength(40)
                .HasColumnName("_fk_category_id");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.Material)
                .HasMaxLength(150)
                .HasColumnName("material");
            entity.Property(e => e.ProductName)
                .HasMaxLength(255)
                .HasColumnName("product_name");
            entity.Property(e => e.Slug)
                .HasMaxLength(255)
                .HasColumnName("slug");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");
            entity.Property(e => e.AvgRating)
                .HasPrecision(3, 2)
                .HasDefaultValue(0m)
                .HasColumnName("avg_rating");
            entity.Property(e => e.ReviewCount)
                .HasDefaultValue(0)
                .HasColumnName("review_count");
            entity.Property(e => e.SoldCount)
                .HasDefaultValue(0)
                .HasColumnName("sold_count");

            entity.HasOne(d => d.FkCategory).WithMany(p => p.Products)
                .HasForeignKey(d => d.FkCategoryId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("products__fk_category_id_fkey");
        });

        modelBuilder.Entity<ProductImage>(entity =>
        {
            entity.HasKey(e => e.PkProductImageId).HasName("product_images_pkey");

            entity.ToTable("product_images");

            entity.HasIndex(e => e.FkProductId, "ux_product_images_one_primary").IsUnique().HasFilter("is_primary");

            entity.Property(e => e.PkProductImageId)
                .HasMaxLength(40)
                .HasDefaultValueSql("('img'::text || (gen_random_uuid())::text)")
                .HasColumnName("_pk_product_image_id");
            entity.Property(e => e.AltText)
                .HasMaxLength(255)
                .HasColumnName("alt_text");
            entity.Property(e => e.FkProductId)
                .HasMaxLength(40)
                .HasColumnName("_fk_product_id");
            entity.Property(e => e.FkVariantId)
                .HasMaxLength(40)
                .HasColumnName("_fk_variant_id");
            entity.Property(e => e.IsPrimary).HasColumnName("is_primary");
            entity.Property(e => e.SortOrder).HasColumnName("sort_order");
            entity.Property(e => e.Url)
                .HasMaxLength(500)
                .HasColumnName("url");

            entity.HasOne(d => d.FkProduct).WithMany(p => p.ProductImages)
                .HasForeignKey(d => d.FkProductId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("product_images__fk_product_id_fkey");

            entity.HasOne(d => d.FkVariant).WithMany(p => p.ProductImages)
                .HasForeignKey(d => d.FkVariantId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("product_images__fk_variant_id_fkey");
        });

        modelBuilder.Entity<Product3DModel>(entity =>
        {
            entity.HasKey(e => e.PkProduct3DModelId).HasName("product_3d_models_pkey");

            entity.ToTable("product_3d_models");

            entity.HasIndex(e => e.FkProductId, "idx_product_id_3d_models");

            entity.Property(e => e.PkProduct3DModelId)
                .HasMaxLength(40)
                .HasDefaultValueSql("('m3d'::text || (gen_random_uuid())::text)")
                .HasColumnName("_pk_product_3d_model_id");
            entity.Property(e => e.FkProductId)
                .HasMaxLength(40)
                .HasColumnName("_fk_product_id");
            entity.Property(e => e.ModelUrl)
                .HasMaxLength(500)
                .HasColumnName("model_url");
            entity.Property(e => e.PreviewImageUrl)
                .HasMaxLength(500)
                .HasColumnName("preview_image_url");
            entity.Property(e => e.ModelName)
                .HasMaxLength(255)
                .HasColumnName("model_name");
            entity.Property(e => e.FileSizeBytes).HasColumnName("file_size_bytes");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.FkProduct).WithMany(p => p.Product3DModels)
                .HasForeignKey(d => d.FkProductId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("product_3d_models__fk_product_id_fkey");
        });

        modelBuilder.Entity<ProductVariant>(entity =>
        {
            entity.HasKey(e => e.PkProductVariantId).HasName("product_variants_pkey");

            entity.ToTable("product_variants", t =>
            {
                t.HasCheckConstraint("ck_variants_stock", "stock_quantity >= 0");
                t.HasCheckConstraint("ck_variants_price", "price_override IS NULL OR price_override >= 0");
            });

            entity.HasIndex(e => e.FkProductId, "idx_product_id_variants");

            entity.HasIndex(e => new { e.FkProductId, e.FkSizeId, e.FkColorId }, "idx_unique_variant_combo").IsUnique();

            entity.HasIndex(e => e.Sku, "product_variants_sku_key").IsUnique();

            entity.HasIndex(e => e.FkProductId, "ix_product_variants_active").HasFilter("is_active");

            entity.Property(e => e.PkProductVariantId)
                .HasMaxLength(40)
                .HasDefaultValueSql("('var'::text || (gen_random_uuid())::text)")
                .HasColumnName("_pk_product_variant_id");
            entity.Property(e => e.FkColorId).HasColumnName("_fk_color_id");
            entity.Property(e => e.FkProductId)
                .HasMaxLength(40)
                .HasColumnName("_fk_product_id");
            entity.Property(e => e.FkSizeId).HasColumnName("_fk_size_id");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.PriceOverride)
                .HasPrecision(10, 2)
                .HasColumnName("price_override");
            entity.Property(e => e.ReorderLevel)
                .HasDefaultValue(5)
                .HasColumnName("reorder_level");
            entity.Property(e => e.Sku)
                .HasMaxLength(64)
                .HasColumnName("sku");
            entity.Property(e => e.StockQuantity).HasColumnName("stock_quantity");

            entity.HasOne(d => d.FkColor).WithMany(p => p.ProductVariants)
                .HasForeignKey(d => d.FkColorId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("product_variants__fk_color_id_fkey");

            entity.HasOne(d => d.FkProduct).WithMany(p => p.ProductVariants)
                .HasForeignKey(d => d.FkProductId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("product_variants__fk_product_id_fkey");

            entity.HasOne(d => d.FkSize).WithMany(p => p.ProductVariants)
                .HasForeignKey(d => d.FkSizeId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("product_variants__fk_size_id_fkey");
        });

        modelBuilder.Entity<PromoCode>(entity =>
        {
            entity.HasKey(e => e.PkPromoCodeId).HasName("promo_codes_pkey");

            entity.ToTable("promo_codes", t =>
            {
                t.HasCheckConstraint("ck_promo_value", "discount_value > 0 AND times_used >= 0");
                t.HasCheckConstraint("ck_promo_window", "promo_end IS NULL OR promo_start IS NULL OR promo_end >= promo_start");
                t.HasCheckConstraint("ck_promo_uses", "max_uses IS NULL OR times_used <= max_uses");
            });

            entity.HasIndex(e => e.Promocode, "promo_codes_promocode_key").IsUnique();

            entity.Property(e => e.PkPromoCodeId)
                .HasMaxLength(40)
                .HasDefaultValueSql("('code'::text || (gen_random_uuid())::text)")
                .HasColumnName("_pk_promo_code_id");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.DiscountType).HasColumnName("discount_type");
            entity.Property(e => e.DiscountValue)
                .HasPrecision(10, 2)
                .HasColumnName("discount_value");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.MaxUses).HasColumnName("max_uses");
            entity.Property(e => e.MinOrderAmount)
                .HasPrecision(10, 2)
                .HasDefaultValue(0m)
                .HasColumnName("min_order_amount");
            entity.Property(e => e.PromoEnd)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("promo_end");
            entity.Property(e => e.PromoStart)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("promo_start");
            entity.Property(e => e.Promocode)
                .HasMaxLength(40)
                .HasColumnName("promocode");
            entity.Property(e => e.TimesUsed).HasColumnName("times_used");
            entity.Property(e => e.MaxDiscountAmount)
                .HasPrecision(10, 2)
                .HasColumnName("max_discount_amount");
        });

        modelBuilder.Entity<Review>(entity =>
        {
            entity.HasKey(e => e.PkReviewId).HasName("reviews_pkey");

            entity.ToTable("reviews", t => t.HasCheckConstraint("ck_reviews_rating", "rating BETWEEN 1 AND 5"));

            entity.HasIndex(e => e.FkProductId, "idx_product_id_reviews");

            entity.HasIndex(e => new { e.FkUserId, e.FkOrderItemId }, "idx_unique_review_order_item").IsUnique();

            entity.Property(e => e.PkReviewId)
                .HasMaxLength(40)
                .HasDefaultValueSql("('rvw'::text || (gen_random_uuid())::text)")
                .HasColumnName("_pk_review_id");
            entity.Property(e => e.Body).HasColumnName("body");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.FkOrderItemId)
                .HasMaxLength(64)
                .HasColumnName("_fk_order_item_id");
            entity.Property(e => e.FkProductId)
                .HasMaxLength(40)
                .HasColumnName("_fk_product_id");
            entity.Property(e => e.FkUserId)
                .HasMaxLength(40)
                .HasColumnName("_fk_user_id");
            entity.Property(e => e.Rating).HasColumnName("rating");

            entity.HasOne(d => d.FkOrderItem).WithMany(p => p.Reviews)
                .HasForeignKey(d => d.FkOrderItemId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("reviews__fk_order_item_id_fkey");

            entity.HasOne(d => d.FkProduct).WithMany(p => p.Reviews)
                .HasForeignKey(d => d.FkProductId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("reviews__fk_product_id_fkey");

            entity.HasOne(d => d.FkUser).WithMany(p => p.Reviews)
                .HasForeignKey(d => d.FkUserId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("reviews__fk_user_id_fkey");
        });

        modelBuilder.Entity<Shipment>(entity =>
        {
            entity.HasKey(e => e.PkShipmentId).HasName("shipments_pkey");

            entity.ToTable("shipments");

            entity.HasIndex(e => e.FkOrderId, "idx_order_id_shipment");

            entity.HasIndex(e => e.TrackingNumber, "idx_tracking_number");

            entity.HasIndex(e => e.FkCourierId, "ix_shipments_courier");

            entity.Property(e => e.PkShipmentId)
                .HasMaxLength(40)
                .HasDefaultValueSql("('ship'::text || (gen_random_uuid())::text)")
                .HasColumnName("_pk_shipment_id");
            entity.Property(e => e.Courier)
                .HasMaxLength(255)
                .HasColumnName("courier");
            entity.Property(e => e.DeliveredAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("delivered_at");
            entity.Property(e => e.FkOrderId)
                .HasMaxLength(40)
                .HasColumnName("_fk_order_id");
            entity.Property(e => e.FkCourierId)
                .HasMaxLength(40)
                .HasColumnName("_fk_courier_id");
            entity.Property(e => e.ShippedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("shipped_at");
            entity.Property(e => e.Status)
                .HasColumnName("status");
            entity.Property(e => e.TrackingNumber)
                .HasMaxLength(255)
                .HasColumnName("tracking_number");

            entity.HasOne(d => d.FkOrder).WithMany(p => p.Shipments)
                .HasForeignKey(d => d.FkOrderId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("shipments__fk_order_id_fkey");

            entity.HasOne(d => d.FkCourier).WithMany(p => p.Shipments)
                .HasForeignKey(d => d.FkCourierId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("shipments__fk_courier_id_fkey");
        });

        modelBuilder.Entity<Size>(entity =>
        {
            entity.HasKey(e => e.PkSizeId).HasName("sizes_pkey");

            entity.ToTable("sizes");

            entity.HasIndex(e => e.Label, "sizes_label_key").IsUnique();

            entity.Property(e => e.PkSizeId)
                .UseIdentityAlwaysColumn()
                .HasColumnName("_pk_size_id");
            entity.Property(e => e.Label)
                .HasMaxLength(10)
                .HasColumnName("label");
            entity.Property(e => e.SortOrder).HasColumnName("sort_order");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.PkUserId).HasName("users_pkey");

            entity.ToTable("users");

            entity.HasIndex(e => e.UserEmail, "users_user_email_key").IsUnique();

            entity.Property(e => e.PkUserId)
                .HasMaxLength(60)
                .HasDefaultValueSql("('usr'::text || (gen_random_uuid())::text)")
                .HasColumnName("_pk_user_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.EmailVerifiedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("email_verified_at");
            entity.Property(e => e.FirstName)
                .HasMaxLength(100)
                .HasColumnName("first_name");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.LastName)
                .HasMaxLength(100)
                .HasColumnName("last_name");
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .HasColumnName("password_hash");
            entity.Property(e => e.PhoneNumber)
                .HasMaxLength(100)
                .HasColumnName("phone_number");
            entity.Property(e => e.Role)
                .HasColumnName("role");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");
            entity.Property(e => e.UserEmail)
                .HasMaxLength(255)
                .HasColumnName("user_email");
        });

        modelBuilder.Entity<WishlistItem>(entity =>
        {
            entity
                .HasNoKey()
                .ToTable("wishlist_items");

            entity.Property(e => e.AddedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("added_at");
            entity.Property(e => e.FkProuductId)
                .HasMaxLength(40)
                .HasColumnName("_fk_prouduct_id");
            entity.Property(e => e.FkUserId)
                .HasMaxLength(40)
                .HasColumnName("_fk_user_id");
            entity.Property(e => e.RemovedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("removed_at");

            entity.HasOne(d => d.FkProuduct).WithMany()
                .HasForeignKey(d => d.FkProuductId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("wishlist_items__fk_prouduct_id_fkey");

            entity.HasOne(d => d.FkUser).WithMany()
                .HasForeignKey(d => d.FkUserId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("wishlist_items__fk_user_id_fkey");
        });

        modelBuilder.Entity<DashboardMetric>(entity =>
        {
            entity.HasKey(e => e.PkDashboardMetricId).HasName("dashboard_metrics_pkey");

            entity.ToTable("dashboard_metrics");

            entity.HasIndex(e => e.MetricKey, "idx_dashboard_metric_key");

            entity.Property(e => e.PkDashboardMetricId)
                .HasMaxLength(80)
                .HasDefaultValueSql("('dmetric'::text || (gen_random_uuid())::text)")
                .HasColumnName("_pk_dashboard_metric_id");
            entity.Property(e => e.MetricKey)
                .HasMaxLength(50)
                .HasColumnName("metric_key");
            entity.Property(e => e.MetricLabel)
                .HasMaxLength(100)
                .HasColumnName("metric_label");
            entity.Property(e => e.DayOfWeek)
                .HasMaxLength(10)
                .HasColumnName("day_of_week");
            entity.Property(e => e.SlotIndex)
                .HasColumnName("slot_index");
            entity.Property(e => e.MetricValue)
                .HasColumnType("numeric")
                .HasColumnName("metric_value");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<DashboardNotification>(entity =>
        {
            entity.HasKey(e => e.PkDashboardNotificationId).HasName("dashboard_notifications_pkey");

            entity.ToTable("dashboard_notifications");

            entity.HasIndex(e => e.Status, "idx_dashboard_notification_status");

            entity.Property(e => e.PkDashboardNotificationId)
                .HasMaxLength(80)
                .HasDefaultValueSql("('dnotif'::text || (gen_random_uuid())::text)")
                .HasColumnName("_pk_dashboard_notification_id");
            entity.Property(e => e.OrderId)
                .HasMaxLength(40)
                .HasColumnName("order_id");
            entity.Property(e => e.OrderNumber)
                .HasMaxLength(40)
                .HasColumnName("order_number");
            entity.Property(e => e.Category)
                .HasMaxLength(100)
                .HasColumnName("category");
            entity.Property(e => e.Weight)
                .HasMaxLength(50)
                .HasColumnName("weight");
            entity.Property(e => e.Company)
                .HasMaxLength(100)
                .HasColumnName("company");
            entity.Property(e => e.ArrivalTime)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("arrival_time");
            entity.Property(e => e.Route)
                .HasMaxLength(150)
                .HasColumnName("route");
            entity.Property(e => e.Price)
                .HasColumnType("numeric")
                .HasColumnName("price");
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasColumnName("status");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
        });

        modelBuilder.HasSequence("product_display_seq").StartsAt(1000L);

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
