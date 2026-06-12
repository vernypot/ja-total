import { createContext, useState, useEffect } from 'react';
import { defaultTranslations } from '../i18n/translations';

export const LanguageContext = createContext();

export default function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'es';
  });
  const [customLabels, setCustomLabels] = useState(() => {
    try {
      const saved = localStorage.getItem('customLabels');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('customLabels', JSON.stringify(customLabels));
  }, [customLabels]);

  const t = (key) => {
    if (customLabels[key]) return customLabels[key];
    return defaultTranslations[language]?.[key] || defaultTranslations.es[key] || key;
  };

  const updateLabel = (key, value) => {
    setCustomLabels(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetLabels = () => {
    setCustomLabels({});
  };

  const value = {
    language,
    setLanguage,
    t,
    customLabels,
    updateLabel,
    resetLabels,
    allKeys: Object.keys(defaultTranslations.es),
    translations: defaultTranslations,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
