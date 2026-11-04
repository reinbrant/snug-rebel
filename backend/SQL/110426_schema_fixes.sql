-- =============================================================================
-- Snug Rebel: schema fixes (PostgreSQL)
-- Run top to bottom in a transaction. Sections are independent; run Part 1 first.
-- Wishlist and collections tables are intentionally untouched.
-- This script is now the ONLY thing that changes your live database: the InitialCreate migration
-- was deleted and Program.cs uses EnsureCreated(), which never alters an existing database.
-- Re-runnable: constraints are dropped before being re-added. Back up (or branch the Neon DB) first. Part 3 contains two commands that will fail if you already have
-- duplicate carts (see the duplicate check at the start of Part 3).
-- =============================================================================

BEGIN;

-- =============================================================================
-- PART 1: varchar(40) ID overflow (widen to varchar(64))
-- Widening a varchar limit is a catalog-only change in Postgres: no table rewrite,
-- no data change. Parent column first, then the column that references it.
-- =============================================================================
ALTER TABLE order_items          ALTER COLUMN _pk_order_item_id           TYPE varchar(64);
ALTER TABLE reviews              ALTER COLUMN _fk_order_item_id           TYPE varchar(64);  -- FK to order_items PK
ALTER TABLE cart_items           ALTER COLUMN _pk_cart_item_id            TYPE varchar(64);
ALTER TABLE order_status_history ALTER COLUMN _pk_order_status_history_id TYPE varchar(64);

-- =============================================================================
-- PART 2: guest checkout + order data the app already collects but drops
-- =============================================================================
-- Guests have no users row. These two columns must allow NULL for system/guest actions.
ALTER TABLE orders               ALTER COLUMN _fk_user_id DROP NOT NULL;
ALTER TABLE order_status_history ALTER COLUMN changed_by  DROP NOT NULL;

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS contact_email      varchar(255),
    ADD COLUMN IF NOT EXISTS contact_phone      varchar(30),
    ADD COLUMN IF NOT EXISTS cash_ready_option  varchar(50),
    ADD COLUMN IF NOT EXISTS shipping_discount  numeric(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS idempotency_key    varchar(64),
    ADD COLUMN IF NOT EXISTS is_test            boolean NOT NULL DEFAULT false;

-- Every order must be traceable to a user or a guest email.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS ck_orders_owner;
ALTER TABLE orders ADD CONSTRAINT ck_orders_owner
    CHECK (_fk_user_id IS NOT NULL OR contact_email IS NOT NULL) NOT VALID;  -- VALIDATE after old rows are checked

-- Double-click / retry protection: the same key can only create one order.
CREATE UNIQUE INDEX IF NOT EXISTS ux_orders_idempotency_key
    ON orders (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Collision-free order numbers: SR-yymmdd-<nextval>
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1000;

-- Couriers become data the server prices from (the browser currently sends the fee).
CREATE TABLE IF NOT EXISTS couriers (
    _pk_courier_id varchar(40) PRIMARY KEY DEFAULT ('cour'::text || gen_random_uuid()::text),
    code           varchar(20)  NOT NULL UNIQUE,
    name           varchar(100) NOT NULL,
    fee            numeric(10,2) NOT NULL CHECK (fee >= 0),
    days_min       smallint NOT NULL CHECK (days_min >= 0),
    days_max       smallint NOT NULL,
    is_active      boolean  NOT NULL DEFAULT true,
    CONSTRAINT ck_couriers_days CHECK (days_max >= days_min)
);
ALTER TABLE shipments
    ADD COLUMN IF NOT EXISTS _fk_courier_id varchar(40) REFERENCES couriers (_pk_courier_id);
CREATE INDEX IF NOT EXISTS ix_shipments_courier ON shipments (_fk_courier_id);

-- Addresses referenced by orders can never be hard-deleted; archive them instead.
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS archived_at timestamp without time zone;

-- Product list needs real rating / review / sold numbers (currently hard-coded 5 / 0 / 0).
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS avg_rating   numeric(3,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS review_count integer      NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sold_count   integer      NOT NULL DEFAULT 0;

-- Optional: cap for percentage promo codes.
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS max_discount_amount numeric(10,2);

-- =============================================================================
-- PART 3: carts, payments, uniqueness
-- =============================================================================
-- Run this first. If it returns rows, merge or delete those duplicate carts before continuing:
--   SELECT _fk_user_id, count(*) FROM carts WHERE _fk_user_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1;
--   SELECT session_token, count(*) FROM carts WHERE session_token IS NOT NULL GROUP BY 1 HAVING count(*) > 1;

DROP INDEX IF EXISTS carts_session_token_key;   -- the old non-unique index
CREATE UNIQUE INDEX IF NOT EXISTS ux_carts_user    ON carts (_fk_user_id)   WHERE _fk_user_id   IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_carts_session ON carts (session_token) WHERE session_token IS NOT NULL;
ALTER TABLE carts DROP CONSTRAINT IF EXISTS ck_carts_owner;
ALTER TABLE carts ADD CONSTRAINT ck_carts_owner CHECK (_fk_user_id IS NOT NULL OR session_token IS NOT NULL) NOT VALID;

-- Deleting a cart removes its lines.
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items__fk_cart_id_fkey;
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items__fk_cart_id_fkey;
ALTER TABLE cart_items ADD CONSTRAINT cart_items__fk_cart_id_fkey
    FOREIGN KEY (_fk_cart_id) REFERENCES carts (_pk_cart_id) ON DELETE CASCADE;

-- One successful payment per order (PaymentStatus.Paid = 2): makes /Payment/process idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS ux_payments_one_paid
    ON payments (_fk_order_id) WHERE status = 2;

-- Case-insensitive lookups that can use an index (EF's ToLower() becomes lower(col)).
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_lower ON users (lower(user_email));
CREATE UNIQUE INDEX IF NOT EXISTS ux_promo_code_upper  ON promo_codes (upper(promocode));

-- Query-shape indexes
CREATE INDEX IF NOT EXISTS ix_orders_user_placed
    ON orders (_fk_user_id, placed_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_images_one_primary
    ON product_images (_fk_product_id) WHERE is_primary;
CREATE INDEX IF NOT EXISTS ix_product_variants_active
    ON product_variants (_fk_product_id) WHERE is_active;

-- =============================================================================
-- PART 4: CHECK constraints (NOT VALID = enforced for new writes, old rows checked later)
-- =============================================================================
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS ck_cart_items_qty;
ALTER TABLE cart_items ADD CONSTRAINT ck_cart_items_qty     CHECK (quantity > 0) NOT VALID;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS ck_order_items_qty;
ALTER TABLE order_items ADD CONSTRAINT ck_order_items_qty    CHECK (quantity > 0) NOT VALID;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS ck_order_items_price;
ALTER TABLE order_items ADD CONSTRAINT ck_order_items_price  CHECK (unit_price >= 0 AND line_total = unit_price * quantity) NOT VALID;
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS ck_variants_stock;
ALTER TABLE product_variants ADD CONSTRAINT ck_variants_stock     CHECK (stock_quantity >= 0) NOT VALID;
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS ck_variants_price;
ALTER TABLE product_variants ADD CONSTRAINT ck_variants_price     CHECK (price_override IS NULL OR price_override >= 0) NOT VALID;
ALTER TABLE products DROP CONSTRAINT IF EXISTS ck_products_price;
ALTER TABLE products ADD CONSTRAINT ck_products_price     CHECK (base_price >= 0) NOT VALID;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS ck_reviews_rating;
ALTER TABLE reviews ADD CONSTRAINT ck_reviews_rating     CHECK (rating BETWEEN 1 AND 5) NOT VALID;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS ck_payments_amount;
ALTER TABLE payments ADD CONSTRAINT ck_payments_amount    CHECK (amount >= 0) NOT VALID;
ALTER TABLE promo_codes DROP CONSTRAINT IF EXISTS ck_promo_value;
ALTER TABLE promo_codes ADD CONSTRAINT ck_promo_value        CHECK (discount_value > 0 AND times_used >= 0) NOT VALID;
ALTER TABLE promo_codes DROP CONSTRAINT IF EXISTS ck_promo_window;
ALTER TABLE promo_codes ADD CONSTRAINT ck_promo_window       CHECK (promo_end IS NULL OR promo_start IS NULL OR promo_end >= promo_start) NOT VALID;
ALTER TABLE promo_codes DROP CONSTRAINT IF EXISTS ck_promo_uses;
ALTER TABLE promo_codes ADD CONSTRAINT ck_promo_uses         CHECK (max_uses IS NULL OR times_used <= max_uses) NOT VALID;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS ck_orders_money;
ALTER TABLE orders ADD CONSTRAINT ck_orders_money       CHECK (
    subtotal >= 0 AND discount_amount >= 0 AND shipping_fee >= 0 AND shipping_discount >= 0
    AND total_amount = GREATEST(0, subtotal + shipping_fee - discount_amount)) NOT VALID;

-- =============================================================================
-- PART 5: test seed data (safe to re-run)
-- discount_type: 0 = Percentage, 1 = FixedAmount
-- =============================================================================
INSERT INTO couriers (code, name, fee, days_min, days_max) VALUES
    ('jnt',      'J&T Express',   120, 3, 5),
    ('ninjavan', 'Ninja Van',     110, 3, 5),
    ('flash',    'Flash Express', 100, 2, 4),
    ('lbc',      'LBC',           150, 1, 3)
ON CONFLICT (code) DO NOTHING;

INSERT INTO promo_codes (discount_type, promocode, description, discount_value, min_order_amount,
                         max_uses, times_used, promo_start, promo_end, is_active) VALUES
    (1, 'REBEL200',  'Fixed 200 off',                     200,   0,    NULL, 0, NULL, NULL, true),
    (1, 'SNUG100',   'Fixed 100 off',                     100,   0,    NULL, 0, NULL, NULL, true),
    (0, 'TEN-PCT',   '10% off, min 1000',                  10, 1000,    NULL, 0, NULL, NULL, true),
    (1, 'MIN5000',   'Needs 5000 subtotal (reject test)', 500, 5000,    NULL, 0, NULL, NULL, true),
    (1, 'EXPIRED',   'Ended yesterday (reject test)',     100,    0,    NULL, 0, now() - interval '30 days', now() - interval '1 day', true),
    (1, 'MAXED',     'Single use, used up (reject test)', 100,    0,       1, 1, NULL, NULL, true),
    (1, 'INACTIVE',  'Switched off (reject test)',        100,    0,    NULL, 0, NULL, NULL, false)
ON CONFLICT DO NOTHING;   -- conflicts with the unique promocode index

COMMIT;

-- After the old data is clean, validate the NOT VALID constraints one by one, e.g.:
--   ALTER TABLE orders VALIDATE CONSTRAINT ck_orders_money;
-- A failure lists nothing; find offenders with the same predicate, e.g.:
--   SELECT * FROM orders WHERE NOT (total_amount = GREATEST(0, subtotal + shipping_fee - discount_amount));
-- Note: the demo seed in dashboard_tables.sql satisfies ck_orders_money.

-- Verify Part 1:
-- SELECT table_name, column_name, character_maximum_length
-- FROM information_schema.columns
-- WHERE column_name IN ('_pk_order_item_id','_fk_order_item_id','_pk_cart_item_id','_pk_order_status_history_id');

-- =============================================================================
-- PART 6: re-baseline EF migrations (run ONLY after Part 1-5 succeeded AND you generated
-- the new InitialCreate migration with `dotnet ef migrations add InitialCreate`).
-- This tells EF "this migration is already applied" so Migrate() does not try to
-- create the tables again. Replace the id with the exact file name prefix EF generated
-- (e.g. 20261105083000_InitialCreate).
-- =============================================================================
-- CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
--     "MigrationId"    varchar(150) NOT NULL PRIMARY KEY,
--     "ProductVersion" varchar(32)  NOT NULL
-- );
-- DELETE FROM "__EFMigrationsHistory";   -- drop the stale row for the deleted migration, if the table existed
-- INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
-- VALUES ('20261105083000_InitialCreate', '10.0.13');
