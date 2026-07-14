import { useLanguage } from '../hooks/useLanguage';
import '../styles/language-switcher.css';

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="language-switcher">
      <button
        type="button"
        className={`language-switcher-btn${language === 'es' ? ' is-active' : ''}`}
        onClick={() => setLanguage('es')}
        title={t('spanish')}
        aria-label={t('spanish')}
        aria-pressed={language === 'es'}
      >
        <span className="language-switcher-btn-icon" aria-hidden="true">🇪🇸</span>
        <span className="language-switcher-btn-label">ES</span>
      </button>
      <button
        type="button"
        className={`language-switcher-btn${language === 'en' ? ' is-active' : ''}`}
        onClick={() => setLanguage('en')}
        title={t('english')}
        aria-label={t('english')}
        aria-pressed={language === 'en'}
      >
        <span className="language-switcher-btn-icon" aria-hidden="true">🇬🇧</span>
        <span className="language-switcher-btn-label">EN</span>
      </button>
    </div>
  );
}
