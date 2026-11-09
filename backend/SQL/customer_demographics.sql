-- Run in Neon before deploying demographic collection. Safe to repeat.
BEGIN;
CREATE TABLE IF NOT EXISTS public.customer_demographics (
    _fk_user_id varchar(40) PRIMARY KEY REFERENCES public.users (_pk_user_id) ON DELETE CASCADE,
    age_range varchar(20) NULL,
    gender varchar(20) NULL,
    updated_at timestamp without time zone NOT NULL,
    CONSTRAINT ck_demographics_age CHECK (age_range IS NULL OR age_range IN ('under18', '18-24', '25-34', '35-44', '45-54', '55+')),
    CONSTRAINT ck_demographics_gender CHECK (gender IS NULL OR gender IN ('woman', 'man', 'nonbinary', 'another'))
);
COMMIT;
