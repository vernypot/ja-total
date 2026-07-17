import { useRef } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { PageHelpLink } from '../../components/PageHelp';
import PhotoCropModal from '../../components/PhotoCropModal';
import MiembroSystemAccessPanel from './MiembroSystemAccessView';
import { memberDisplayName } from '../../utils/memberDisplayName';
import '../../styles/form.css';

const FIELDS = [
  { key: 'nombre', labelKey: 'firstName', required: true },
  { key: 'apellido1', labelKey: 'lastName1Short' },
  { key: 'apellido2', labelKey: 'lastName2Short' },
  { key: 'nombre_opcional', labelKey: 'optionalName', hintKey: 'optionalNameHint' },
  { key: 'apellido_opcional', labelKey: 'optionalLastName', hintKey: 'optionalLastNameHint' },
  { key: 'fecha_nacimiento', labelKey: 'birthDate', type: 'date' },
  { key: 'genero', labelKey: 'gender' },
  { key: 'documento', labelKey: 'document' },
  { key: 'email', labelKey: 'email', type: 'email' },
  { key: 'telefono', labelKey: 'phone' },
  { key: 'celular', labelKey: 'cellphone' },
  { key: 'ciudad', labelKey: 'city' },
  { key: 'direccion', labelKey: 'address', fullWidth: true },
];

function MemberPhoto({
  displayPhotoUrl,
  canManage,
  editing,
  uploadingPhoto,
  onSelect,
  onRemove,
  hasPhoto,
  t,
}) {
  const inputRef = useRef(null);

  return (
    <div style={{ flexShrink: 0 }}>
      <div style={{
        width: '120px',
        height: '120px',
        borderRadius: '8px',
        border: '2px solid #e5e7eb',
        overflow: 'hidden',
        backgroundColor: '#e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {displayPhotoUrl ? (
          <img
            src={displayPhotoUrl}
            alt={t('photo')}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '40px', color: '#9ca3af' }}>👤</span>
        )}
        {uploadingPhoto && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(255,255,255,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#2563eb',
          }}>
            …
          </div>
        )}
      </div>

      {canManage && editing && (
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) onSelect(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploadingPhoto}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
              opacity: uploadingPhoto ? 0.7 : 1,
            }}
          >
            {hasPhoto ? t('changePhoto') : t('uploadPhoto')}
          </button>
          {hasPhoto && (
            <button
              type="button"
              onClick={onRemove}
              disabled={uploadingPhoto}
              style={{
                padding: '6px 10px',
                fontSize: '12px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
                opacity: uploadingPhoto ? 0.7 : 1,
              }}
            >
              {t('removePhoto')}
            </button>
          )}
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)', maxWidth: '120px' }}>
            {t('photoHint')}
          </p>
        </div>
      )}
    </div>
  );
}

export default function DatosPersonalesView({
  data,
  form,
  setForm,
  editing,
  error,
  saveError,
  photoError,
  loading,
  saving,
  uploadingPhoto,
  displayPhotoUrl,
  canManage,
  isNew,
  clubId,
  startEdit,
  cancelEdit,
  save,
  handlePhotoSelect,
  handlePhotoCropConfirm,
  cancelPhotoCrop,
  photoCrop,
  handleRemovePhoto,
  calcularEdad,
  miembroId,
}) {
  const { t } = useLanguage();
  const { askConfirm, confirmDialog } = useConfirmDialog({
    cancelLabel: t('cancel'),
    confirmingLabel: t('saving'),
  });

  function confirmRemovePhoto() {
    askConfirm({
      title: t('confirmRemovePhotoTitle'),
      message: t('confirmRemovePhotoMessage'),
      confirmLabel: t('removePhoto'),
      onConfirm: handleRemovePhoto,
    });
  }

  if (loading) return <div className="loading">{t('loadingData')}</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data && !isNew) return <div className="text-muted">{t('noMemberData')}</div>;

  const listingName = isNew
    ? t('newMember')
    : editing
      ? (memberDisplayName(form) || t('personalData'))
      : memberDisplayName(data);

  return (
    <div style={{ padding: '20px' }}>
      {photoCrop && (
        <PhotoCropModal
          imageUrl={photoCrop.url}
          fileName={photoCrop.fileName}
          mimeType={photoCrop.mimeType}
          onConfirm={handlePhotoCropConfirm}
          onCancel={cancelPhotoCrop}
        />
      )}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '16px',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}>
        <h3 style={{ margin: 0 }}>{t('personalData')} <PageHelpLink pageId="memberPersonal" compact /></h3>
        {canManage && !editing && (
          <button
            type="button"
            onClick={startEdit}
            className="btn btn-sm btn-edit"
          >
            ✏️ {t('edit')}
          </button>
        )}
      </div>

      {saveError && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{saveError}</div>}
      {photoError && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{photoError}</div>}
      {isNew && !clubId && (
        <div className="alert alert-warning" style={{ marginBottom: '16px' }}>
          {t('selectClubToCreateMember')}
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: '20px',
        alignItems: 'flex-start',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
      }}>
        <MemberPhoto
          displayPhotoUrl={isNew ? null : displayPhotoUrl}
          canManage={canManage && !isNew}
          editing={editing}
          uploadingPhoto={uploadingPhoto}
          onSelect={handlePhotoSelect}
          onRemove={confirmRemovePhoto}
          hasPhoto={Boolean(displayPhotoUrl)}
          t={t}
        />
        <div>
          <h2 style={{ margin: '0 0 10px 0' }}>{listingName}</h2>
          {!editing && !isNew && data?.fecha_nacimiento && (
            <p style={{ margin: '5px 0', color: 'var(--color-text-secondary)' }}>
              {calcularEdad(data.fecha_nacimiento)} {t('yearsOld')} • {data.fecha_nacimiento}
            </p>
          )}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
      }}>
        {FIELDS.map(({ key, labelKey, hintKey, fullWidth, type, required }) => (
          <div
            key={key}
            style={{
              gridColumn: fullWidth ? '1 / -1' : undefined,
              padding: '15px',
              backgroundColor: '#f9f9f9',
              borderRadius: '8px',
            }}
          >
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#2563eb' }}>
              {t(labelKey)}{required ? ' *' : ''}
            </label>
            {hintKey && (
              <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {t(hintKey)}
              </p>
            )}
            {editing ? (
              <input
                type={type || 'text'}
                value={form[key]}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
                className="form-input"
                style={{ margin: 0 }}
              />
            ) : (
              <div>{isNew ? '' : (data?.[key] || '-')}</div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button
            type="button"
            onClick={save}
            disabled={saving || uploadingPhoto}
            style={{
              padding: '10px 20px',
              backgroundColor: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving || uploadingPhoto ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: saving || uploadingPhoto ? 0.7 : 1,
            }}
          >
            ✓ {saving ? t('saving') : (isNew ? t('create') : t('save'))}
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving || uploadingPhoto}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--color-btn-neutral)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving || uploadingPhoto ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            ✕ {t('cancel')}
          </button>
        </div>
      )}
      {confirmDialog}
      {!isNew && miembroId && <MiembroSystemAccessPanel miembroId={miembroId} />}
    </div>
  );
}
