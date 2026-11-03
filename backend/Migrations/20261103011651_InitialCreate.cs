using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:address_type", "shipping,billing")
                .Annotation("Npgsql:Enum:discount_type", "percentage,fixed_amount")
                .Annotation("Npgsql:Enum:order_status", "pending,paid,processing,shipped,delivered,cancelled,refunded")
                .Annotation("Npgsql:Enum:payment_method", "cod,gcash,maya,card,bank_transfer")
                .Annotation("Npgsql:Enum:payment_status", "pending,authorized,paid,failed,refunded")
                .Annotation("Npgsql:Enum:shipment_status", "preparing,in_transit,delivered,returned")
                .Annotation("Npgsql:Enum:user_role", "customer,admin,staff");

            migrationBuilder.CreateSequence(
                name: "product_display_seq",
                startValue: 1000L);

            migrationBuilder.CreateTable(
                name: "categories",
                columns: table => new
                {
                    _pk_category_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValueSql: "('ctg'::text || (gen_random_uuid())::text)"),
                    _fk_parent_category_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    category_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    slug = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("categories_pkey", x => x._pk_category_id);
                    table.ForeignKey(
                        name: "categories__fk_parent_category_id_fkey",
                        column: x => x._fk_parent_category_id,
                        principalTable: "categories",
                        principalColumn: "_pk_category_id");
                });

            migrationBuilder.CreateTable(
                name: "collections",
                columns: table => new
                {
                    _pk_collection_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValueSql: "('col'::text || (gen_random_uuid())::text)"),
                    collection_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    slug = table.Column<string>(type: "character varying(140)", maxLength: 140, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    banner_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    launch_date = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("collections_pkey", x => x._pk_collection_id);
                });

            migrationBuilder.CreateTable(
                name: "colors",
                columns: table => new
                {
                    _pk_color_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    hex_code = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("colors_pkey", x => x._pk_color_id);
                });

            migrationBuilder.CreateTable(
                name: "promo_codes",
                columns: table => new
                {
                    _pk_promo_code_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValueSql: "('code'::text || (gen_random_uuid())::text)"),
                    discount_type = table.Column<int>(type: "integer", nullable: false),
                    promocode = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    discount_value = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    min_order_amount = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true, defaultValue: 0m),
                    max_uses = table.Column<int>(type: "integer", nullable: true),
                    times_used = table.Column<int>(type: "integer", nullable: false),
                    promo_start = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    promo_end = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("promo_codes_pkey", x => x._pk_promo_code_id);
                });

            migrationBuilder.CreateTable(
                name: "sizes",
                columns: table => new
                {
                    _pk_size_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    label = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("sizes_pkey", x => x._pk_size_id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    _pk_user_id = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false, defaultValueSql: "('usr'::text || (gen_random_uuid())::text)"),
                    role = table.Column<int>(type: "integer", nullable: false),
                    user_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    password_hash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    first_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    last_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    phone_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    email_verified_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("users_pkey", x => x._pk_user_id);
                });

            migrationBuilder.CreateTable(
                name: "products",
                columns: table => new
                {
                    _pk_product_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValueSql: "('prd'::text || (gen_random_uuid())::text)"),
                    display_id = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true, defaultValueSql: "('PRD-'::text || (nextval('product_display_seq'::regclass))::text)"),
                    slug = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    product_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    _fk_category_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    base_price = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    material = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("products_pkey", x => x._pk_product_id);
                    table.ForeignKey(
                        name: "products__fk_category_id_fkey",
                        column: x => x._fk_category_id,
                        principalTable: "categories",
                        principalColumn: "_pk_category_id");
                });

            migrationBuilder.CreateTable(
                name: "addresses",
                columns: table => new
                {
                    _pk_address_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValueSql: "('adr'::text || (gen_random_uuid())::text)"),
                    _fk_user_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    recipient_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    phone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    line1 = table.Column<string>(type: "character varying", nullable: false),
                    line2 = table.Column<string>(type: "character varying", nullable: true),
                    barangay = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    city = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    province = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    postal_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    country = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false, defaultValueSql: "'PH'::character varying"),
                    is_default = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()"),
                    address_type = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("addresses_pkey", x => x._pk_address_id);
                    table.ForeignKey(
                        name: "addresses__fk_user_id_fkey",
                        column: x => x._fk_user_id,
                        principalTable: "users",
                        principalColumn: "_pk_user_id");
                });

            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    _pk_audit_log_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValueSql: "('log'::text || (gen_random_uuid())::text)"),
                    _fk_user_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ip_address = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("audit_logs_pkey", x => x._pk_audit_log_id);
                    table.ForeignKey(
                        name: "audit_logs__fk_user_id_fkey",
                        column: x => x._fk_user_id,
                        principalTable: "users",
                        principalColumn: "_pk_user_id");
                });

            migrationBuilder.CreateTable(
                name: "carts",
                columns: table => new
                {
                    _pk_cart_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValueSql: "('cart'::text || (gen_random_uuid())::text)"),
                    _fk_user_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    session_token = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("carts_pkey", x => x._pk_cart_id);
                    table.ForeignKey(
                        name: "carts__fk_user_id_fkey",
                        column: x => x._fk_user_id,
                        principalTable: "users",
                        principalColumn: "_pk_user_id");
                });

            migrationBuilder.CreateTable(
                name: "collection_products",
                columns: table => new
                {
                    _fk_collection_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    _fk_product_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.ForeignKey(
                        name: "collection_products__fk_collection_id_fkey",
                        column: x => x._fk_collection_id,
                        principalTable: "collections",
                        principalColumn: "_pk_collection_id");
                    table.ForeignKey(
                        name: "collection_products__fk_product_id_fkey",
                        column: x => x._fk_product_id,
                        principalTable: "products",
                        principalColumn: "_pk_product_id");
                });

            migrationBuilder.CreateTable(
                name: "product_variants",
                columns: table => new
                {
                    _pk_product_variant_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValueSql: "('var'::text || (gen_random_uuid())::text)"),
                    _fk_product_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    _fk_size_id = table.Column<long>(type: "bigint", nullable: false),
                    _fk_color_id = table.Column<long>(type: "bigint", nullable: false),
                    sku = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    price_override = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    stock_quantity = table.Column<int>(type: "integer", nullable: false),
                    reorder_level = table.Column<int>(type: "integer", nullable: false, defaultValue: 5),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("product_variants_pkey", x => x._pk_product_variant_id);
                    table.ForeignKey(
                        name: "product_variants__fk_color_id_fkey",
                        column: x => x._fk_color_id,
                        principalTable: "colors",
                        principalColumn: "_pk_color_id");
                    table.ForeignKey(
                        name: "product_variants__fk_product_id_fkey",
                        column: x => x._fk_product_id,
                        principalTable: "products",
                        principalColumn: "_pk_product_id");
                    table.ForeignKey(
                        name: "product_variants__fk_size_id_fkey",
                        column: x => x._fk_size_id,
                        principalTable: "sizes",
                        principalColumn: "_pk_size_id");
                });

            migrationBuilder.CreateTable(
                name: "wishlist_items",
                columns: table => new
                {
                    _fk_user_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    _fk_prouduct_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    added_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()"),
                    removed_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.ForeignKey(
                        name: "wishlist_items__fk_prouduct_id_fkey",
                        column: x => x._fk_prouduct_id,
                        principalTable: "products",
                        principalColumn: "_pk_product_id");
                    table.ForeignKey(
                        name: "wishlist_items__fk_user_id_fkey",
                        column: x => x._fk_user_id,
                        principalTable: "users",
                        principalColumn: "_pk_user_id");
                });

            migrationBuilder.CreateTable(
                name: "orders",
                columns: table => new
                {
                    _pk_order_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValueSql: "('ord'::text || (gen_random_uuid())::text)"),
                    status = table.Column<int>(type: "integer", nullable: false),
                    order_number = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    _fk_user_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    _fk_promo_code_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    _fk_shipping_address_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    _fk_billing_address_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    subtotal = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    discount_amount = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    shipping_fee = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    total_amount = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    customer_note = table.Column<string>(type: "text", nullable: true),
                    placed_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("orders_pkey", x => x._pk_order_id);
                    table.ForeignKey(
                        name: "orders__fk_billing_address_id_fkey",
                        column: x => x._fk_billing_address_id,
                        principalTable: "addresses",
                        principalColumn: "_pk_address_id");
                    table.ForeignKey(
                        name: "orders__fk_promo_code_id_fkey",
                        column: x => x._fk_promo_code_id,
                        principalTable: "promo_codes",
                        principalColumn: "_pk_promo_code_id");
                    table.ForeignKey(
                        name: "orders__fk_shipping_address_id_fkey",
                        column: x => x._fk_shipping_address_id,
                        principalTable: "addresses",
                        principalColumn: "_pk_address_id");
                    table.ForeignKey(
                        name: "orders__fk_user_id_fkey",
                        column: x => x._fk_user_id,
                        principalTable: "users",
                        principalColumn: "_pk_user_id");
                });

            migrationBuilder.CreateTable(
                name: "cart_items",
                columns: table => new
                {
                    _pk_cart_item_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValueSql: "('c-item'::text || (gen_random_uuid())::text)"),
                    _fk_cart_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    _fk_product_variant_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    added_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("cart_items_pkey", x => x._pk_cart_item_id);
                    table.ForeignKey(
                        name: "cart_items__fk_cart_id_fkey",
                        column: x => x._fk_cart_id,
                        principalTable: "carts",
                        principalColumn: "_pk_cart_id");
                    table.ForeignKey(
                        name: "cart_items__fk_product_variant_id_fkey",
                        column: x => x._fk_product_variant_id,
                        principalTable: "product_variants",
                        principalColumn: "_pk_product_variant_id");
                });

            migrationBuilder.CreateTable(
                name: "product_images",
                columns: table => new
                {
                    _pk_product_image_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValueSql: "('img'::text || (gen_random_uuid())::text)"),
                    _fk_product_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    _fk_variant_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    alt_text = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("product_images_pkey", x => x._pk_product_image_id);
                    table.ForeignKey(
                        name: "product_images__fk_product_id_fkey",
                        column: x => x._fk_product_id,
                        principalTable: "products",
                        principalColumn: "_pk_product_id");
                    table.ForeignKey(
                        name: "product_images__fk_variant_id_fkey",
                        column: x => x._fk_variant_id,
                        principalTable: "product_variants",
                        principalColumn: "_pk_product_variant_id");
                });

            migrationBuilder.CreateTable(
                name: "order_items",
                columns: table => new
                {
                    _pk_order_item_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValueSql: "('o-item'::text || (gen_random_uuid())::text)"),
                    _fk_order_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    _fk_product_variant_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    product_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    sku = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    size_label = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    color_name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    line_total = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("order_items_pkey", x => x._pk_order_item_id);
                    table.ForeignKey(
                        name: "order_items__fk_order_id_fkey",
                        column: x => x._fk_order_id,
                        principalTable: "orders",
                        principalColumn: "_pk_order_id");
                    table.ForeignKey(
                        name: "order_items__fk_product_variant_id_fkey",
                        column: x => x._fk_product_variant_id,
                        principalTable: "product_variants",
                        principalColumn: "_pk_product_variant_id");
                });

            migrationBuilder.CreateTable(
                name: "order_status_history",
                columns: table => new
                {
                    _pk_order_status_history_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValueSql: "('o-history'::text || (gen_random_uuid())::text)"),
                    status = table.Column<int>(type: "integer", nullable: false),
                    _fk_order_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    changed_by = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    note = table.Column<string>(type: "text", nullable: true),
                    changed_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("order_status_history_pkey", x => x._pk_order_status_history_id);
                    table.ForeignKey(
                        name: "order_status_history__fk_order_id_fkey",
                        column: x => x._fk_order_id,
                        principalTable: "orders",
                        principalColumn: "_pk_order_id");
                    table.ForeignKey(
                        name: "order_status_history_changed_by_fkey",
                        column: x => x.changed_by,
                        principalTable: "users",
                        principalColumn: "_pk_user_id");
                });

            migrationBuilder.CreateTable(
                name: "payments",
                columns: table => new
                {
                    _pk_payment_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValueSql: "('pay'::text || (gen_random_uuid())::text)"),
                    method = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    _fk_order_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    provider_reference = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    paid_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("payments_pkey", x => x._pk_payment_id);
                    table.ForeignKey(
                        name: "payments__fk_order_id_fkey",
                        column: x => x._fk_order_id,
                        principalTable: "orders",
                        principalColumn: "_pk_order_id");
                });

            migrationBuilder.CreateTable(
                name: "shipments",
                columns: table => new
                {
                    _pk_shipment_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValueSql: "('ship'::text || (gen_random_uuid())::text)"),
                    status = table.Column<int>(type: "integer", nullable: false),
                    _fk_order_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    courier = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    tracking_number = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    shipped_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    delivered_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("shipments_pkey", x => x._pk_shipment_id);
                    table.ForeignKey(
                        name: "shipments__fk_order_id_fkey",
                        column: x => x._fk_order_id,
                        principalTable: "orders",
                        principalColumn: "_pk_order_id");
                });

            migrationBuilder.CreateTable(
                name: "reviews",
                columns: table => new
                {
                    _pk_review_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValueSql: "('rvw'::text || (gen_random_uuid())::text)"),
                    _fk_product_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    _fk_user_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    _fk_order_item_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    rating = table.Column<int>(type: "integer", nullable: false),
                    body = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("reviews_pkey", x => x._pk_review_id);
                    table.ForeignKey(
                        name: "reviews__fk_order_item_id_fkey",
                        column: x => x._fk_order_item_id,
                        principalTable: "order_items",
                        principalColumn: "_pk_order_item_id");
                    table.ForeignKey(
                        name: "reviews__fk_product_id_fkey",
                        column: x => x._fk_product_id,
                        principalTable: "products",
                        principalColumn: "_pk_product_id");
                    table.ForeignKey(
                        name: "reviews__fk_user_id_fkey",
                        column: x => x._fk_user_id,
                        principalTable: "users",
                        principalColumn: "_pk_user_id");
                });

            migrationBuilder.CreateIndex(
                name: "idx_user_id_adr",
                table: "addresses",
                column: "_fk_user_id");

            migrationBuilder.CreateIndex(
                name: "idx_user_id_logs",
                table: "audit_logs",
                column: "_fk_user_id");

            migrationBuilder.CreateIndex(
                name: "idx_unique_variant",
                table: "cart_items",
                columns: new[] { "_fk_cart_id", "_fk_product_variant_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cart_items__fk_product_variant_id",
                table: "cart_items",
                column: "_fk_product_variant_id");

            migrationBuilder.CreateIndex(
                name: "carts_session_token_key",
                table: "carts",
                column: "session_token");

            migrationBuilder.CreateIndex(
                name: "IX_carts__fk_user_id",
                table: "carts",
                column: "_fk_user_id");

            migrationBuilder.CreateIndex(
                name: "categories_slug_key",
                table: "categories",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_categories__fk_parent_category_id",
                table: "categories",
                column: "_fk_parent_category_id");

            migrationBuilder.CreateIndex(
                name: "IX_collection_products__fk_collection_id",
                table: "collection_products",
                column: "_fk_collection_id");

            migrationBuilder.CreateIndex(
                name: "IX_collection_products__fk_product_id",
                table: "collection_products",
                column: "_fk_product_id");

            migrationBuilder.CreateIndex(
                name: "collections_slug_key",
                table: "collections",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_order_id",
                table: "order_items",
                column: "_fk_order_id");

            migrationBuilder.CreateIndex(
                name: "idx_variant_id",
                table: "order_items",
                column: "_fk_product_variant_id");

            migrationBuilder.CreateIndex(
                name: "idx_order_id_history",
                table: "order_status_history",
                column: "_fk_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_order_status_history_changed_by",
                table: "order_status_history",
                column: "changed_by");

            migrationBuilder.CreateIndex(
                name: "idx_placed_at",
                table: "orders",
                column: "placed_at");

            migrationBuilder.CreateIndex(
                name: "idx_user_id_orders",
                table: "orders",
                column: "_fk_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_orders__fk_billing_address_id",
                table: "orders",
                column: "_fk_billing_address_id");

            migrationBuilder.CreateIndex(
                name: "IX_orders__fk_promo_code_id",
                table: "orders",
                column: "_fk_promo_code_id");

            migrationBuilder.CreateIndex(
                name: "IX_orders__fk_shipping_address_id",
                table: "orders",
                column: "_fk_shipping_address_id");

            migrationBuilder.CreateIndex(
                name: "orders_order_number_key",
                table: "orders",
                column: "order_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_order_id_payments",
                table: "payments",
                column: "_fk_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_product_images__fk_product_id",
                table: "product_images",
                column: "_fk_product_id");

            migrationBuilder.CreateIndex(
                name: "IX_product_images__fk_variant_id",
                table: "product_images",
                column: "_fk_variant_id");

            migrationBuilder.CreateIndex(
                name: "idx_product_id_variants",
                table: "product_variants",
                column: "_fk_product_id");

            migrationBuilder.CreateIndex(
                name: "idx_unique_variant_combo",
                table: "product_variants",
                columns: new[] { "_fk_product_id", "_fk_size_id", "_fk_color_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_product_variants__fk_color_id",
                table: "product_variants",
                column: "_fk_color_id");

            migrationBuilder.CreateIndex(
                name: "IX_product_variants__fk_size_id",
                table: "product_variants",
                column: "_fk_size_id");

            migrationBuilder.CreateIndex(
                name: "product_variants_sku_key",
                table: "product_variants",
                column: "sku",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_category_id",
                table: "products",
                column: "_fk_category_id");

            migrationBuilder.CreateIndex(
                name: "idx_product_name",
                table: "products",
                column: "product_name");

            migrationBuilder.CreateIndex(
                name: "products_display_id_key",
                table: "products",
                column: "display_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "products_slug_key",
                table: "products",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "promo_codes_promocode_key",
                table: "promo_codes",
                column: "promocode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_product_id_reviews",
                table: "reviews",
                column: "_fk_product_id");

            migrationBuilder.CreateIndex(
                name: "idx_unique_review_order_item",
                table: "reviews",
                columns: new[] { "_fk_user_id", "_fk_order_item_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_reviews__fk_order_item_id",
                table: "reviews",
                column: "_fk_order_item_id");

            migrationBuilder.CreateIndex(
                name: "idx_order_id_shipment",
                table: "shipments",
                column: "_fk_order_id");

            migrationBuilder.CreateIndex(
                name: "idx_tracking_number",
                table: "shipments",
                column: "tracking_number");

            migrationBuilder.CreateIndex(
                name: "sizes_label_key",
                table: "sizes",
                column: "label",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "users_user_email_key",
                table: "users",
                column: "user_email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_wishlist_items__fk_prouduct_id",
                table: "wishlist_items",
                column: "_fk_prouduct_id");

            migrationBuilder.CreateIndex(
                name: "IX_wishlist_items__fk_user_id",
                table: "wishlist_items",
                column: "_fk_user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "cart_items");

            migrationBuilder.DropTable(
                name: "collection_products");

            migrationBuilder.DropTable(
                name: "order_status_history");

            migrationBuilder.DropTable(
                name: "payments");

            migrationBuilder.DropTable(
                name: "product_images");

            migrationBuilder.DropTable(
                name: "reviews");

            migrationBuilder.DropTable(
                name: "shipments");

            migrationBuilder.DropTable(
                name: "wishlist_items");

            migrationBuilder.DropTable(
                name: "carts");

            migrationBuilder.DropTable(
                name: "collections");

            migrationBuilder.DropTable(
                name: "order_items");

            migrationBuilder.DropTable(
                name: "orders");

            migrationBuilder.DropTable(
                name: "product_variants");

            migrationBuilder.DropTable(
                name: "addresses");

            migrationBuilder.DropTable(
                name: "promo_codes");

            migrationBuilder.DropTable(
                name: "colors");

            migrationBuilder.DropTable(
                name: "products");

            migrationBuilder.DropTable(
                name: "sizes");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "categories");

            migrationBuilder.DropSequence(
                name: "product_display_seq");
        }
    }
}
