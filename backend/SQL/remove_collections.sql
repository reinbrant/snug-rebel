-- Removes the retired collection feature and its product associations.
-- Product records are preserved. RESTRICT stops on unexpected dependencies.
BEGIN;

DROP TABLE IF EXISTS public.collection_products RESTRICT;
DROP TABLE IF EXISTS public.collections RESTRICT;

COMMIT;
