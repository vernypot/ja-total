import { useLanguage } from '../../hooks/useLanguage';
import '../../styles/form.css';

const FIELDS = [
  { key: 'tipo_sangre', labelKey: 'bloodType' },
  { key: 'factor_rh', labelKey: 'rhFactor' },
  { key: 'aseguradora', labelKey: 'healthInsurance' },
  { key: 'alergias', labelKey: 'allergies', fullWidth: true, multiline: true },
  { key: 'medicamentos', labelKey: 'medications', fullWidth: true, multiline: true },
  { key: 'enfermedades', labelKey: 'medicalConditions', fullWidth: true, multiline: true },
  { key: 'observaciones', labelKey: 'medicalNotes', fullWidth: true, multiline: true },
];

export default function DatosMedicosView({
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
  startAdd,
  cancelEdit,
  save,
  hasRecord,
}) {
  const { t } = useLanguage();

  if (loading) return <div className="loading">{t('loadingData')}</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}>
        <h3 style={{ margin: 0 }}>{t('tabMedicalData')}</h3>
        {canManage && !editing && (
          <button type="button" onClick={hasRecord ? startEdit : startAdd} className="btn btn-sm btn-edit">
            {hasRecord ? `✏️ ${t('edit')}` : `➕ ${t('addMedicalData')}`}
          </button>
        )}
      </div>

      {saveError && <div className="alert alert-error">{saveError}</div>}

      {!hasRecord && !editing ? (
        <p className="text-muted">{t('noMedicalData')}</p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
        }}>
          {FIELDS.map(({ key, labelKey, fullWidth, multiline }) => (
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
                {t(labelKey)}
              </label>
              {editing ? (
                multiline ? (
                  <textarea
                    value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="form-input"
                    rows={3}
                    style={{ margin: 0, resize: 'vertical' }}
                  />
                ) : (
                  <input
                    value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="form-input"
                    style={{ margin: 0 }}
                  />
                )
              ) : (
                <div style={{ whiteSpace: 'pre-wrap' }}>{data?.[key] || '—'}</div>
              )}
            </div>
          ))}
        </div>
      )}

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
