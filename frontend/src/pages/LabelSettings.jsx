import { useContext, useState } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import '../styles/form.css';

export default function LabelSettings() {
  const { t, customLabels, updateLabel, resetLabels, allKeys, translations } = useContext(LanguageContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const filteredKeys = allKeys.filter(key =>
    key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customLabels[key]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    translations.es[key]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startEdit = (key) => {
    setEditingKey(key);
    setEditingValue(customLabels[key] || translations.es[key] || key);
  };

  const saveEdit = () => {
    if (editingValue.trim()) {
      updateLabel(editingKey, editingValue);
      setEditingKey(null);
      setEditingValue('');
    }
  };

  const resetLabel = (key) => {
    updateLabel(key, undefined);
  };

  const handleResetAll = () => {
    if (confirm('¿Seguro que deseas resetear todas las etiquetas? / Are you sure you want to reset all labels?')) {
      resetLabels();
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>⚙️ {t('labelSettings')}</h1>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '15px',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          <input
            type="text"
            placeholder={`${t('loading')}... / Search...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ flex: 1, minWidth: '200px' }}
          />
          <button
            onClick={handleResetAll}
            style={{
              padding: '10px 15px',
              backgroundColor: '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 {t('cancel')} All
          </button>
        </div>

        <div style={{
          display: 'grid',
          gap: '12px',
          maxHeight: '600px',
          overflowY: 'auto'
        }}>
          {filteredKeys.map((key) => {
            const customValue = customLabels[key];
            const defaultValue = translations.es[key] || key;
            const isEditing = editingKey === key;
            const isCustomized = !!customValue;

            return (
              <div
                key={key}
                style={{
                  padding: '15px',
                  border: isCustomized ? '2px solid #2563eb' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: isCustomized ? '#eff6ff' : '#f9f9f9',
                  display: 'grid',
                  gridTemplateColumns: '200px 1fr auto',
                  gap: '15px',
                  alignItems: 'center'
                }}
              >
                {/* Key */}
                <div>
                  <code style={{
                    fontSize: '12px',
                    backgroundColor: '#f0f0f0',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    wordBreak: 'break-word'
                  }}>
                    {key}
                  </code>
                </div>

                {/* Value */}
                {isEditing ? (
                  <input
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') setEditingKey(null);
                    }}
                    autoFocus
                    className="form-input"
                    style={{ margin: 0 }}
                  />
                ) : (
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      {customValue || defaultValue}
                    </div>
                    {customValue && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Default: {defaultValue}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {isEditing ? (
                    <>
                      <button
                        onClick={saveEdit}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#16a34a',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ✓ {t('save')}
                      </button>
                      <button
                        onClick={() => setEditingKey(null)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ✕ {t('cancel')}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(key)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ✏️ {t('edit')}
                      </button>
                      {isCustomized && (
                        <button
                          onClick={() => resetLabel(key)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          🔄 {t('delete')}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        padding: '15px',
        backgroundColor: '#f0f9ff',
        borderRadius: '8px',
        border: '1px solid #0891b2'
      }}>
        <h4 style={{ margin: '0 0 10px 0' }}>ℹ️ Info</h4>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>
          ES: Personaliza las etiquetas que se muestran en toda la aplicación.
        </p>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>
          EN: Customize the labels displayed throughout the application.
        </p>
        <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
          Customized labels are saved in local storage and will persist across sessions.
        </p>
      </div>
    </div>
  );
}
