import { sb } from '../../services/supabase';

export function memberFullName(m) {
  if (!m) return '';
  return [m.nombre, m.apellido1, m.apellido2].filter(Boolean).join(' ');
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function nextBirthdayDate(fechaNacimiento, refDate = new Date()) {
  if (!fechaNacimiento) return null;
  const parts = fechaNacimiento.split('-').map(Number);
  if (parts.length < 3 || !parts[1] || !parts[2]) return null;

  const [, month, day] = parts;
  const ref = startOfDay(refDate);
  let candidate = new Date(ref.getFullYear(), month - 1, day);
  candidate = startOfDay(candidate);

  if (candidate < ref) {
    candidate = startOfDay(new Date(ref.getFullYear() + 1, month - 1, day));
  }

  return candidate;
}

export function daysUntilBirthday(fechaNacimiento, refDate = new Date()) {
  const next = nextBirthdayDate(fechaNacimiento, refDate);
  if (!next) return null;
  const ref = startOfDay(refDate);
  return Math.round((next - ref) / (1000 * 60 * 60 * 24));
}

export function formatBirthdayShort(fechaNacimiento, language = 'es') {
  if (!fechaNacimiento) return '';
  const locale = language === 'en' ? 'en-US' : 'es-CO';
  return new Date(`${fechaNacimiento}T12:00:00`).toLocaleDateString(locale, {
    month: 'long',
    day: 'numeric',
  });
}

export async function fetchUpcomingBirthdaysByIglesia(iglesiaId, { days = 30 } = {}) {
  if (!iglesiaId) return { data: [], error: null };

  const { data: clubs, error: clubsError } = await sb
    .from('clubes')
    .select('id')
    .eq('iglesia_id', iglesiaId)
    .eq('estado', 'activo');

  if (clubsError) return { data: [], error: clubsError };
  if (!clubs?.length) return { data: [], error: null };

  const clubIds = clubs.map(c => c.id);
  const { data: rows, error } = await sb
    .from('miembro_club')
    .select('miembros(id,nombre,apellido1,apellido2,fecha_nacimiento,estado,foto_url)')
    .in('club_id', clubIds);

  if (error) return { data: [], error };

  const today = startOfDay(new Date());
  const byMember = new Map();

  for (const row of rows || []) {
    const m = row.miembros;
    if (!m || m.estado !== 'activo' || !m.fecha_nacimiento) continue;

    const daysUntil = daysUntilBirthday(m.fecha_nacimiento, today);
    if (daysUntil === null || daysUntil > days) continue;

    const existing = byMember.get(m.id);
    if (!existing || daysUntil < existing.daysUntil) {
      byMember.set(m.id, {
        id: m.id,
        nombre: m.nombre,
        apellido1: m.apellido1,
        apellido2: m.apellido2,
        fecha_nacimiento: m.fecha_nacimiento,
        foto_url: m.foto_url,
        daysUntil,
        nextDate: nextBirthdayDate(m.fecha_nacimiento, today),
      });
    }
  }

  const birthdays = Array.from(byMember.values()).sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    return memberFullName(a).localeCompare(memberFullName(b), undefined, { sensitivity: 'base' });
  });

  return { data: birthdays, error: null };
}
