import { sb } from '../../services/supabase';

export async function fetchEspecialidadesByMiembro(miembroId) {
  return sb.from('miembro_especialidad').select('*').eq('miembro_id', miembroId);
}
