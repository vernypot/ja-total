export const DEFAULT_CHURCH_COUNTRY = 'CO';

export const CHURCH_COUNTRY_OPTIONS = [
  { value: 'CO', labelKey: 'countryCO' },
  { value: 'MX', labelKey: 'countryMX' },
  { value: 'GT', labelKey: 'countryGT' },
  { value: 'SV', labelKey: 'countrySV' },
  { value: 'HN', labelKey: 'countryHN' },
  { value: 'NI', labelKey: 'countryNI' },
  { value: 'CR', labelKey: 'countryCR' },
  { value: 'PA', labelKey: 'countryPA' },
  { value: 'CU', labelKey: 'countryCU' },
  { value: 'DO', labelKey: 'countryDO' },
  { value: 'PR', labelKey: 'countryPR' },
  { value: 'JM', labelKey: 'countryJM' },
  { value: 'VE', labelKey: 'countryVE' },
  { value: 'PE', labelKey: 'countryPE' },
  { value: 'EC', labelKey: 'countryEC' },
  { value: 'BO', labelKey: 'countryBO' },
  { value: 'CL', labelKey: 'countryCL' },
  { value: 'AR', labelKey: 'countryAR' },
  { value: 'PY', labelKey: 'countryPY' },
  { value: 'UY', labelKey: 'countryUY' },
  { value: 'BR', labelKey: 'countryBR' },
  { value: 'US', labelKey: 'countryUS' },
  { value: 'CA', labelKey: 'countryCA' },
  { value: 'BZ', labelKey: 'countryBZ' },
  { value: 'HT', labelKey: 'countryHT' },
  { value: 'TT', labelKey: 'countryTT' },
  { value: 'GY', labelKey: 'countryGY' },
  { value: 'SR', labelKey: 'countrySR' },
  { value: 'GF', labelKey: 'countryGF' },
];

export function isValidChurchCountry(country) {
  return CHURCH_COUNTRY_OPTIONS.some(option => option.value === country);
}

export function normalizeChurchCountry(country) {
  return isValidChurchCountry(country) ? country : DEFAULT_CHURCH_COUNTRY;
}

export function churchCountryLabel(country, t) {
  const option = CHURCH_COUNTRY_OPTIONS.find(item => item.value === country);
  return option ? t(option.labelKey) : country;
}
