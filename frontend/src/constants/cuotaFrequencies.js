export const CUOTA_FRECUENCIA = {
  SEMANAL: 'semanal',
  QUINCENAL: 'quincenal',
  MENSUAL: 'mensual',
  OTRO: 'otro',
};

export const CUOTA_FRECUENCIA_VALUES = Object.values(CUOTA_FRECUENCIA);

export function cuotaFrequencyLabel(frecuencia, t, otroText = '') {
  switch (frecuencia) {
    case CUOTA_FRECUENCIA.SEMANAL:
      return t('cuotaFrequencyWeekly');
    case CUOTA_FRECUENCIA.QUINCENAL:
      return t('cuotaFrequencyBiweekly');
    case CUOTA_FRECUENCIA.MENSUAL:
      return t('cuotaFrequencyMonthly');
    case CUOTA_FRECUENCIA.OTRO:
      return otroText?.trim() || t('cuotaFrequencyOther');
    default:
      return t('notAvailable');
  }
}
