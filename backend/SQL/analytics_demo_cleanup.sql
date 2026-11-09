-- Undo analytics_demo_seed.sql. Run the WHOLE file, not individual DELETE statements.
-- Deletes exact manifest-owned IDs only; never deletes by dates, email domains or wildcards.
-- If a demo row was edited, cleanup aborts without deleting anything. Inspect those edits
-- before retrying; do not delete the manifest or bypass its fingerprint checks.
BEGIN;
SELECT pg_advisory_xact_lock(731842091);

DO $cleanup$
DECLARE
    item record;
    changed boolean;
BEGIN
    IF to_regclass('public.snug_analytics_demo_v1_manifest') IS NULL THEN
        RAISE NOTICE 'No analytics demo manifest exists; nothing to remove.';
        RETURN;
    END IF;

    -- Block edits/deletes while checking and removing the fixture. Normal reads still work.
    -- Fixed lock order also makes the all-or-nothing checks consistent across tables.
    LOCK TABLE public.users, public.addresses, public.customer_demographics,
               public.orders, public.payments IN SHARE ROW EXCLUSIVE MODE;
    LOCK TABLE public.snug_analytics_demo_v1_manifest IN EXCLUSIVE MODE;

    -- Names come from this fixed allowlist, not from values supplied by the manifest.
    FOR item IN SELECT * FROM (VALUES
        ('users', '_pk_user_id'), ('addresses', '_pk_address_id'),
        ('customer_demographics', '_fk_user_id'), ('orders', '_pk_order_id'),
        ('payments', '_pk_payment_id')
    ) AS allowed(entity, pk_column)
    LOOP
        EXECUTE format(
            'SELECT EXISTS (SELECT 1 FROM public.%I AS target JOIN public.snug_analytics_demo_v1_manifest AS manifest
             ON manifest.entity = %L AND target.%I = manifest.record_id
             WHERE md5(to_jsonb(target)::text) <> manifest.row_fingerprint)',
            item.entity, item.entity, item.pk_column
        ) INTO changed;
        IF changed THEN
            RAISE EXCEPTION 'Demo rows in % were edited, or their schema changed. Cleanup cancelled; all data is unchanged. Inspect the demo records before retrying.', item.entity;
        END IF;
    END LOOP;

    -- These user dependents use ON DELETE CASCADE in the application schema. Do not
    -- silently remove newly added answers or verification records along with an account.
    FOR item IN SELECT * FROM (VALUES
        ('customer_demographics'), ('email_verifications'), ('email_otps')
    ) AS cascading(entity)
    LOOP
        IF to_regclass('public.' || item.entity) IS NOT NULL THEN
            EXECUTE format('LOCK TABLE public.%I IN SHARE ROW EXCLUSIVE MODE', item.entity);
            EXECUTE format(
                'SELECT EXISTS (SELECT 1 FROM public.%I AS related
                 JOIN public.snug_analytics_demo_v1_manifest AS parent
                   ON parent.entity = ''users'' AND parent.record_id = related._fk_user_id
                 WHERE NOT EXISTS (SELECT 1 FROM public.snug_analytics_demo_v1_manifest AS child
                   WHERE child.entity = %L AND child.record_id = related._fk_user_id))',
                item.entity, item.entity
            ) INTO changed;
            IF changed THEN
                RAISE EXCEPTION 'Unexpected related records in %. Cleanup cancelled; all data is unchanged. Inspect these records before retrying.', item.entity;
            END IF;
        END IF;
    END LOOP;

    DELETE FROM public.payments AS payment USING public.snug_analytics_demo_v1_manifest AS manifest
    WHERE manifest.entity = 'payments' AND payment._pk_payment_id = manifest.record_id;
    DELETE FROM public.orders AS orders USING public.snug_analytics_demo_v1_manifest AS manifest
    WHERE manifest.entity = 'orders' AND orders._pk_order_id = manifest.record_id;
    DELETE FROM public.customer_demographics AS profile USING public.snug_analytics_demo_v1_manifest AS manifest
    WHERE manifest.entity = 'customer_demographics' AND profile._fk_user_id = manifest.record_id;
    DELETE FROM public.addresses AS address USING public.snug_analytics_demo_v1_manifest AS manifest
    WHERE manifest.entity = 'addresses' AND address._pk_address_id = manifest.record_id;
    DELETE FROM public.users AS users USING public.snug_analytics_demo_v1_manifest AS manifest
    WHERE manifest.entity = 'users' AND users._pk_user_id = manifest.record_id;

    -- Unexpected related records cause foreign-key errors and roll back everything.
    -- No CASCADE, sequence reset, application table drop, or broad DELETE is used.
    DROP TABLE public.snug_analytics_demo_v1_manifest;
    RAISE NOTICE 'Analytics demo removed. Existing application records were preserved.';
END;
$cleanup$;
COMMIT;
