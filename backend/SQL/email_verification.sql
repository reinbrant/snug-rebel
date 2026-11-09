-- Run before deploying email verification. Safe to run again.
-- Existing accounts keep access; only new registrations require verification.
BEGIN;

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS email_verified_at timestamp without time zone,
    ADD COLUMN IF NOT EXISTS email_verification_required boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.email_verifications (
    _fk_user_id varchar(60) PRIMARY KEY REFERENCES public.users (_pk_user_id) ON DELETE CASCADE,
    email varchar(255) NOT NULL,
    token_hash varchar(64) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    sent_at timestamp without time zone NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_email_verifications_token_hash
    ON public.email_verifications (token_hash);

COMMIT;
