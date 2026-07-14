-- =============================================================================
-- Migrate clase requisito tags from per-clase to global (shared library)
-- Run in Supabase Dashboard → SQL Editor AFTER CLASE_REQUISITO_TAGS_SCHEMA.sql
-- Safe to run once; skips steps if clase_id column is already removed.
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clase_requisito_tags'
      AND column_name = 'clase_id'
  ) THEN
    -- Point duplicate tag links at the canonical tag (oldest per name).
    WITH ranked AS (
      SELECT
        id,
        lower(trim(nombre)) AS nombre_key,
        first_value(id) OVER (
          PARTITION BY lower(trim(nombre))
          ORDER BY created_at, id
        ) AS canonical_id,
        row_number() OVER (
          PARTITION BY lower(trim(nombre))
          ORDER BY created_at, id
        ) AS rn
      FROM public.clase_requisito_tags
    )
    UPDATE public.clase_requisito_tag_links l
    SET tag_id = r.canonical_id
    FROM ranked r
    WHERE l.tag_id = r.id
      AND r.id <> r.canonical_id;

    -- Remove duplicate links after merge.
    DELETE FROM public.clase_requisito_tag_links a
    USING public.clase_requisito_tag_links b
    WHERE a.requisito_id = b.requisito_id
      AND a.tag_id = b.tag_id
      AND a.ctid < b.ctid;

    -- Delete duplicate tag rows.
    WITH ranked AS (
      SELECT
        id,
        row_number() OVER (
          PARTITION BY lower(trim(nombre))
          ORDER BY created_at, id
        ) AS rn
      FROM public.clase_requisito_tags
    )
    DELETE FROM public.clase_requisito_tags t
    USING ranked r
    WHERE t.id = r.id
      AND r.rn > 1;

    DROP INDEX IF EXISTS public.idx_clase_requisito_tags_clase_nombre_lower;
    DROP INDEX IF EXISTS public.idx_clase_requisito_tags_clase;

    ALTER TABLE public.clase_requisito_tags
      DROP CONSTRAINT IF EXISTS clase_requisito_tags_clase_id_fkey;

    ALTER TABLE public.clase_requisito_tags
      DROP COLUMN clase_id;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clase_requisito_tags_nombre_lower
  ON public.clase_requisito_tags (lower(trim(nombre)));

COMMENT ON TABLE public.clase_requisito_tags IS
  'Free-form tags for progressive class requirements. Shared across all clases progresivas.';
