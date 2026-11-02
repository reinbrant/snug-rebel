-- MINIMAL MIGRATION: Only tables missing from your Neon database
-- Your database has 21 tables, you're missing 4
-- Run this script to complete your schema for the 3D model feature

-- ============================================================================
-- MISSING TABLE 1: dashboard_metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboard_metrics (
    _pk_dashboard_metric_id varchar(80) PRIMARY KEY DEFAULT ('dmetric_'::text || gen_random_uuid()::text),
    metric_key varchar(50) NOT NULL,
    metric_label varchar(100) NOT NULL,
    day_of_week varchar(10),
    slot_index integer,
    metric_value numeric(10,2) NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- MISSING TABLE 2: dashboard_notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboard_notifications (
    _pk_dashboard_notification_id varchar(80) PRIMARY KEY DEFAULT ('dnotif_'::text || gen_random_uuid()::text),
    order_id varchar(40) NOT NULL,
    order_number varchar(40) NOT NULL,
    category varchar(100) NOT NULL,
    weight varchar(50) NOT NULL,
    company varchar(100) NOT NULL,
    arrival_time timestamp without time zone NOT NULL,
    route varchar(150) NOT NULL,
    price numeric(12,2) NOT NULL,
    status varchar(30) NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- MISSING TABLE 3: product_3d_models ? NEW FOR 3D MODEL FEATURE
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_3d_models (
    _pk_product_3d_model_id varchar(40) PRIMARY KEY DEFAULT ('m3d'::text || gen_random_uuid()::text),
    _fk_product_id varchar(40) NOT NULL REFERENCES products(_pk_product_id) ON DELETE CASCADE,
    model_url varchar(500) NOT NULL,
    preview_image_url varchar(500),
    model_name varchar(255),
    file_size_bytes bigint NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_product_id_3d_models ON product_3d_models(_fk_product_id);

-- ============================================================================
-- OPTIONAL: Seed data for dashboard_metrics (from your existing dashboard_tables.sql)
-- ============================================================================

INSERT INTO dashboard_metrics (metric_key, metric_label, metric_value)
VALUES
    ('minimum_number', 'Minimum number', 97),
    ('average_number', 'Average number', 120),
    ('maximum_number', 'Maximum number', 259)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Tables added:
-- 1. dashboard_metrics
-- 2. dashboard_notifications
-- 3. product_3d_models (NEW - FOR 3D MODEL FEATURE)
--
-- Total tables now: 24
-- Your code expects: 25 DbSets (but DashboardMetric/Notification are optional)
-- ============================================================================
