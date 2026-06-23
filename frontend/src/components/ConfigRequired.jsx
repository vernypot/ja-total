import { useLanguage } from '../hooks/useLanguage';

export default function ConfigRequired() {
  const { t } = useLanguage();

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '640px', margin: '0 auto' }}>
      <h1>{t('configRequiredTitle')}</h1>
      <p>{t('configRequiredBody')}</p>
    </div>
  );
}
