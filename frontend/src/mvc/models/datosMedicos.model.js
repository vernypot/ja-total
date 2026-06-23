import { sb } from '../../services/supabase';

export const BLOOD_TYPES = ['A', 'B', 'AB', 'O'];
export const RH_FACTORS = ['+', '-'];

const DENOMINATIONAL_INSURANCE_EXPIRY_MONTHS = 8;

export function isDenominationalInsuranceNearExpiry(fecha) {
  if (!fecha) return false;

  const date = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(date.getTime())) return false;

  const threshold = new Date(date);
  threshold.setMonth(threshold.getMonth() + DENOMINATIONAL_INSURANCE_EXPIRY_MONTHS);

  return new Date() >= threshold;
}

const DATA_FIELDS = [
  'tipo_sangre',
  'factor_rh',
  'aseguradora',
  'poliza',
  'seguro_denominacional',
  'seguro_denominacional_fecha',
  'alergias',
  'medicamentos',
  'enfermedades',
  'observaciones',
];

const WRITE_ALIASES = {
  aseguradora: ['aseguradora', 'eps', 'entidad_eps', 'entidad_salud'],
};

const READ_ALIASES = {
  aseguradora: ['aseguradora', 'eps', 'entidad_eps', 'entidad_salud'],
  factor_rh: ['factor_rh', 'rh_factor', 'rh', 'factor_rh_sign'],
};

function isMissingColumnError(error, column) {
  const msg = error?.message || '';
  return msg.includes('does not exist')
    || msg.includes('Could not find')
    || (column && msg.includes(`'${column}' column`));
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
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function pickFirst(row, keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value != null && String(value).trim() !== '') return String(value).trim();
  }
  return null;
}

function parseCombinedBloodType(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return null;

  const match = raw.match(/^(AB|A|B|O)\s*([+-])$/);
  if (!match) return null;

  return { tipo_sangre: match[1], factor_rh: match[2] };
}

function normalizeBloodFields(record) {
  const tipoOnly = trimOrNull(record.tipo_sangre);
  let factorRh = trimOrNull(record.factor_rh);

  if (!factorRh && tipoOnly) {
    const parsed = parseCombinedBloodType(tipoOnly);
    if (parsed) {
      record.tipo_sangre = parsed.tipo_sangre;
      factorRh = parsed.factor_rh;
    }
  }

  if (tipoOnly && BLOOD_TYPES.includes(tipoOnly.toUpperCase())) {
    record.tipo_sangre = tipoOnly.toUpperCase();
  }

  if (factorRh === '+' || factorRh === '-') {
    record.factor_rh = factorRh;
  } else if (factorRh) {
    record.factor_rh = factorRh;
  } else {
    record.factor_rh = null;
  }

  return record;
}

function normalizeInsuranceFields(record) {
  record.seguro_denominacional = Boolean(record.seguro_denominacional);
  record.seguro_denominacional_fecha = record.seguro_denominacional
    ? (record.seguro_denominacional_fecha || null)
    : null;
  return record;
}

export function normalizeDatosMedicosRecord(row) {
  if (!row) return null;

  const normalized = { ...row };
  for (const [formKey, aliases] of Object.entries(READ_ALIASES)) {
    normalized[formKey] = pickFirst(row, [formKey, ...aliases]);
  }

  normalizeBloodFields(normalized);
  normalizeInsuranceFields(normalized);
  return normalized;
}

function insuranceWriteColumns(data) {
  const value = trimOrNull(data.aseguradora);
  const columns = {};
  for (const col of WRITE_ALIASES.aseguradora) {
    columns[col] = value;
  }
  return columns;
}

function buildPayload(miembroId, data) {
  const blood = normalizeBloodFields({
    tipo_sangre: data.tipo_sangre,
    factor_rh: data.factor_rh,
  });
  const insurance = normalizeInsuranceFields({
    seguro_denominacional: data.seguro_denominacional,
    seguro_denominacional_fecha: data.seguro_denominacional_fecha,
  });

  const payload = {
    miembro_id: miembroId,
    tipo_sangre: blood.tipo_sangre,
    factor_rh: blood.factor_rh,
    ...insuranceWriteColumns(data),
    seguro_denominacional: insurance.seguro_denominacional,
    seguro_denominacional_fecha: insurance.seguro_denominacional_fecha,
  };

  for (const key of DATA_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) continue;
    payload[key] = trimOrNull(data[key]);
  }

  return payload;
}

async function writePayload(payload, existingId, sourceData) {
  let current = { ...payload };
  const wantedAseguradora = trimOrNull(sourceData?.aseguradora);
  const wantedSeguro = Boolean(sourceData?.seguro_denominacional);
  let droppedAseguradora = false;
  let droppedSeguro = false;

  for (let attempt = 0; attempt < DATA_FIELDS.length + 4; attempt += 1) {
    const result = existingId
      ? await sb.from('miembro_datos_medicos').update(current).eq('id', existingId).select().single()
      : await sb.from('miembro_datos_medicos').insert([current]).select().single();

    if (!result.error) {
      const normalized = normalizeDatosMedicosRecord(result.data);
      if (droppedAseguradora && wantedAseguradora && normalized?.aseguradora !== wantedAseguradora) {
        return {
          data: normalized,
          error: new Error('aseguradora column missing — run MIEMBRO_DATOS_MEDICOS_ASEGURADORA_SCHEMA.sql'),
        };
      }
      if (droppedSeguro && wantedSeguro && !normalized?.seguro_denominacional) {
        return {
          data: normalized,
          error: new Error('seguro_denominacional columns missing — run MIEMBRO_DATOS_MEDICOS_ASEGURADORA_SCHEMA.sql'),
        };
      }
      return { ...result, data: normalized };
    }

    const missingColumn = missingColumnFromError(result.error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(current, missingColumn)) {
      if (missingColumn === 'aseguradora' || missingColumn === 'eps') droppedAseguradora = true;
      if (missingColumn.startsWith('seguro_denominacional')) droppedSeguro = true;
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

function rpcValue(value) {
  const trimmed = trimOrNull(value);
  return trimmed ?? '';
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function saveViaRpc(miembroId, data, recordId) {
  const blood = normalizeBloodFields({
    tipo_sangre: data.tipo_sangre,
    factor_rh: data.factor_rh,
  });
  const insurance = normalizeInsuranceFields({
    seguro_denominacional: data.seguro_denominacional,
    seguro_denominacional_fecha: data.seguro_denominacional_fecha,
  });

  return sb.rpc('admin_save_miembro_datos_medicos', {
    p_miembro_id: miembroId,
    p_tipo_sangre: rpcValue(blood.tipo_sangre),
    p_factor_rh: rpcValue(blood.factor_rh),
    p_alergias: rpcValue(data.alergias),
    p_medicamentos: rpcValue(data.medicamentos),
    p_enfermedades: rpcValue(data.enfermedades),
    p_observaciones: rpcValue(data.observaciones),
    p_aseguradora: rpcValue(data.aseguradora),
    p_poliza: rpcValue(data.poliza),
    p_seguro_denominacional: insurance.seguro_denominacional,
    p_seguro_denominacional_fecha: insurance.seguro_denominacional
      ? (insurance.seguro_denominacional_fecha || todayIsoDate())
      : null,
    p_record_id: recordId || null,
  });
}

export async function upsertDatosMedicos(miembroId, data, existingId) {
  const rpc = await saveViaRpc(miembroId, data, existingId);
  if (!rpc.error) {
    const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
    return { data: normalizeDatosMedicosRecord(row), error: null };
  }

  const payload = buildPayload(miembroId, data);
  const direct = await writePayload(payload, existingId, data);
  if (!direct.error) return direct;

  return direct.error ? direct : rpc;
}
