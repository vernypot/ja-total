import { useEffect, useRef, useState } from 'react';
import { getAssetDisplayUrl } from '../utils/assets';

export default function NoticiaFeaturedImageField({
  label,
  hint,
  imageUrl,
  pendingFile,
  uploading,
  onUpload,
  onRemove,
  uploadLabel,
  changeLabel,
  removeLabel,
  emptyLabel,
  previewClassName = '',
}) {
  const inputRef = useRef(null);
  const [localPreview, setLocalPreview] = useState('');

  useEffect(() => {
    if (!pendingFile) {
      setLocalPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(pendingFile);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const displayUrl = localPreview || getAssetDisplayUrl(imageUrl);

  function handleFileChange(file) {
    if (!file) return;
    onUpload(file);
  }

  return (
    <div className="noticia-featured-image-field">
      <div className="noticia-featured-image-field__label">{label}</div>
      <div className={`noticia-featured-image-field__preview${previewClassName ? ` ${previewClassName}` : ''}`}>
        {displayUrl ? (
          <img src={displayUrl} alt={label} />
        ) : (
          <span className="noticia-featured-image-field__empty">{emptyLabel}</span>
        )}
        {uploading && <div className="noticia-featured-image-field__overlay">…</div>}
      </div>
      <div className="noticia-featured-image-field__actions">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleFileChange(file);
            e.target.value = '';
          }}
        />
        <button type="button" className="btn btn-sm btn-primary" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {displayUrl ? changeLabel : uploadLabel}
        </button>
        {displayUrl && (
          <button type="button" className="btn btn-sm btn-danger" onClick={onRemove} disabled={uploading}>
            {removeLabel}
          </button>
        )}
      </div>
      {hint && <p className="noticia-field-hint">{hint}</p>}
    </div>
  );
}
