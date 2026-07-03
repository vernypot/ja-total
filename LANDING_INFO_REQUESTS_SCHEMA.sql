-- ============================================
-- Landing page — visitor info request leads
-- Run in Supabase SQL editor
-- ============================================

CREATE TABLE IF NOT EXISTS public.landing_info_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  iglesia VARCHAR(255),
  telefono VARCHAR(50),
  mensaje TEXT,
  idioma VARCHAR(10) NOT NULL DEFAULT 'es',
  estado VARCHAR(20) NOT NULL DEFAULT 'nuevo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT landing_info_requests_estado_check
    CHECK (estado IN ('nuevo', 'contactado', 'cerrado'))
);

CREATE INDEX IF NOT EXISTS idx_landing_info_requests_created
  ON public.landing_info_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_landing_info_requests_estado
  ON public.landing_info_requests (estado);

ALTER TABLE public.landing_info_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS landing_info_requests_admin_select ON public.landing_info_requests;
CREATE POLICY landing_info_requests_admin_select
  ON public.landing_info_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND u.rol IN ('superadmin', 'admin')
    )
  );

CREATE OR REPLACE FUNCTION public.submit_landing_info_request(
  p_nombre TEXT,
  p_email TEXT,
  p_iglesia TEXT DEFAULT NULL,
  p_telefono TEXT DEFAULT NULL,
  p_mensaje TEXT DEFAULT NULL,
  p_idioma TEXT DEFAULT 'es'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_email TEXT;
BEGIN
  v_email := lower(trim(p_email));

  IF coalesce(trim(p_nombre), '') = '' THEN
    RAISE EXCEPTION 'nombre is required';
  END IF;

  IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid email';
  END IF;

  INSERT INTO public.landing_info_requests (nombre, email, iglesia, telefono, mensaje, idioma)
  VALUES (
    trim(p_nombre),
    v_email,
    nullif(trim(p_iglesia), ''),
    nullif(trim(p_telefono), ''),
    nullif(trim(p_mensaje), ''),
    coalesce(nullif(trim(p_idioma), ''), 'es')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_landing_info_request TO anon, authenticated;

-- Email notifications (Supabase Edge Function):
-- 1. Deploy: supabase functions deploy send-landing-info-request
-- 2. Secrets:
--      RESEND_API_KEY=<your Resend API key>
--      LANDING_INFO_TO=vernypot@gmail.com   (default if unset)
--      LANDING_INFO_FROM=Teofila <noreply@yourdomain.com>
-- Submissions are stored in landing_info_requests and emailed after save.
