import { stripHtmlTags } from './sanitizeHtml';

export function isNoticiaSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function getNoticiaSpeechLang(language) {
  return language === 'en' ? 'en-US' : 'es-CO';
}

export function buildNoticiaSpeechText(item, { includeContent = false } = {}) {
  if (!item) return '';

  const parts = [
    stripHtmlTags(item.titulo),
    stripHtmlTags(item.resumen),
  ];

  if (includeContent) {
    parts.push(stripHtmlTags(item.contenido));
  }

  return parts
    .map(part => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('. ');
}

export function pickSpeechVoice(lang) {
  if (!isNoticiaSpeechSupported()) return null;

  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;

  const langPrefix = lang.split('-')[0];
  const exact = voices.find(voice => voice.lang === lang);
  if (exact) return exact;

  const regional = voices.find(voice => voice.lang.startsWith(langPrefix));
  if (regional) return regional;

  return voices.find(voice => voice.default) || voices[0];
}
