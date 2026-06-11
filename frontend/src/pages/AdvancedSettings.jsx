import { useContext, useState, useEffect } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { sb } from '../services/supabase';
import '../styles/form.css';

export default function AdvancedSettings() {
  const { t, translations } = useContext(LanguageContext);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [formMode, setFormMode] = useState('view'); // 'view' or 'add'
  const [newLabel, setNewLabel] = useState({ label_key: '', label_es: '', label_en: '' });

  const loadLabels = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: queryError } = await sb
        .from('system_labels')
        .select('*')
        .order('label_key', { ascending: true });

      if (queryError) {
        setError('Error loading labels: ' + queryError.message);
        setLabels([]);
      } else {
        setLabels(data || []);
      }
    } catch (err) {
      setError('Unexpected error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLabels();
  }, []);

  const filteredLabels = labels.filter(label =>
    label.label_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    label.label_es.toLowerCase().includes(searchTerm.toLowerCase()) ||
    label.label_en.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startEdit = (label) => {
    setEditingId(label.id);
    setEditingData({ ...label });
  };

  const saveEdit = async () => {
    if (!editingData.label_key || !editingData.label_es || !editingData.label_en) {
      setError('All fields are required');
      return;
    }

    try {
      const { error: updateError } = await sb
        .from('system_labels')
        .update({
          label_es: editingData.label_es,
          label_en: editingData.label_en,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (updateError) {
        setError('Error saving label: ' + updateError.message);
        return;
      }

      setEditingId(null);
      setError('');
      loadLabels();
    } catch (err) {
      setError('Unexpected error: ' + err.message);
    }
  };

  const deleteLabel = async (id) => {
    if (!confirm('¿Está seguro? / Are you sure?')) return;

    try {
      const { error: deleteError } = await sb
        .from('system_labels')
        .delete()
        .eq('id', id);

      if (deleteError) {
        setError('Error deleting label: ' + deleteError.message);
        return;
      }

      loadLabels();
    } catch (err) {
      setError('Unexpected error: ' + err.message);
    }
  };

  const addLabel = async () => {
    if (!newLabel.label_key || !newLabel.label_es || !newLabel.label_en) {
      setError('All fields are required');
      return;
    }

    try {
      const { error: insertError } = await sb
        .from('system_labels')
        .insert([newLabel]);

      if (insertError) {
        setError('Error adding label: ' + insertError.message);
        return;
      }

      setNewLabel({ label_key: '', label_es: '', label_en: '' });
      setFormMode('view');
      setError('');
      loadLabels();
    } catch (err) {
      setError('Unexpected error: ' + err.message);
    }
  };

  const syncWithDefaults = async () => {
    if (!confirm('This will add all default labels to the database. Continue? / ¿Esto agregará todas las etiquetas predeterminadas a la base de datos. ¿Continuar?')) return;

    const defaultKeys = Object.keys(translations.es);
    const existingKeys = labels.map(l => l.label_key);
    
    const toAdd = defaultKeys
      .filter(key => !existingKeys.includes(key))
      .map(key => ({
        label_key: key,
        label_es: translations.es[key],
        label_en: translations.en[key] || key
      }));

    if (toAdd.length === 0) {
      setError('All default labels already exist in database');
      return;
    }

    try {
      const { error: insertError } = await sb
        .from('system_labels')
        .insert(toAdd);

      if (insertError) {
        setError('Error syncing labels: ' + insertError.message);
        return;
      }

      setError('');
      loadLabels();
    } catch (err) {
      setError('Unexpected error: ' + err.message);
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>⚙️ Advanced Settings</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

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
            placeholder="Search labels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ flex: 1, minWidth: '200px' }}
          />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFormMode(formMode === 'add' ? 'view' : 'add')}
              style={{
                padding: '10px 15px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ➕ Add Label
            </button>
            <button
              onClick={syncWithDefaults}
              style={{
                padding: '10px 15px',
                backgroundColor: '#0891b2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔄 Sync Defaults
            </button>
          </div>
        </div>

        {/* Add Label Form */}
        {formMode === 'add' && (
          <div style={{
            padding: '20px',
            backgroundColor: '#f0f9ff',
            border: '2px solid #0891b2',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h3 style={{ marginTop: 0 }}>Add New Label</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Key</label>
                <input
                  type="text"
                  value={newLabel.label_key}
                  onChange={(e) => setNewLabel({ ...newLabel, label_key: e.target.value })}
                  placeholder="e.g., myLabel"
                  className="form-input"
                  style={{ margin: 0 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Español</label>
                <input
                  type="text"
                  value={newLabel.label_es}
                  onChange={(e) => setNewLabel({ ...newLabel, label_es: e.target.value })}
                  placeholder="Spanish translation"
                  className="form-input"
                  style={{ margin: 0 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>English</label>
                <input
                  type="text"
                  value={newLabel.label_en}
                  onChange={(e) => setNewLabel({ ...newLabel, label_en: e.target.value })}
                  placeholder="English translation"
                  className="form-input"
                  style={{ margin: 0 }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button
                onClick={addLabel}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✓ Save
              </button>
              <button
                onClick={() => {
                  setFormMode('view');
                  setNewLabel({ label_key: '', label_es: '', label_en: '' });
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        )}

        {/* Labels List */}
        {loading ? (
          <div className="loading">Loading labels...</div>
        ) : filteredLabels.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No labels found</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Key</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Spanish</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>English</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLabels.map((label) => (
                  <tr key={label.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px' }}>
                      <code style={{ backgroundColor: '#f0f0f0', padding: '4px 8px', borderRadius: '4px' }}>
                        {label.label_key}
                      </code>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {editingId === label.id ? (
                        <input
                          type="text"
                          value={editingData.label_es}
                          onChange={(e) => setEditingData({ ...editingData, label_es: e.target.value })}
                          className="form-input"
                          style={{ margin: 0, width: '100%' }}
                        />
                      ) : (
                        label.label_es
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {editingId === label.id ? (
                        <input
                          type="text"
                          value={editingData.label_en}
                          onChange={(e) => setEditingData({ ...editingData, label_en: e.target.value })}
                          className="form-input"
                          style={{ margin: 0, width: '100%' }}
                        />
                      ) : (
                        label.label_en
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {editingId === label.id ? (
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
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
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
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(label)}
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
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteLabel(label.id)}
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
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{
        padding: '15px',
        backgroundColor: '#fef3c7',
        borderRadius: '8px',
        border: '1px solid #fcd34d'
      }}>
        <h4 style={{ margin: '0 0 10px 0' }}>ℹ️ Information</h4>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>
          📍 Manage system-wide labels/translations from the database.
        </p>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>
          🔄 Use "Sync Defaults" to add all default labels from the application.
        </p>
        <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
          💾 All changes are saved to the database and applied across the system.
        </p>
      </div>
    </div>
  );
}
