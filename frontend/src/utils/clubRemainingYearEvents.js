import { normalizeEventDate } from './eventTimezone';

function capitalizeFirstLetter(value, locale = 'es-CO') {
  if (!value) return '';
  const first = value.charAt(0).toLocaleUpperCase(locale);
  const rest = value.slice(1).toLocaleLowerCase(locale);
  return `${first}${rest}`;
}

export function formatPrintMonthGroupLabel(monthKey, language = 'es') {
  if (!monthKey || monthKey === 'unknown') return '';
  const locale = language === 'en' ? 'en-US' : 'es-CO';
  const monthName = new Date(`${monthKey}-01T12:00:00`).toLocaleDateString(locale, { month: 'long' });
  return capitalizeFirstLetter(monthName, locale);
}

export function formatPrintEventDayDate(fecha, language = 'es') {
  const normalizedFecha = normalizeEventDate(fecha);
  if (!normalizedFecha) return '—';

  const locale = language === 'en' ? 'en-US' : 'es-CO';
  const date = new Date(`${normalizedFecha}T12:00:00`);
  const weekday = date.toLocaleDateString(locale, { weekday: 'long' });
  const day = Number(normalizedFecha.split('-')[2]);

  return `${capitalizeFirstLetter(weekday, locale)} ${day}`;
}

export function groupEventosByMonth(eventos, language = 'es') {
  const groups = [];

  for (const evento of eventos || []) {
    const fecha = normalizeEventDate(evento.fecha);
    const monthKey = fecha?.slice(0, 7) || 'unknown';
    let group = groups[groups.length - 1];

    if (!group || group.monthKey !== monthKey) {
      const label = formatPrintMonthGroupLabel(monthKey, language);
      group = { monthKey, label, events: [] };
      groups.push(group);
    }

    group.events.push(evento);
  }

  return groups;
}

export function getLatestAgendaTimestamp(events) {
  let latestMs = null;

  for (const evento of events || []) {
    for (const candidate of [evento?.updated_at, evento?.created_at]) {
      if (!candidate) continue;
      const time = new Date(candidate).getTime();
      if (Number.isNaN(time)) continue;
      if (latestMs == null || time > latestMs) latestMs = time;
    }
  }

  return latestMs == null ? null : new Date(latestMs).toISOString();
}

export function resolveClubPrintLogos(club, getAssetUrl) {
  const resolve = getAssetUrl || (url => url || '');
  return {
    clubLogoUrl: resolve(club?.logo_url) || '',
    tipoLogoUrl: resolve(club?.tipos_club?.logo_url) || '',
    tipoNombre: club?.tipos_club?.nombre || '',
  };
}
