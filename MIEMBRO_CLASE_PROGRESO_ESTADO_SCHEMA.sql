-- =============================================================================
-- Member progressive class: per-member progress status
-- Run in Supabase Dashboard → SQL Editor after MIEMBRO_CLASE_PROGRESIVA_COMPLETION_SCHEMA.sql
-- =============================================================================

ALTER TABLE public.miembro_clase_progresiva
  ADD COLUMN IF NOT EXISTS estado_progreso VARCHAR(20) NOT NULL DEFAULT 'sin_iniciar';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'miembro_clase_progresiva_estado_progreso_check'
  ) THEN
    ALTER TABLE public.miembro_clase_progresiva
      ADD CONSTRAINT miembro_clase_progresiva_estado_progreso_check
      CHECK (estado_progreso IN (
        'sin_iniciar',
        'en_progreso',
        'incompleta',
        'completada',
        'investida'
      ));
  END IF;
END $$;

UPDATE public.miembro_clase_progresiva
SET estado_progreso = 'investida'
WHERE tiene_investidura = true
  AND estado_progreso = 'sin_iniciar';

UPDATE public.miembro_clase_progresiva
SET estado_progreso = 'completada'
WHERE completado = true
  AND coalesce(tiene_investidura, false) = false
  AND estado_progreso = 'sin_iniciar';

CREATE INDEX IF NOT EXISTS idx_miembro_clase_progresiva_estado_progreso
  ON public.miembro_clase_progresiva (estado_progreso);

COMMENT ON COLUMN public.miembro_clase_progresiva.estado_progreso IS
  'Member progress on this class: sin_iniciar, en_progreso, incompleta, completada, investida.';

-- Extend progress RPC to persist estado_progreso and keep legacy flags in sync
CREATE OR REPLACE FUNCTION public.update_miembro_clase_progresiva_progress(
  p_assignment_id UUID,
  p_completado BOOLEAN DEFAULT false,
  p_fecha_completado DATE DEFAULT NULL,
  p_tiene_investidura BOOLEAN DEFAULT false,
  p_investidura_fecha DATE DEFAULT NULL,
  p_investidura_lugar TEXT DEFAULT NULL,
  p_investidura_validado_por_usuario_id UUID DEFAULT NULL,
  p_investidura_validado_por_nombre TEXT DEFAULT NULL,
  p_estado_progreso TEXT DEFAULT NULL
)
RETURNS public.miembro_clase_progresiva
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  v_estado_progreso TEXT;
  result public.miembro_clase_progresiva;
BEGIN
  SELECT miembro_id INTO v_miembro_id
  FROM public.miembro_clase_progresiva
  WHERE id = p_assignment_id;

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'class assignment not found';
  END IF;

  IF NOT public.user_can_manage_miembro(v_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for update_miembro_clase_progresiva_progress';
  END IF;

  v_estado_progreso := nullif(trim(coalesce(p_estado_progreso, '')), '');

  IF v_estado_progreso IS NOT NULL THEN
    IF v_estado_progreso NOT IN ('sin_iniciar', 'en_progreso', 'incompleta', 'completada', 'investida') THEN
      RAISE EXCEPTION 'invalid estado_progreso';
    END IF;

    CASE v_estado_progreso
      WHEN 'investida' THEN
        p_completado := true;
        p_tiene_investidura := true;
      WHEN 'completada' THEN
        p_completado := true;
        p_tiene_investidura := false;
      ELSE
        p_completado := false;
        p_tiene_investidura := false;
    END CASE;
  ELSE
    IF p_tiene_investidura THEN
      v_estado_progreso := 'investida';
      p_completado := true;
    ELSIF p_completado THEN
      v_estado_progreso := 'completada';
    ELSE
      v_estado_progreso := 'sin_iniciar';
    END IF;
  END IF;

  IF p_completado AND p_fecha_completado IS NULL THEN
    p_fecha_completado := CURRENT_DATE;
  END IF;

  IF NOT p_completado THEN
    p_fecha_completado := NULL;
  END IF;

  IF NOT p_tiene_investidura THEN
    p_investidura_fecha := NULL;
    p_investidura_lugar := NULL;
    p_investidura_validado_por_usuario_id := NULL;
    p_investidura_validado_por_nombre := NULL;
  ELSIF p_investidura_fecha IS NULL THEN
    p_investidura_fecha := CURRENT_DATE;
  END IF;

  UPDATE public.miembro_clase_progresiva
  SET
    estado_progreso = v_estado_progreso,
    completado = p_completado,
    fecha_completado = p_fecha_completado,
    tiene_investidura = p_tiene_investidura,
    investidura_fecha = p_investidura_fecha,
    investidura_lugar = nullif(trim(coalesce(p_investidura_lugar, '')), ''),
    investidura_validado_por_usuario_id = p_investidura_validado_por_usuario_id,
    investidura_validado_por_nombre = nullif(trim(coalesce(p_investidura_validado_por_nombre, '')), '')
  WHERE id = p_assignment_id
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'class assignment not found';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_miembro_clase_progresiva_progress(
  UUID, BOOLEAN, DATE, BOOLEAN, DATE, TEXT, UUID, TEXT, TEXT
) TO authenticated;

-- Default sin_iniciar on assign / reactivate
CREATE OR REPLACE FUNCTION public.admin_assign_miembro_clase(
  p_miembro_id UUID,
  p_clase_id UUID
)
RETURNS public.miembro_clase_progresiva
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.miembro_clase_progresiva;
  v_has_clase_progresiva_id BOOLEAN;
BEGIN
  IF NOT public.user_can_manage_miembro(p_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_assign_miembro_clase';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'miembro_clase_progresiva'
      AND column_name = 'clase_progresiva_id'
  ) INTO v_has_clase_progresiva_id;

  IF v_has_clase_progresiva_id THEN
    SELECT * INTO result
    FROM public.miembro_clase_progresiva
    WHERE miembro_id = p_miembro_id
      AND clase_progresiva_id = p_clase_id
    ORDER BY CASE WHEN estado = 'activo' THEN 0 ELSE 1 END, id
    LIMIT 1;

    IF result.id IS NOT NULL THEN
      UPDATE public.miembro_clase_progresiva
      SET estado = 'activo'
      WHERE id = result.id
      RETURNING * INTO result;
      RETURN result;
    END IF;

    INSERT INTO public.miembro_clase_progresiva (miembro_id, clase_progresiva_id, estado, estado_progreso)
    VALUES (p_miembro_id, p_clase_id, 'activo', 'sin_iniciar')
    RETURNING * INTO result;
  ELSE
    SELECT * INTO result
    FROM public.miembro_clase_progresiva
    WHERE miembro_id = p_miembro_id
      AND clase_id = p_clase_id
    ORDER BY CASE WHEN estado = 'activo' THEN 0 ELSE 1 END, id
    LIMIT 1;

    IF result.id IS NOT NULL THEN
      UPDATE public.miembro_clase_progresiva
      SET estado = 'activo'
      WHERE id = result.id
      RETURNING * INTO result;
      RETURN result;
    END IF;

    INSERT INTO public.miembro_clase_progresiva (miembro_id, clase_id, estado, estado_progreso)
    VALUES (p_miembro_id, p_clase_id, 'activo', 'sin_iniciar')
    RETURNING * INTO result;
  END IF;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'unable to assign class to member';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_assign_miembro_clase(UUID, UUID) TO authenticated;
