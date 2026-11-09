-- Run after email_verification.sql and before deploying OTP support. Safe to repeat.
BEGIN;
CREATE TABLE IF NOT EXISTS public.email_otps (
    _fk_user_id varchar(60) NOT NULL REFERENCES public.users (_pk_user_id) ON DELETE CASCADE,
    purpose varchar(20) NOT NULL CHECK (purpose IN ('verification', 'sign-in')),
    email varchar(255) NOT NULL,
    code_hash varchar(60) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    sent_at timestamp without time zone NOT NULL,
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
    PRIMARY KEY (_fk_user_id, purpose)
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_email_otps_email_purpose ON public.email_otps (email, purpose);
COMMIT;
