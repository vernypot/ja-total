import { useLanguage } from '../hooks/useLanguage';

export default function ListSearchInput({ value, onChange, placeholder }) {
  const { t } = useLanguage();

  return (
    <input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || t('search')}
      className="form-input"
      style={{ margin: 0, minWidth: '200px', flex: '1 1 200px', maxWidth: '360px' }}
      aria-label={placeholder || t('search')}
    />
  );
}
