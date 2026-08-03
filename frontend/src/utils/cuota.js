import { CUOTA_FRECUENCIA } from '../constants/cuotaFrequencies';

export const DEFAULT_CUOTA_MONEDA_SIMBOLO = '$';

export function parseCuotaMonto(value) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function getClubCuotaCurrency(club) {
  return {
    nombre: club?.cuota_moneda_nombre?.trim() || '',
    simbolo: club?.cuota_moneda_simbolo?.trim() || DEFAULT_CUOTA_MONEDA_SIMBOLO,
  };
}

export function formatCuotaMonto(value, options = 'es') {
  const normalized = typeof options === 'string'
    ? { language: options, club: null, includeCurrencyName: false }
    : {
      language: options.language || 'es',
      club: options.club || null,
      includeCurrencyName: Boolean(options.includeCurrencyName),
    };

  const amount = parseCuotaMonto(value);
  if (amount == null) return '—';

  const { nombre, simbolo } = getClubCuotaCurrency(normalized.club);
  const locale = normalized.language === 'en' ? 'en-US' : 'es-CO';
  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  const formattedAmount = `${simbolo}${formattedNumber}`;

  if (normalized.includeCurrencyName && nombre) {
    return `${formattedAmount} (${nombre})`;
  }

  return formattedAmount;
}

export function clubHasDefaultCuota(club) {
  return Boolean(club?.cuota_activa) && parseCuotaMonto(club?.cuota_monto) != null;
}

export function resolveEventCuotaMonto(evento, club) {
  if (!evento?.cuota_aplica) return null;
  const override = parseCuotaMonto(evento?.cuota_monto_override);
  if (override != null) return override;
  if (clubHasDefaultCuota(club)) return parseCuotaMonto(club.cuota_monto);
  const eventClub = evento?.clubes;
  if (clubHasDefaultCuota(eventClub)) return parseCuotaMonto(eventClub.cuota_monto);
  return null;
}

export function resolveEventCuotaClub(evento, club) {
  if (club?.cuota_moneda_simbolo || club?.cuota_moneda_nombre) return club;
  return evento?.clubes || club;
}

export function resolveMemberEventCuotaMonto({ evento, club, memberRow, memberClubCuota }) {
  if (!evento?.cuota_aplica) return null;
  const memberEventOverride = parseCuotaMonto(memberRow?.cuota_monto_override);
  if (memberEventOverride != null) return memberEventOverride;
  const memberClubOverride = parseCuotaMonto(memberClubCuota?.monto_override);
  if (memberClubOverride != null) return memberClubOverride;
  return resolveEventCuotaMonto(evento, club);
}

export function emptyClubCuotaForm(club) {
  return {
    cuota_activa: Boolean(club?.cuota_activa),
    cuota_monto: club?.cuota_monto != null ? String(club.cuota_monto) : '',
    cuota_frecuencia: club?.cuota_frecuencia || CUOTA_FRECUENCIA.MENSUAL,
    cuota_frecuencia_otro: club?.cuota_frecuencia_otro || '',
    cuota_moneda_nombre: club?.cuota_moneda_nombre || '',
    cuota_moneda_simbolo: club?.cuota_moneda_simbolo || DEFAULT_CUOTA_MONEDA_SIMBOLO,
  };
}

export function emptyEventCuotaForm(evento, club) {
  const hasOverride = evento?.cuota_monto_override != null && evento.cuota_monto_override !== '';
  return {
    cuota_aplica: Boolean(evento?.cuota_aplica),
    cuota_use_default: evento ? !hasOverride : true,
    cuota_monto_override: hasOverride ? String(evento.cuota_monto_override) : '',
  };
}
