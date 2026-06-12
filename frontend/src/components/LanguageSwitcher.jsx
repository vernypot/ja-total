import { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useContext(LanguageContext);

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    }}>
      <button
        onClick={() => setLanguage('es')}
        style={{
          padding: '6px 12px',
          backgroundColor: language === 'es' ? '#2563eb' : '#e5e7eb',
          color: language === 'es' ? 'white' : 'black',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: language === 'es' ? 'bold' : 'normal',
          transition: 'all 0.2s'
        }}
        title={t('spanish')}
      >
        🇪🇸 ES
      </button>
      <button
        onClick={() => setLanguage('en')}
        style={{
          padding: '6px 12px',
          backgroundColor: language === 'en' ? '#2563eb' : '#e5e7eb',
          color: language === 'en' ? 'white' : 'black',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: language === 'en' ? 'bold' : 'normal',
          transition: 'all 0.2s'
        }}
        title={t('english')}
      >
        🇬🇧 EN
      </button>
    </div>
  );
}
