import { useLanguage } from '../../hooks/useLanguage';
import '../../styles/form.css';

const FIELDS = [
  { key: 'nombre', labelKey: 'firstName', required: true },
  { key: 'apellido1', labelKey: 'lastName1Short' },
  { key: 'apellido2', labelKey: 'lastName2Short' },
  { key: 'fecha_nacimiento', labelKey: 'birthDate', type: 'date' },
  { key: 'genero', labelKey: 'gender' },
  { key: 'documento', labelKey: 'document' },
  { key: 'telefono', labelKey: 'phone' },
  { key: 'celular', labelKey: 'cellphone' },
  { key: 'ciudad', labelKey: 'city' },
  { key: 'direccion', labelKey: 'address', fullWidth: true },
];

export default function DatosPersonalesView({
  data,
  form,
  setForm,
  editing,
  error,
  saveError,
  loading,
  saving,
  canManage,
  startEdit,
  cancelEdit,
  save,
  calcularEdad,
}) {
  const { t } = useLanguage();

  if (loading) return <div className="loading">{t('loadingData')}</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <div className="text-muted">{t('noMemberData')}</div>;

  const nombreCompleto = [data.nombre, data.apellido1, data.apellido2].filter(Boolean).join(' ');
  const displayName = editing
    ? [form.nombre, form.apellido1, form.apellido2].filter(Boolean).join(' ') || t('personalData')
    : nombreCompleto;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '16px',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}>
        <h3 style={{ margin: 0 }}>{t('personalData')}</h3>
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

      <div style={{
        display: 'flex',
        gap: '20px',
        alignItems: 'flex-start',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
      }}>
        {data.foto_url && (
          <img
            src={data.foto_url}
            alt={t('photo')}
            style={{
              width: '120px',
              height: '120px',
              objectFit: 'cover',
              borderRadius: '8px',
              border: '2px solid #e5e7eb',
            }}
          />
        )}
        <div>
          <h2 style={{ margin: '0 0 10px 0' }}>{displayName}</h2>
          {!editing && data.fecha_nacimiento && (
            <p style={{ margin: '5px 0', color: '#666' }}>
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
        {FIELDS.map(({ key, labelKey, fullWidth, type, required }) => (
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
            {editing ? (
              <input
                type={type || 'text'}
                value={form[key]}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
                className="form-input"
                style={{ margin: 0 }}
              />
            ) : (
              <div>{data[key] || '-'}</div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={{
              padding: '10px 20px',
              backgroundColor: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: saving ? 0.7 : 1,
            }}
          >
            ✓ {saving ? t('saving') : t('save')}
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            ✕ {t('cancel')}
          </button>
        </div>
      )}
    </div>
  );
}
