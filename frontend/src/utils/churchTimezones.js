export const DEFAULT_CHURCH_TIMEZONE = 'America/Bogota';

export const CHURCH_TIMEZONE_OPTIONS = [
  { value: 'America/Bogota', labelKey: 'timezoneAmericaBogota' },
  { value: 'America/Mexico_City', labelKey: 'timezoneAmericaMexicoCity' },
  { value: 'America/Guatemala', labelKey: 'timezoneAmericaGuatemala' },
  { value: 'America/El_Salvador', labelKey: 'timezoneAmericaElSalvador' },
  { value: 'America/Tegucigalpa', labelKey: 'timezoneAmericaTegucigalpa' },
  { value: 'America/Managua', labelKey: 'timezoneAmericaManagua' },
  { value: 'America/Costa_Rica', labelKey: 'timezoneAmericaCostaRica' },
  { value: 'America/Panama', labelKey: 'timezoneAmericaPanama' },
  { value: 'America/Havana', labelKey: 'timezoneAmericaHavana' },
  { value: 'America/Santo_Domingo', labelKey: 'timezoneAmericaSantoDomingo' },
  { value: 'America/Puerto_Rico', labelKey: 'timezoneAmericaPuertoRico' },
  { value: 'America/Jamaica', labelKey: 'timezoneAmericaJamaica' },
  { value: 'America/Caracas', labelKey: 'timezoneAmericaCaracas' },
  { value: 'America/Lima', labelKey: 'timezoneAmericaLima' },
  { value: 'America/Guayaquil', labelKey: 'timezoneAmericaGuayaquil' },
  { value: 'America/La_Paz', labelKey: 'timezoneAmericaLaPaz' },
  { value: 'America/Santiago', labelKey: 'timezoneAmericaSantiago' },
  { value: 'America/Argentina/Buenos_Aires', labelKey: 'timezoneAmericaBuenosAires' },
  { value: 'America/Asuncion', labelKey: 'timezoneAmericaAsuncion' },
  { value: 'America/Montevideo', labelKey: 'timezoneAmericaMontevideo' },
  { value: 'America/Sao_Paulo', labelKey: 'timezoneAmericaSaoPaulo' },
  { value: 'America/New_York', labelKey: 'timezoneAmericaNewYork' },
  { value: 'America/Chicago', labelKey: 'timezoneAmericaChicago' },
  { value: 'America/Denver', labelKey: 'timezoneAmericaDenver' },
  { value: 'America/Los_Angeles', labelKey: 'timezoneAmericaLosAngeles' },
];

export function isValidChurchTimezone(timezone) {
  return CHURCH_TIMEZONE_OPTIONS.some(option => option.value === timezone);
}

export function normalizeChurchTimezone(timezone) {
  return isValidChurchTimezone(timezone) ? timezone : DEFAULT_CHURCH_TIMEZONE;
}

export function churchTimezoneLabel(timezone, t) {
  const option = CHURCH_TIMEZONE_OPTIONS.find(item => item.value === timezone);
  return option ? t(option.labelKey) : timezone;
}
