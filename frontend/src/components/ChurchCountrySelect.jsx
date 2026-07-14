import FormField from './FormField';
import { CHURCH_COUNTRY_OPTIONS, churchCountryLabel } from '../utils/churchCountries';

export default function ChurchCountrySelect({
  t,
  value,
  onChange,
  htmlId = 'church-country',
  error,
}) {
  return (
    <FormField label={t('churchCountry')} htmlFor={htmlId} error={error} required>
      <select
        id={htmlId}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="form-input"
        aria-invalid={Boolean(error)}
      >
        {CHURCH_COUNTRY_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {churchCountryLabel(option.value, t)}
          </option>
        ))}
      </select>
      <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
        {t('churchCountryHint')}
      </p>
    </FormField>
  );
}
