import { sb } from '../../services/supabase';

export async function fetchContactosByMiembro(miembroId) {
  return sb.from('miembro_contactos').select('*').eq('miembro_id', miembroId);
}
