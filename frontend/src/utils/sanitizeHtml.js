import DOMPurify from 'dompurify';

const CONTENT_TAGS = [
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup',
  'ul', 'ol', 'li', 'a', 'blockquote',
  'h2', 'h3', 'h4', 'div', 'span', 'img',
];

const INLINE_TAGS = ['strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup', 'br', 'span', 'a'];

const SUMMARY_TAGS = [...INLINE_TAGS, 'p'];

const CONTENT_ATTR = ['href', 'target', 'rel', 'src', 'alt', 'title'];

function sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR = ['href', 'target', 'rel'] }) {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  }).trim();
}

/** Full article body — paragraphs, lists, headings, links, images */
export function sanitizeNoticiaContentHtml(html) {
  return sanitize(html, { ALLOWED_TAGS: CONTENT_TAGS, ALLOWED_ATTR: CONTENT_ATTR });
}

/** Summary — inline formatting and short paragraphs */
export function sanitizeNoticiaSummaryHtml(html) {
  return sanitize(html, { ALLOWED_TAGS: SUMMARY_TAGS, ALLOWED_ATTR: ['href', 'target', 'rel'] });
}

/** Title — inline formatting only */
export function sanitizeNoticiaTitleHtml(html) {
  return sanitize(html, { ALLOWED_TAGS: INLINE_TAGS, ALLOWED_ATTR: ['href', 'target', 'rel'] });
}

export function sanitizeNoticiaFields({ titulo, resumen, contenido }) {
  return {
    titulo: sanitizeNoticiaTitleHtml(titulo),
    resumen: sanitizeNoticiaSummaryHtml(resumen),
    contenido: sanitizeNoticiaContentHtml(contenido),
  };
}

/** Plain text for search, validation, and list previews */
export function stripHtmlTags(html) {
  if (!html) return '';
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}
