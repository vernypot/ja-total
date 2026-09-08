import { describe, expect, it } from 'vitest';
import {
  defaultNoticiaTableHtml,
  normalizeNoticiaHtmlFromQuill,
  NOTICIA_TABLE_EMBED_CLASS,
  prepareNoticiaHtmlForQuill,
} from './noticiaQuillTable';

describe('noticiaQuillTable helpers', () => {
  it('wraps tables for quill and unwraps on save', () => {
    const tableHtml = defaultNoticiaTableHtml();
    const prepared = prepareNoticiaHtmlForQuill(`<p>Intro</p>${tableHtml}`);
    expect(prepared).toContain(NOTICIA_TABLE_EMBED_CLASS);

    const normalized = normalizeNoticiaHtmlFromQuill(prepared);
    expect(normalized).toContain('<table');
    expect(normalized).not.toContain(NOTICIA_TABLE_EMBED_CLASS);
  });

  it('leaves non-table html unchanged', () => {
    const html = '<p>Only text</p>';
    expect(prepareNoticiaHtmlForQuill(html)).toBe(html);
    expect(normalizeNoticiaHtmlFromQuill(html)).toBe(html);
  });
});
