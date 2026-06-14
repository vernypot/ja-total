import { useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '../styles/noticia-html-editor.css';

const TOOLBARS = {
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
    ['blockquote', 'link', 'image'],
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
  ],
};

const MIN_HEIGHTS = {
  title: 72,
  summary: 120,
  content: 220,
};

export default function NoticiaHtmlEditor({
  label,
  hint,
  value,
  onChange,
  variant = 'content',
  editorKey,
}) {
  const modules = useMemo(
    () => ({
      toolbar: TOOLBARS[variant] || TOOLBARS.content,
    }),
    [variant]
  );

  const formats = FORMATS[variant] || FORMATS.content;
  const minHeight = MIN_HEIGHTS[variant] || MIN_HEIGHTS.content;

  return (
    <div className="noticia-html-editor">
      <div className="noticia-html-editor-label">
        <span className="noticia-html-editor-title">{label}</span>
        {hint && <span className="noticia-html-editor-hint">{hint}</span>}
      </div>
      <ReactQuill
        key={editorKey}
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        className={`noticia-html-editor-quill noticia-html-editor-quill--${variant}`}
        style={{ '--noticia-editor-min-height': `${minHeight}px` }}
      />
    </div>
  );
}
