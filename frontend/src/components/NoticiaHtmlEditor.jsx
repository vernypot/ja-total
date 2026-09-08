import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useLanguage } from '../hooks/useLanguage';
import {
  defaultNoticiaTableHtml,
  normalizeNoticiaHtmlFromQuill,
  NOTICIA_TABLE_TOOLBAR,
  prepareNoticiaHtmlForQuill,
  registerNoticiaTableSupport,
} from '../utils/noticiaQuillTable';
import '../styles/noticia-html-editor.css';

const BASE_TOOLBARS = {
  title: [
    ['bold', 'italic', 'underline'],
    ['link'],
    ['clean'],
  ],
  summary: [
    ['bold', 'italic', 'underline'],
    [{ list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
  content: [
    [{ header: [2, 3, 4, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'link', 'image', NOTICIA_TABLE_TOOLBAR],
    ['clean'],
  ],
};

const FORMATS = {
  title: ['bold', 'italic', 'underline', 'link'],
  summary: ['bold', 'italic', 'underline', 'list', 'link'],
  content: [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'blockquote', 'link', 'image',
    NOTICIA_TABLE_TOOLBAR,
  ],
};

const MIN_HEIGHTS = {
  title: 72,
  summary: 120,
  content: 220,
};

const HTML_TOOLBAR = 'html';

let quillHtmlIconRegistered = false;

function registerQuillHtmlIcon() {
  if (quillHtmlIconRegistered || !ReactQuill?.Quill) return;

  const icons = ReactQuill.Quill.import('ui/icons');
  icons[HTML_TOOLBAR] = [
    '<svg viewBox="0 0 18 18">',
    '<polyline class="ql-stroke" points="5 3 2 9 5 15"></polyline>',
    '<polyline class="ql-stroke" points="13 3 16 9 13 15"></polyline>',
    '</svg>',
  ].join('');
  quillHtmlIconRegistered = true;
}

registerQuillHtmlIcon();
registerNoticiaTableSupport(ReactQuill?.Quill);

function toolbarWithHtmlToggle(variant) {
  const groups = (BASE_TOOLBARS[variant] || BASE_TOOLBARS.content).map(row => [...row]);
  const lastGroup = groups[groups.length - 1];
  if (!lastGroup.includes(HTML_TOOLBAR)) {
    lastGroup.push(HTML_TOOLBAR);
  }
  return groups;
}

function buildModules(variant) {
  const Quill = ReactQuill.Quill;
  const handlers = {
    [HTML_TOOLBAR]: () => {},
    [NOTICIA_TABLE_TOOLBAR]: function insertNoticiaTable() {
      const quill = this.quill;
      const range = quill.getSelection(true);
      const index = range ? range.index : quill.getLength();
      quill.insertEmbed(
        index,
        NOTICIA_TABLE_TOOLBAR,
        defaultNoticiaTableHtml(),
        Quill.sources.USER
      );
      quill.insertText(index + 1, '\n', Quill.sources.SILENT);
      quill.setSelection(index + 2, Quill.sources.SILENT);
    },
  };

  const clipboard = variant === 'content'
    ? {
      matchers: [
        [
          'TABLE',
          function matchTable(node) {
            const Delta = Quill.import('delta');
            return new Delta().insert({ [NOTICIA_TABLE_TOOLBAR]: node.outerHTML });
          },
        ],
      ],
    }
    : undefined;

  return {
    toolbar: {
      container: toolbarWithHtmlToggle(variant),
      handlers,
    },
    ...(clipboard ? { clipboard } : {}),
  };
}

export default function NoticiaHtmlEditor({
  label,
  hint,
  value,
  onChange,
  variant = 'content',
  editorKey,
}) {
  const { t } = useLanguage();
  const [htmlMode, setHtmlMode] = useState(false);
  const wrapperRef = useRef(null);
  const toggleHtmlModeRef = useRef(() => {});

  toggleHtmlModeRef.current = () => {
    setHtmlMode(active => !active);
  };

  const formats = FORMATS[variant] || FORMATS.content;
  const minHeight = MIN_HEIGHTS[variant] || MIN_HEIGHTS.content;
  const [editorHtml, setEditorHtml] = useState('');

  const modules = useMemo(() => {
    const config = buildModules(variant);
    config.toolbar.handlers[HTML_TOOLBAR] = () => toggleHtmlModeRef.current();
    return config;
  }, [variant]);

  const handleChange = useCallback((nextValue) => {
    setEditorHtml(nextValue);
    const normalized = variant === 'content'
      ? normalizeNoticiaHtmlFromQuill(nextValue)
      : nextValue;
    onChange(normalized);
  }, [onChange, variant]);

  const syncHtmlToolbarButton = useCallback(() => {
    const button = wrapperRef.current?.querySelector('button.ql-html');
    if (!button) return;

    button.classList.toggle('ql-active', htmlMode);
    button.setAttribute('aria-pressed', String(htmlMode));
    button.setAttribute(
      'aria-label',
      htmlMode ? t('noticiasEditorRichTextMode') : t('noticiasEditorHtmlMode')
    );
    button.title = htmlMode ? t('noticiasEditorRichTextMode') : t('noticiasEditorHtmlMode');
  }, [htmlMode, t]);

  const syncTableToolbarButton = useCallback(() => {
    if (variant !== 'content') return;
    const button = wrapperRef.current?.querySelector(`button.ql-${NOTICIA_TABLE_TOOLBAR}`);
    if (!button) return;
    button.setAttribute('aria-label', t('noticiasEditorInsertTable'));
    button.title = t('noticiasEditorInsertTable');
  }, [t, variant]);

  useEffect(() => {
    setHtmlMode(false);
    setEditorHtml(
      variant === 'content'
        ? prepareNoticiaHtmlForQuill(value || '')
        : (value || '')
    );
  }, [editorKey, variant]);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      syncHtmlToolbarButton();
      syncTableToolbarButton();
    });
    return () => cancelAnimationFrame(frameId);
  }, [syncHtmlToolbarButton, syncTableToolbarButton, editorKey, htmlMode]);

  return (
    <div className="noticia-html-editor" ref={wrapperRef}>
      <div className="noticia-html-editor-label">
        <span className="noticia-html-editor-title">{label}</span>
        {hint && (
          <span className="noticia-html-editor-hint">
            {htmlMode ? t('noticiasEditorHtmlModeHint') : hint}
          </span>
        )}
      </div>
      <div className={`noticia-html-editor-field${htmlMode ? ' is-html-mode' : ''}`}>
        <ReactQuill
          key={editorKey}
          theme="snow"
          value={editorHtml}
          onChange={handleChange}
          modules={modules}
          formats={formats}
          readOnly={htmlMode}
          className={`noticia-html-editor-quill noticia-html-editor-quill--${variant}`}
          style={{ '--noticia-editor-min-height': `${minHeight}px` }}
        />
        {htmlMode && (
          <textarea
            className={`noticia-html-editor-source noticia-html-editor-source--${variant}`}
            value={value || ''}
            onChange={event => onChange(event.target.value)}
            spellCheck={false}
            aria-label={label}
            style={{ '--noticia-editor-min-height': `${minHeight}px` }}
          />
        )}
      </div>
    </div>
  );
}
