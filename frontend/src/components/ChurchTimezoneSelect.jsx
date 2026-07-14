import FormField from './FormField';
import { CHURCH_TIMEZONE_OPTIONS, churchTimezoneLabel } from '../utils/churchTimezones';

export default function ChurchTimezoneSelect({
  t,
  value,
  onChange,
  htmlId = 'church-timezone',
  error,
}) {
  return (
    <FormField label={t('churchTimezone')} htmlFor={htmlId} error={error} required>
      <select
        id={htmlId}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="form-input"
        aria-invalid={Boolean(error)}
      >
        {CHURCH_TIMEZONE_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {churchTimezoneLabel(option.value, t)}
          </option>
        ))}
      </select>
      <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
        {t('churchTimezoneHint')}
      </p>
    </FormField>
  );
}
