-- Run after email_otp.sql, before deploying password recovery. Safe to repeat.
BEGIN;
ALTER TABLE public.email_otps DROP CONSTRAINT IF EXISTS email_otps_purpose_check;
ALTER TABLE public.email_otps ADD CONSTRAINT email_otps_purpose_check
    CHECK (purpose IN ('verification', 'sign-in', 'password-reset'));
COMMIT;
