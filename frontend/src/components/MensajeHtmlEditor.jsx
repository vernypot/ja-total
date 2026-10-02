import { useMemo, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '../styles/noticia-html-editor.css';

const TOOLBAR = [
  [{ header: [2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote', 'link', 'image'],
  ['clean'],
];

const FORMATS = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'blockquote', 'link', 'image',
];

export default function MensajeHtmlEditor({
  label,
  hint,
  value,
  onChange,
  onPickImage,
  editorKey,
}) {
  const onPickImageRef = useRef(onPickImage);
  onPickImageRef.current = onPickImage;

  const modules = useMemo(() => ({
    toolbar: {
      container: TOOLBAR,
      handlers: {
        image() {
          const quill = this.quill;
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;

            const insert = (url) => {
              const range = quill.getSelection(true) || { index: quill.getLength() };
              quill.insertEmbed(range.index, 'image', url, 'user');
              quill.setSelection(range.index + 1, 0);
            };

            const picker = onPickImageRef.current;
            if (picker) picker(file, insert);
            else insert(URL.createObjectURL(file));
          };
          input.click();
        },
      },
    },
  }), []);

  return (
    <div className="noticia-html-editor mensaje-html-editor">
      {label && (
        <div className="noticia-html-editor-label">
          <span className="noticia-html-editor-title">{label}</span>
          {hint && <span className="noticia-html-editor-hint">{hint}</span>}
        </div>
      )}
      <ReactQuill
        key={editorKey}
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={FORMATS}
        className="noticia-html-editor-quill noticia-html-editor-quill--content"
        style={{ '--noticia-editor-min-height': '180px' }}
      />
    </div>
  );
}
