import { useMemo, useState } from 'react';
import {
  ATTENDANCE_SCORE_FIELD_GROUPS,
  DEFAULT_UNIDAD_EVAL_CONFIG,
  formatEvalPoints,
  parsePoints,
  parseScorePoints,
} from '../utils/unidadEvaluacion';

const EMPTY_ITEM_FORM = {
  nombre: '',
  descripcion: '',
  puntos: '1',
};

function AttendanceScoreGroup({
  group,
  activeConfig,
  evalConfig,
  setConfigForm,
  t,
}) {
  return (
    <div className="unidades-eval-scheme-block">
      <h4 className="unidades-eval-scheme-title">{t(group.titleKey)}</h4>
      {group.sharedNoteKey && (
        <p className="unidades-eval-section-hint">{t(group.sharedNoteKey)}</p>
      )}
      <div className="unidades-eval-weights">
        {group.fields.map(field => {
          const activaKey = `${field.key}_activa`;
          const puntosKey = `${field.key}_puntos`;
          return (
            <label key={field.key} className="unidades-eval-weight-row">
              <input
                type="checkbox"
                checked={activeConfig[activaKey]}
                onChange={e => setConfigForm(prev => ({
                  ...(prev ?? evalConfig),
                  [activaKey]: e.target.checked,
                }))}
              />
              <span>{t(field.labelKey)}</span>
              <input
                type="number"
                step="0.01"
                className="form-input unidades-eval-points-input"
                value={activeConfig[puntosKey]}
                disabled={!activeConfig[activaKey]}
                onChange={e => setConfigForm(prev => ({
                  ...(prev ?? evalConfig),
                  [puntosKey]: e.target.value,
                }))}
              />
              <span className="unidades-eval-points-suffix">{t('unidadEvalScorePointsCol')}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function UnidadEvalMaintenancePanel({
  unidades,
  evalConfig,
  evalItems,
  evalCantidades,
  evalSchemaAvailable,
  savingEval,
  savingItemId,
  savingCantidadKey,
  onSaveConfig,
  onSaveItem,
  onRemoveItem,
  onSetCantidad,
  t,
}) {
  const [configForm, setConfigForm] = useState(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);
  const [editingItemId, setEditingItemId] = useState('');
  const [showItemForm, setShowItemForm] = useState(false);

  const activeConfig = configForm ?? evalConfig ?? DEFAULT_UNIDAD_EVAL_CONFIG;

  const cantidadMap = useMemo(() => {
    const map = {};
    for (const row of evalCantidades || []) {
      if (!row?.unidad_id || !row?.eval_item_id) continue;
      if (!map[row.unidad_id]) map[row.unidad_id] = {};
      map[row.unidad_id][row.eval_item_id] = row.cantidad;
    }
    return map;
  }, [evalCantidades]);

  function resetItemForm() {
    setItemForm(EMPTY_ITEM_FORM);
    setEditingItemId('');
    setShowItemForm(false);
  }

  function startEditItem(item) {
    setEditingItemId(item.id);
    setItemForm({
      nombre: item.nombre || '',
      descripcion: item.descripcion || '',
      puntos: String(item.puntos ?? 1),
    });
    setShowItemForm(true);
  }

  function handleSaveConfig() {
    const normalized = { ...activeConfig };
    for (const group of ATTENDANCE_SCORE_FIELD_GROUPS) {
      for (const field of group.fields) {
        normalized[`${field.key}_puntos`] = parseScorePoints(
          normalized[`${field.key}_puntos`],
          DEFAULT_UNIDAD_EVAL_CONFIG[`${field.key}_puntos`],
        );
      }
    }
    normalized.cuota_puntos = parsePoints(normalized.cuota_puntos, 1);
    onSaveConfig(normalized);
    setConfigForm(null);
  }

  function handleSaveItem() {
    if (!itemForm.nombre.trim()) return;
    onSaveItem({
      itemId: editingItemId || null,
      nombre: itemForm.nombre.trim(),
      descripcion: itemForm.descripcion.trim() || null,
      puntos: parsePoints(itemForm.puntos, 0),
    });
    resetItemForm();
  }

  return (
    <>
      {!evalSchemaAvailable && (
        <div className="alert alert-error" style={{ marginBottom: '12px' }}>
          {t('unidadEvalSchemaHint')}
        </div>
      )}

      <div className="card unidades-eval-card">
        <h2 className="unidades-eval-title">{t('unidadEvalMaintenanceSchemeTitle')}</h2>
        <p className="unidades-eval-intro">{t('unidadEvalAttendanceSchemeHint')}</p>

        {ATTENDANCE_SCORE_FIELD_GROUPS.map(group => (
          <AttendanceScoreGroup
            key={group.titleKey}
            group={group}
            activeConfig={activeConfig}
            evalConfig={evalConfig}
            setConfigForm={setConfigForm}
            t={t}
          />
        ))}

        <div className="unidades-eval-section">
          <h3 className="unidades-eval-section-title">{t('unidadEvalCuotaWeightsTitle')}</h3>
          <p className="unidades-eval-section-hint">{t('unidadEvalCuotaScoreHint')}</p>
          <div className="unidades-eval-weights">
            <label className="unidades-eval-weight-row">
              <input
                type="checkbox"
                checked={activeConfig.cuota_activa}
                onChange={e => setConfigForm(prev => ({
                  ...(prev ?? evalConfig),
                  cuota_activa: e.target.checked,
                }))}
              />
              <span>{t('unidadEvalCuotaLabel')}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-input unidades-eval-points-input"
                value={activeConfig.cuota_puntos}
                disabled={!activeConfig.cuota_activa}
                onChange={e => setConfigForm(prev => ({
                  ...(prev ?? evalConfig),
                  cuota_puntos: e.target.value,
                }))}
              />
              <span className="unidades-eval-points-suffix">{t('unidadEvalCuotaScoreSuffix')}</span>
            </label>
          </div>
        </div>

        <div className="unidades-eval-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={savingEval || !evalSchemaAvailable}
            onClick={handleSaveConfig}
          >
            {savingEval ? t('saving') : t('save')}
          </button>
        </div>
      </div>

      <div className="card unidades-eval-card">
        <div className="unidades-eval-section-header">
          <h2 className="unidades-eval-title">{t('unidadEvalItemsTitle')}</h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!evalSchemaAvailable}
            onClick={() => {
              resetItemForm();
              setShowItemForm(true);
            }}
          >
            + {t('unidadEvalItemAdd')}
          </button>
        </div>
        <p className="unidades-eval-section-hint">{t('unidadEvalItemsHint')}</p>
        <p className="unidades-eval-section-hint">{t('unidadEvalExcellenceHint')}</p>

        {showItemForm && (
          <div className="unidades-eval-item-form">
            <label className="unidades-field">
              <span className="unidades-field__label">{t('unidadEvalItemName')}</span>
              <input
                className="form-input"
                value={itemForm.nombre}
                onChange={e => setItemForm(prev => ({ ...prev, nombre: e.target.value }))}
              />
            </label>
            <label className="unidades-field">
              <span className="unidades-field__label">{t('unidadEvalItemPoints')}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                value={itemForm.puntos}
                onChange={e => setItemForm(prev => ({ ...prev, puntos: e.target.value }))}
              />
            </label>
            <label className="unidades-field unidades-field--full">
              <span className="unidades-field__label">{t('unidadDescription')}</span>
              <input
                className="form-input"
                value={itemForm.descripcion}
                onChange={e => setItemForm(prev => ({ ...prev, descripcion: e.target.value }))}
              />
            </label>
            <div className="unidades-eval-actions">
              <button type="button" className="btn btn-secondary" onClick={resetItemForm}>
                {t('cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={Boolean(savingItemId) || !itemForm.nombre.trim()}
                onClick={handleSaveItem}
              >
                {savingItemId ? t('saving') : t('save')}
              </button>
            </div>
          </div>
        )}

        {evalItems.length === 0 ? (
          <p className="unidades-empty">{t('unidadEvalItemsEmpty')}</p>
        ) : (
          <ul className="unidades-eval-item-list">
            {evalItems.map(item => (
              <li key={item.id} className="unidades-eval-item-row">
                <div>
                  <strong>{item.nombre}</strong>
                  {item.descripcion && (
                    <div className="unidades-table-sub">{item.descripcion}</div>
                  )}
                </div>
                <span className="unidades-eval-item-points">
                  {formatEvalPoints(item.puntos)} {t('unidadEvalPointsAbbrev')}
                </span>
                <div className="unidades-eval-item-actions">
                  <button type="button" className="home-link-btn" onClick={() => startEditItem(item)}>
                    {t('edit')}
                  </button>
                  <button
                    type="button"
                    className="home-link-btn"
                    disabled={savingItemId === item.id}
                    onClick={() => onRemoveItem(item.id)}
                  >
                    {t('delete')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {evalItems.length > 0 && unidades.length > 0 && (
        <div className="card unidades-eval-card">
          <h2 className="unidades-eval-title">{t('unidadEvalCountsTitle')}</h2>
          <p className="unidades-eval-section-hint">{t('unidadEvalCountsHint')}</p>
          <div className="unidades-table-wrap">
            <table className="unidades-table unidades-eval-counts-table">
              <thead>
                <tr>
                  <th>{t('unidadName')}</th>
                  {evalItems.map(item => (
                    <th key={item.id}>{item.nombre}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unidades.map(unidad => (
                  <tr key={unidad.id}>
                    <td><strong>{unidad.nombre}</strong></td>
                    {evalItems.map(item => {
                      const key = `${unidad.id}:${item.id}`;
                      const value = cantidadMap[unidad.id]?.[item.id] ?? 0;
                      return (
                        <td key={item.id}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="form-input unidades-eval-count-input"
                            defaultValue={value}
                            disabled={!evalSchemaAvailable || savingCantidadKey === key}
                            onBlur={e => {
                              const next = parsePoints(e.target.value, 0);
                              if (next !== Number(value)) {
                                onSetCantidad({
                                  unidadId: unidad.id,
                                  evalItemId: item.id,
                                  cantidad: next,
                                });
                              }
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
