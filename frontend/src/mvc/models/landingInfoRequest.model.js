import { sb } from '../../services/supabase';

const NOTIFY_FUNCTION = 'send-landing-info-request';

export async function submitLandingInfoRequest(payload) {
  const { data, error } = await sb.rpc('submit_landing_info_request', {
    p_nombre: payload.nombre?.trim() || '',
    p_email: payload.email?.trim() || '',
    p_iglesia: payload.iglesia?.trim() || null,
    p_telefono: payload.telefono?.trim() || null,
    p_mensaje: payload.mensaje?.trim() || null,
    p_idioma: payload.idioma || 'es',
  });

  if (error) {
    const missingRpc =
      error.message?.includes('submit_landing_info_request') ||
      error.message?.includes('Could not find the function') ||
      error.code === 'PGRST202';

    if (missingRpc) {
      return {
        data: null,
        error: new Error('LANDING_INFO_REQUESTS_NOT_CONFIGURED'),
      };
    }

    return { data, error };
  }

  try {
    await sb.functions.invoke(NOTIFY_FUNCTION, {
      body: {
        request_id: data,
        nombre: payload.nombre?.trim(),
        email: payload.email?.trim(),
        iglesia: payload.iglesia?.trim() || null,
        telefono: payload.telefono?.trim() || null,
        mensaje: payload.mensaje?.trim(),
        idioma: payload.idioma || 'es',
      },
    });
  } catch {
    /* DB save succeeded; email is best-effort if the edge function is not deployed */
  }

  return { data, error: null };
}
