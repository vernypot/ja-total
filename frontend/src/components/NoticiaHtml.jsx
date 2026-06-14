import {
  sanitizeNoticiaContentHtml,
  sanitizeNoticiaSummaryHtml,
  sanitizeNoticiaTitleHtml,
} from '../utils/sanitizeHtml';

const SANITIZERS = {
  title: sanitizeNoticiaTitleHtml,
  summary: sanitizeNoticiaSummaryHtml,
  content: sanitizeNoticiaContentHtml,
};

export default function NoticiaHtml({
  html,
  variant = 'content',
  as: Tag = 'div',
  className = '',
  ...rest
}) {
  if (!html?.trim()) return null;

  const sanitize = SANITIZERS[variant] || sanitizeNoticiaContentHtml;
  const clean = sanitize(html);
  if (!clean) return null;

  return (
    <Tag
      {...rest}
      className={['noticia-html', className].filter(Boolean).join(' ')}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
