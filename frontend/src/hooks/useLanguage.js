import { useContext } from 'react';
import { LanguageContext } from '../context/i18nContext';

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error(
      'useLanguage must be used within LanguageProvider. If this appeared after editing translations, hard refresh the page (Cmd+Shift+R).'
    );
  }
  return value;
}
