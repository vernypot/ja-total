import { sb } from '../../services/supabase';

const DATA_FIELDS = [
  'tipo_sangre',
  'factor_rh',
  'aseguradora',
  'alergias',
  'medicamentos',
  'enfermedades',
  'observaciones',
];

const READ_ALIASES = {
  aseguradora: ['aseguradora', 'eps', 'entidad_eps', 'entidad_salud'],
};

function isMissingColumnError(error) {
  const msg = error?.message || '';
  return msg.includes('does not exist') || msg.includes('Could not find');
}

function missingColumnFromError(error) {
  const match = (error?.message || '').match(/Could not find the '([^']+)' column/);
  return match?.[1] || null;
}

function isRlsError(error) {
  const msg = error?.message || '';
  return msg.includes('row-level security') || msg.includes('permission denied');
}

function trimOrNull(value) {
  const trimmed = (value ?? '').toString().trim();
  return trimmed || null;
}

function pickFirst(row, keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value != null && String(value).trim() !== '') return value;
  }
  return null;
}

export function normalizeDatosMedicosRecord(row) {
  if (!row) return null;

  const normalized = { ...row };
  for (const [formKey, aliases] of Object.entries(READ_ALIASES)) {
    normalized[formKey] = pickFirst(row, [formKey, ...aliases]);
  }
  return normalized;
}

function buildPayload(miembroId, data) {
  const payload = { miembro_id: miembroId };

  for (const key of DATA_FIELDS) {
    payload[key] = trimOrNull(data[key]);
  }

  return payload;
}

async function writePayload(payload, existingId) {
  let current = { ...payload };

  for (let attempt = 0; attempt < DATA_FIELDS.length + 2; attempt += 1) {
    const result = existingId
      ? await sb.from('miembro_datos_medicos').update(current).eq('id', existingId)
      : await sb.from('miembro_datos_medicos').insert([current]);

    if (!result.error) return result;

    const missingColumn = missingColumnFromError(result.error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(current, missingColumn)) {
      delete current[missingColumn];
      continue;
    }

    return result;
  }

  return { data: null, error: new Error('Unable to save medical data') };
}

export async function fetchDatosMedicosByMiembro(miembroId) {
  const { data, error } = await sb
    .from('miembro_datos_medicos')
    .select('*')
    .eq('miembro_id', miembroId)
    .maybeSingle();

  if (error) return { data: null, error };
  return { data: normalizeDatosMedicosRecord(data), error: null };
}

async function saveViaRpc(miembroId, data, recordId) {
  return sb.rpc('admin_save_miembro_datos_medicos', {
    p_miembro_id: miembroId,
    p_tipo_sangre: data.tipo_sangre || '',
    p_factor_rh: data.factor_rh || '',
    p_alergias: data.alergias || '',
    p_medicamentos: data.medicamentos || '',
    p_enfermedades: data.enfermedades || '',
    p_observaciones: data.observaciones || '',
    p_aseguradora: data.aseguradora || '',
    p_record_id: recordId || null,
  });
}

export async function upsertDatosMedicos(miembroId, data, existingId) {
  const payload = buildPayload(miembroId, data);
  const direct = await writePayload(payload, existingId);

  if (!direct.error) return direct;
  if (!isRlsError(direct.error) && !isMissingColumnError(direct.error)) return direct;

  const rpc = await saveViaRpc(miembroId, data, existingId);
  if (!rpc.error) return rpc;
  if (isMissingColumnError(rpc.error)) {
    return writePayload(payload, existingId);
  }
  return rpc;
}
