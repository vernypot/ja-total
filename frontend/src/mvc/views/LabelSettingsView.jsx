import '../../styles/form.css';

export default function LabelSettingsView({
  t,
  customLabels,
  translations,
  searchTerm,
  setSearchTerm,
  editingKey,
  setEditingKey,
  editingValue,
  setEditingValue,
  filteredKeys,
  startEdit,
  saveEdit,
  resetLabel,
  handleResetAll,
}) {
  return (
    <div className="container">
      <div className="page-header">
        <h1>⚙️ {t('labelSettings')}</h1>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input type="text" placeholder={t('search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="form-input" style={{ flex: 1, minWidth: '200px' }} />
          <button onClick={handleResetAll} style={{ padding: '10px 15px', backgroundColor: '#ff6b6b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
            🔄 {t('resetAll')}
          </button>
        </div>

        <div style={{ display: 'grid', gap: '12px', maxHeight: '600px', overflowY: 'auto' }}>
          {filteredKeys.map(key => {
            const customValue = customLabels[key];
            const defaultValue = translations.es[key] || key;
            const isEditing = editingKey === key;
            const isCustomized = !!customValue;

            return (
              <div key={key} style={{ padding: '15px', border: isCustomized ? '2px solid #2563eb' : '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: isCustomized ? '#eff6ff' : '#f9f9f9', display: 'grid', gridTemplateColumns: '200px 1fr auto', gap: '15px', alignItems: 'center' }}>
                <code style={{ fontSize: '12px', backgroundColor: '#f0f0f0', padding: '4px 8px', borderRadius: '4px', wordBreak: 'break-word' }}>{key}</code>
                {isEditing ? (
                  <input type="text" value={editingValue} onChange={e => setEditingValue(e.target.value)} onKeyPress={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingKey(null); }} autoFocus className="form-input" style={{ margin: 0 }} />
                ) : (
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{customValue || defaultValue}</div>
                    {customValue && <div style={{ fontSize: '12px', color: '#666' }}>{t('defaultLabel')}: {defaultValue}</div>}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {isEditing ? (
                    <>
                      <button onClick={saveEdit}>✓ {t('save')}</button>
                      <button onClick={() => setEditingKey(null)}>✕ {t('cancel')}</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(key)}>✏️ {t('edit')}</button>
                      {isCustomized && <button onClick={() => resetLabel(key)}>🔄 {t('delete')}</button>}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
