-- Apply before deploying enhanced auditing. Preserves historical rows. Safe to repeat.
BEGIN;
ALTER TABLE public.audit_logs
    ALTER COLUMN _fk_user_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS action_type varchar(40) NOT NULL DEFAULT 'Legacy',
    ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS entity_type varchar(60),
    ADD COLUMN IF NOT EXISTS entity_id varchar(100),
    ADD COLUMN IF NOT EXISTS actor_name varchar(220) NOT NULL DEFAULT 'Unknown',
    ADD COLUMN IF NOT EXISTS actor_role varchar(40) NOT NULL DEFAULT 'Unknown',
    ADD COLUMN IF NOT EXISTS changes text,
    ADD COLUMN IF NOT EXISTS request_id varchar(100);
UPDATE public.audit_logs SET action_type = 'Authentication',
    description = CASE action WHEN 'LOGIN' THEN 'Signed in (historical record; sign-in method was not captured).'
        WHEN 'PASSWORD_RESET' THEN 'Reset account password (historical record).'
        ELSE description END
WHERE action_type = 'Legacy' AND action IN ('LOGIN', 'PASSWORD_RESET');
UPDATE public.audit_logs a SET actor_name = left(trim(u.first_name || ' ' || u.last_name), 220),
    actor_role = CASE u.role WHEN 0 THEN 'Customer' WHEN 1 THEN 'Admin' WHEN 2 THEN 'Staff' ELSE 'Unknown' END
FROM public.users u WHERE a._fk_user_id = u._pk_user_id AND a.actor_name = 'Unknown';
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs (action_type);
COMMIT;
