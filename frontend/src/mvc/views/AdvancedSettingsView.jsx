import { useLanguage } from '../../hooks/useLanguage';
import { PageHelpLink } from '../../components/PageHelp';
import '../../styles/form.css';

export default function AdvancedSettingsView({
  loading,
  error,
  searchTerm,
  setSearchTerm,
  editingId,
  setEditingId,
  editingData,
  setEditingData,
  formMode,
  setFormMode,
  newLabel,
  setNewLabel,
  filteredLabels,
  startEdit,
  saveEdit,
  deleteLabel,
  addLabel,
  syncWithDefaults,
}) {
  const { t } = useLanguage();

  const labelFields = [
    { field: 'label_key', labelKey: 'key' },
    { field: 'label_es', labelKey: 'spanish' },
    { field: 'label_en', labelKey: 'english' },
  ];

  return (
    <div className="container">
      <div className="page-header">
        <h1>⚙️ {t('advancedSettings')} <PageHelpLink pageId="advancedSettings" /></h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input type="text" placeholder={t('searchLabels')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="form-input" style={{ flex: 1, minWidth: '200px' }} />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => setFormMode(formMode === 'add' ? 'view' : 'add')} style={{ padding: '10px 15px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
              ➕ {t('addLabel')}
            </button>
            <button onClick={syncWithDefaults} style={{ padding: '10px 15px', backgroundColor: '#0891b2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
              🔄 {t('syncDefaults')}
            </button>
          </div>
        </div>

        {formMode === 'add' && (
          <div style={{ padding: '20px', backgroundColor: '#f0f9ff', border: '2px solid #0891b2', borderRadius: '8px', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>{t('addNewLabel')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              {labelFields.map(({ field, labelKey }) => (
                <div key={field}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t(labelKey)}</label>
                  <input type="text" value={newLabel[field]} onChange={e => setNewLabel({ ...newLabel, [field]: e.target.value })} className="form-input" style={{ margin: 0 }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button onClick={addLabel} style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>✓ {t('save')}</button>
              <button onClick={() => { setFormMode('view'); setNewLabel({ label_key: '', label_es: '', label_en: '' }); }} style={{ padding: '10px 20px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>✕ {t('cancel')}</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading">{t('loadingLabels')}</div>
        ) : filteredLabels.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>{t('noLabels')}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                  {[t('key'), t('spanish'), t('english'), t('actions')].map(h => (
                    <th key={h} style={{ padding: '12px', textAlign: h === t('actions') ? 'center' : 'left', fontWeight: 'bold' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLabels.map(label => (
                  <tr key={label.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px' }}><code style={{ backgroundColor: '#f0f0f0', padding: '4px 8px', borderRadius: '4px' }}>{label.label_key}</code></td>
                    <td style={{ padding: '12px' }}>
                      {editingId === label.id ? (
                        <input type="text" value={editingData.label_es} onChange={e => setEditingData({ ...editingData, label_es: e.target.value })} className="form-input" style={{ margin: 0, width: '100%' }} />
                      ) : label.label_es}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {editingId === label.id ? (
                        <input type="text" value={editingData.label_en} onChange={e => setEditingData({ ...editingData, label_en: e.target.value })} className="form-input" style={{ margin: 0, width: '100%' }} />
                      ) : label.label_en}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {editingId === label.id ? (
                        <>
                          <button onClick={saveEdit}>✓</button>
                          <button onClick={() => setEditingId(null)}>✕</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(label)}>✏️</button>
                          <button onClick={() => deleteLabel(label.id)}>🗑️</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
