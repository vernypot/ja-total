import { describe, expect, it, vi } from 'vitest';

vi.mock('../../services/supabase', () => ({
  sb: {},
}));

import {
  collectImageSources,
  formatMensajeFileSize,
  mensajeHasBody,
  MENSAJE_MAX_FILE_BYTES,
  replaceHtmlSources,
  sanitizeMensajeFileName,
  validateMensajeFile,
  withMensajeSubjectPrefix,
} from './mensajes.model';

describe('mensaje helpers', () => {
  it('treats empty quill html as no body', () => {
    expect(mensajeHasBody('')).toBe(false);
    expect(mensajeHasBody('<p><br></p>')).toBe(false);
    expect(mensajeHasBody('<p>Hello</p>')).toBe(true);
    expect(mensajeHasBody('<p><img src="blob:abc"></p>')).toBe(true);
  });

  it('sanitizes attachment names', () => {
    expect(sanitizeMensajeFileName('photo/../x.png')).toBe('photo_.._x.png');
    expect(sanitizeMensajeFileName('')).toBe('file');
  });

  it('rejects files over 1 GB', () => {
    expect(validateMensajeFile({ name: 'a.bin', size: MENSAJE_MAX_FILE_BYTES })).toBeNull();
    expect(validateMensajeFile({ name: 'a.bin', size: MENSAJE_MAX_FILE_BYTES + 1 })).toBe('mensajeFileTooLarge');
  });

  it('rewrites inline image sources', () => {
    const html = '<p><img src="blob:one"><img src="blob:two"></p>';
    expect(collectImageSources(html)).toEqual(['blob:one', 'blob:two']);
    expect(replaceHtmlSources(html, [['blob:one', 'https://cdn/one.png']])).toContain('https://cdn/one.png');
  });

  it('formats file sizes', () => {
    expect(formatMensajeFileSize(512, 'en')).toBe('512 B');
    expect(formatMensajeFileSize(1024, 'en')).toMatch(/KB/);
  });

  it('adds reply and forward subject prefixes once', () => {
    expect(withMensajeSubjectPrefix('Hello', 'Re:')).toBe('Re: Hello');
    expect(withMensajeSubjectPrefix('Re: Hello', 'Re:')).toBe('Re: Hello');
    expect(withMensajeSubjectPrefix('', 'Fw:')).toBe('Fw:');
  });
});
