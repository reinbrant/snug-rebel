-- Analytics demonstration data, version 1. Run the WHOLE file in the Neon SQL editor.
-- Prerequisite: customer_demographics.sql and the existing application schema.
-- Undo: analytics_demo_cleanup.sql. Existing rows are never updated or adopted.
-- These orders intentionally use is_test=false because analytics excludes test orders.
-- They count toward reports until cleanup. Demo accounts are disabled; no emails are sent.
BEGIN;
SELECT pg_advisory_xact_lock(731842091);

-- Retain this exact record manifest until cleanup. Fingerprints prevent cleanup from
-- deleting rows that someone has edited or repurposed since this insertion.
CREATE TABLE IF NOT EXISTS public.snug_analytics_demo_v1_manifest (
    entity text NOT NULL CHECK (entity IN ('users', 'addresses', 'customer_demographics', 'orders', 'payments')),
    record_id varchar(64) NOT NULL,
    row_fingerprint text NOT NULL,
    PRIMARY KEY (entity, record_id)
);

DO $guard$
BEGIN
    IF EXISTS (SELECT 1 FROM public.snug_analytics_demo_v1_manifest) THEN
        RAISE EXCEPTION 'Analytics demo is already installed. Run analytics_demo_cleanup.sql before refreshing it. No changes have been made.';
    END IF;
    IF to_regclass('public.customer_demographics') IS NULL THEN
        RAISE EXCEPTION 'Run customer_demographics.sql first.';
    END IF;
END;
$guard$;

CREATE TEMP TABLE analytics_demo_dates ON COMMIT DROP AS
SELECT (current_timestamp AT TIME ZONE 'Asia/Manila')::date AS today,
       (date_trunc('month', current_timestamp AT TIME ZONE 'Asia/Manila') - interval '26 months')::date AS first_day;

-- 60 disabled synthetic accounts. The reserved .invalid domain cannot deliver mail.
-- No ON CONFLICT clause: any ID/email collision aborts and rolls back the entire seed.
WITH inserted AS (
    INSERT INTO public.users
        (_pk_user_id, role, user_email, password_hash, first_name, last_name,
         phone_number, is_active, email_verification_required, email_verified_at, created_at, updated_at)
    SELECT 'srda_v1_u_' || lpad(n::text, 3, '0'), 0,
           'analytics-demo-' || lpad(n::text, 3, '0') || '@example.invalid',
           '!ANALYTICS_DEMO_NO_LOGIN!', 'Demo ' || n, 'Analytics fixture',
           '0000000000', false, false, NULL,
           first_day::timestamp - interval '1 day 8 hours',
           current_timestamp AT TIME ZONE 'UTC'
    FROM generate_series(1, 60) AS numbers(n) CROSS JOIN analytics_demo_dates
    RETURNING *
)
INSERT INTO public.snug_analytics_demo_v1_manifest
SELECT 'users', _pk_user_id, md5(to_jsonb(inserted)::text) FROM inserted;

-- Three quarters of the registered accounts share at least one optional answer.
WITH inserted AS (
    INSERT INTO public.customer_demographics (_fk_user_id, age_range, gender, updated_at)
    SELECT 'srda_v1_u_' || lpad(n::text, 3, '0'),
           CASE WHEN n % 7 = 0 THEN NULL ELSE
               (ARRAY['18-24','18-24','25-34','25-34','35-44','45-54','55+','under18'])[1 + n % 8] END,
           CASE WHEN n % 5 = 0 AND n % 7 <> 0 THEN NULL ELSE
               (ARRAY['woman','man','woman','man','nonbinary','another'])[1 + n % 6] END,
           current_timestamp AT TIME ZONE 'UTC'
    FROM generate_series(1, 60) AS numbers(n)
    WHERE n % 4 <> 0
    RETURNING *
)
INSERT INTO public.snug_analytics_demo_v1_manifest
SELECT 'customer_demographics', _fk_user_id, md5(to_jsonb(inserted)::text) FROM inserted;

-- Registered addresses 1–60 and separate guest addresses 61–72.
-- Geographic concentration makes the regional recommendation visible.
WITH inserted AS (
    INSERT INTO public.addresses
        (_pk_address_id, _fk_user_id, recipient_name, phone, line1, barangay,
         city, province, postal_code, country, is_default, address_type, created_at, updated_at)
    SELECT 'srda_v1_a_' || lpad(n::text, 3, '0'),
           CASE WHEN n <= 60 THEN 'srda_v1_u_' || lpad(n::text, 3, '0') ELSE NULL END,
           'Analytics demo recipient ' || n, '0000000000', 'DEMO ONLY - no delivery', 'Demo barangay',
           CASE WHEN n % 10 < 6 THEN 'Cebu City' WHEN n % 10 < 8 THEN 'Quezon City' WHEN n % 10 = 8 THEN 'Davao City' ELSE 'Iloilo City' END,
           CASE WHEN n % 10 < 6 THEN 'Cebu' WHEN n % 10 < 8 THEN 'Metro Manila' WHEN n % 10 = 8 THEN 'Davao del Sur' ELSE 'Iloilo' END,
           '0000', 'PH', false, 0,
           first_day::timestamp - interval '1 day 8 hours', current_timestamp AT TIME ZONE 'UTC'
    FROM generate_series(1, 72) AS numbers(n) CROSS JOIN analytics_demo_dates
    RETURNING *
)
INSERT INTO public.snug_analytics_demo_v1_manifest
SELECT 'addresses', _pk_address_id, md5(to_jsonb(inserted)::text) FROM inserted;

-- Daily orders through yesterday in Philippine time, with December/November peaks,
-- a smaller March/April rise, weekends, gradual growth, and occasional zero-sale days.
CREATE TEMP TABLE analytics_demo_sales ON COMMIT DROP AS
WITH calendar AS (
    SELECT first_day + day_offset AS sale_day, day_offset
    FROM analytics_demo_dates
    CROSS JOIN LATERAL generate_series(0, today - first_day - 1) AS offsets(day_offset)
), demand AS (
    SELECT *, CASE WHEN day_offset % 31 = 17 THEN 0 ELSE
        CASE extract(month FROM sale_day)::int WHEN 12 THEN 7 WHEN 11 THEN 4 WHEN 3 THEN 3 WHEN 4 THEN 3 ELSE 2 END
        + CASE WHEN extract(isodow FROM sale_day) IN (6, 7) THEN 1 ELSE 0 END END AS order_count
    FROM calendar
)
SELECT sale_day, day_offset, slot,
       1 + (day_offset * 7 + slot * 13) % 60 AS customer_no,
       slot % 5 = 0 AS is_guest,
       round((650 + ((day_offset * 37 + slot * 113) % 1400)) * (1 + day_offset::numeric / 365 * 0.12), 2) AS subtotal,
       CASE WHEN (day_offset + slot) % 6 = 0 THEN 100 ELSE 0 END AS discount,
       sale_day::timestamp + make_interval(hours => 9 + slot % 10, mins => slot * 7 % 60) - interval '8 hours' AS placed_at
FROM demand CROSS JOIN LATERAL generate_series(1, order_count) AS slots(slot);

WITH inserted AS (
    INSERT INTO public.orders
        (_pk_order_id, order_number, _fk_user_id, _fk_shipping_address_id,
         contact_email, contact_phone, subtotal, discount_amount, shipping_fee,
         shipping_discount, total_amount, status, customer_note, idempotency_key,
         is_test, placed_at, updated_at)
    SELECT 'srda_v1_o_' || to_char(sale_day, 'YYYYMMDD') || '_' || lpad(slot::text, 2, '0'),
           'DEMOA1-' || to_char(sale_day, 'YYYYMMDD') || '-' || lpad(slot::text, 2, '0'),
           CASE WHEN is_guest THEN NULL ELSE 'srda_v1_u_' || lpad(customer_no::text, 3, '0') END,
           'srda_v1_a_' || lpad((CASE WHEN is_guest THEN 61 + day_offset % 12 ELSE customer_no END)::text, 3, '0'),
           CASE WHEN is_guest THEN 'analytics-guest-' || (day_offset % 20)::text || '@example.invalid'
                ELSE 'analytics-demo-' || lpad(customer_no::text, 3, '0') || '@example.invalid' END,
           '0000000000', subtotal, discount, 120, 0, subtotal - discount + 120,
           CASE WHEN sale_day >= dates.today - 3 THEN 1 ELSE 4 END, -- Paid / Delivered
           'SNUG_ANALYTICS_DEMO_V1 - synthetic; remove with analytics_demo_cleanup.sql',
           'analytics-demo-v1-' || to_char(sale_day, 'YYYYMMDD') || '-' || slot,
           false, placed_at, placed_at
    FROM analytics_demo_sales CROSS JOIN analytics_demo_dates AS dates
    RETURNING *
)
INSERT INTO public.snug_analytics_demo_v1_manifest
SELECT 'orders', _pk_order_id, md5(to_jsonb(inserted)::text) FROM inserted;

WITH inserted AS (
    INSERT INTO public.payments
        (_pk_payment_id, _fk_order_id, amount, provider_reference, paid_at, created_at, method, status)
    SELECT 'srda_v1_p_' || to_char(sale_day, 'YYYYMMDD') || '_' || lpad(slot::text, 2, '0'),
           'srda_v1_o_' || to_char(sale_day, 'YYYYMMDD') || '_' || lpad(slot::text, 2, '0'),
           subtotal - discount + 120, 'SNUG_ANALYTICS_DEMO_V1', placed_at, placed_at, 0, 2 -- COD / Paid
    FROM analytics_demo_sales
    RETURNING *
)
INSERT INTO public.snug_analytics_demo_v1_manifest
SELECT 'payments', _pk_payment_id, md5(to_jsonb(inserted)::text) FROM inserted;

-- Confirm the inserted record counts before the transaction finishes.
SELECT entity, count(*) AS demo_rows
FROM public.snug_analytics_demo_v1_manifest GROUP BY entity ORDER BY entity;
COMMIT;
