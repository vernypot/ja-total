-- Replace legacy "JA Total" branding with Teófila in landing CMS content.
-- Run in Supabase Dashboard → SQL Editor (safe to re-run).

UPDATE public.landing_sections
SET
  eyebrow_es = REPLACE(eyebrow_es, 'JA Total', 'Teófila'),
  eyebrow_en = REPLACE(eyebrow_en, 'JA Total', 'Teofila'),
  title_es = REPLACE(title_es, 'JA Total', 'Teófila'),
  title_en = REPLACE(title_en, 'JA Total', 'Teofila'),
  body_es = REPLACE(body_es, 'JA Total', 'Teófila'),
  body_en = REPLACE(body_en, 'JA Total', 'Teofila'),
  cta_text_es = REPLACE(cta_text_es, 'JA Total', 'Teófila'),
  cta_text_en = REPLACE(cta_text_en, 'JA Total', 'Teofila'),
  updated_at = now()
WHERE eyebrow_es ILIKE '%JA Total%'
   OR eyebrow_en ILIKE '%JA Total%'
   OR title_es ILIKE '%JA Total%'
   OR title_en ILIKE '%JA Total%'
   OR body_es ILIKE '%JA Total%'
   OR body_en ILIKE '%JA Total%'
   OR cta_text_es ILIKE '%JA Total%'
   OR cta_text_en ILIKE '%JA Total%';

UPDATE public.landing_items
SET
  content_es = REPLACE(content_es::text, 'JA Total', 'Teófila')::jsonb,
  content_en = REPLACE(content_en::text, 'JA Total', 'Teofila')::jsonb,
  updated_at = now()
WHERE content_es::text ILIKE '%JA Total%'
   OR content_en::text ILIKE '%JA Total%';
