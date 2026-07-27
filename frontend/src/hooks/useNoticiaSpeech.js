import { useCallback, useEffect, useState } from 'react';
import {
  buildNoticiaSpeechText,
  getNoticiaSpeechLang,
  isNoticiaSpeechSupported,
  pickSpeechVoice,
} from '../utils/noticiaSpeech';

export function useNoticiaSpeech(language = 'es') {
  const [activeId, setActiveId] = useState('');
  const [voicesReady, setVoicesReady] = useState(false);
  const supported = isNoticiaSpeechSupported();

  useEffect(() => {
    if (!supported) return undefined;

    function refreshVoices() {
      setVoicesReady(window.speechSynthesis.getVoices().length > 0);
    }

    refreshVoices();
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices);
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setActiveId('');
  }, [supported]);

  const speak = useCallback((item, { includeContent = false } = {}) => {
    if (!supported || !item?.id) return false;

    const text = buildNoticiaSpeechText(item, { includeContent });
    if (!text) return false;

    window.speechSynthesis.cancel();

    const lang = getNoticiaSpeechLang(language);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95;
    utterance.pitch = 1;

    const voice = pickSpeechVoice(lang);
    if (voice) utterance.voice = voice;

    utterance.onend = () => setActiveId('');
    utterance.onerror = () => setActiveId('');

    setActiveId(item.id);
    window.speechSynthesis.speak(utterance);
    return true;
  }, [language, supported]);

  const toggle = useCallback((item, options = {}) => {
    if (!supported) return;
    if (activeId === item?.id) {
      stop();
      return;
    }
    speak(item, options);
  }, [activeId, speak, stop, supported]);

  const isSpeakingItem = useCallback(itemId => activeId === itemId, [activeId]);

  return {
    supported,
    voicesReady,
    activeId,
    isSpeaking: Boolean(activeId),
    isSpeakingItem,
    speak,
    stop,
    toggle,
  };
}
