import { useRef } from 'react';
import { getAssetDisplayUrl } from '../utils/assets';

export default function LogoAssetField({
  label,
  hint,
  logoUrl,
  canManage,
  uploading,
  onUpload,
  onRemove,
  uploadLabel,
  changeLabel,
  removeLabel,
  emptyLabel,
}) {
  const inputRef = useRef(null);
  const displayUrl = getAssetDisplayUrl(logoUrl);

  return (
    <div style={{ minWidth: '140px' }}>
      <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#374151' }}>
        {label}
      </div>
      <div style={{
        width: '72px',
        height: '72px',
        borderRadius: '8px',
        border: '2px solid #e5e7eb',
        overflow: 'hidden',
        backgroundColor: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {displayUrl ? (
          <img src={displayUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
        ) : (
          <span style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', padding: '4px' }}>{emptyLabel}</span>
        )}
        {uploading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(255,255,255,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: '#2563eb',
          }}>
            …
          </div>
        )}
      </div>

      {canManage && (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.7 : 1,
            }}
          >
            {logoUrl ? changeLabel : uploadLabel}
          </button>
          {logoUrl && (
            <button
              type="button"
              onClick={onRemove}
              disabled={uploading}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.7 : 1,
              }}
            >
              {removeLabel}
            </button>
          )}
          {hint && (
            <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: 'var(--color-text-muted)', maxWidth: '140px' }}>{hint}</p>
          )}
        </div>
      )}
    </div>
  );
}
