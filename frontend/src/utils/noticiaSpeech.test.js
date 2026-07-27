import { describe, expect, it } from 'vitest';
import { buildNoticiaSpeechText, getNoticiaSpeechLang } from './noticiaSpeech';

describe('noticiaSpeech', () => {
  it('builds plain speech text from html fields', () => {
    const text = buildNoticiaSpeechText({
      titulo: '<strong>Hola</strong>',
      resumen: '<p>Resumen breve</p>',
      contenido: '<p>Contenido completo</p>',
    }, { includeContent: true });

    expect(text).toContain('Hola');
    expect(text).toContain('Resumen breve');
    expect(text).toContain('Contenido completo');
  });

  it('omits content unless requested', () => {
    const text = buildNoticiaSpeechText({
      titulo: 'Titulo',
      resumen: 'Resumen',
      contenido: 'Contenido',
    });

    expect(text).toBe('Titulo. Resumen');
  });

  it('maps app language to speech locale', () => {
    expect(getNoticiaSpeechLang('es')).toBe('es-CO');
    expect(getNoticiaSpeechLang('en')).toBe('en-US');
  });
});
