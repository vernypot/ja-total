-- Create labels table for storing custom translations in database
CREATE TABLE IF NOT EXISTS public.system_labels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  label_key character varying NOT NULL UNIQUE,
  label_es character varying NOT NULL,
  label_en character varying NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT system_labels_pkey PRIMARY KEY (id)
);

-- Create RLS policies for labels table
ALTER TABLE public.system_labels ENABLE ROW LEVEL SECURITY;

-- Superadmin can read and modify all labels
CREATE POLICY labels_superadmin_all ON public.system_labels
  FOR ALL
  USING (es_super_admin())
  WITH CHECK (es_super_admin());

-- Regular users can only read labels
CREATE POLICY labels_user_read ON public.system_labels
  FOR SELECT
  TO public
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_labels_key ON public.system_labels(label_key);
CREATE INDEX idx_labels_created ON public.system_labels(created_at DESC);
