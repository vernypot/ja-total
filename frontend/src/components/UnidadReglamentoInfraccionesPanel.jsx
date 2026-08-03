import { useMemo, useState } from 'react';
import { getReglamentoPenaltyLeaves } from '../utils/reglamento';

const EMPTY_INFRACTION = {
  reglamento_nodo_id: '',
  cantidad: '1',
  fecha: new Date().toISOString().slice(0, 10),
  notas: '',
};

export default function UnidadReglamentoInfraccionesPanel({
  canManage,
  unidades,
  reglamentoNodos,
  infracciones,
  schemaAvailable,
  savingInfraccionId,
  onSaveInfraccion,
  onRemoveInfraccion,
  t,
}) {
  const [form, setForm] = useState(EMPTY_INFRACTION);
  const [selectedUnidadId, setSelectedUnidadId] = useState('');
  const [showForm, setShowForm] = useState(false);

  const penaltyRules = useMemo(
    () => getReglamentoPenaltyLeaves(reglamentoNodos),
    [reglamentoNodos],
  );

  const rulesById = useMemo(() => {
    const map = {};
    for (const rule of penaltyRules) {
      map[rule.id] = rule;
    }
    return map;
  }, [penaltyRules]);

  if (!canManage) return null;

  function resetForm() {
    setForm(EMPTY_INFRACTION);
    setSelectedUnidadId('');
    setShowForm(false);
  }

  function handleSubmit() {
    if (!selectedUnidadId || !form.reglamento_nodo_id) return;
    onSaveInfraccion({
      unidadId: selectedUnidadId,
      reglamentoNodoId: form.reglamento_nodo_id,
      cantidad: Number(form.cantidad) || 1,
      fecha: form.fecha || null,
      notas: form.notas.trim() || null,
    });
    resetForm();
  }

  return (
    <div className="card unidades-eval-card">
      <h2 className="unidades-eval-title">{t('reglamentoInfractionsTitle')}</h2>
      <p className="unidades-eval-intro">{t('reglamentoInfractionsHint')}</p>

      {!schemaAvailable && (
        <div className="alert alert-error" style={{ marginBottom: '12px' }}>
          {t('reglamentoSchemaHint')}
        </div>
      )}

      {penaltyRules.length === 0 ? (
        <p className="reglamento-empty">{t('reglamentoInfractionsNoRules')}</p>
      ) : (
        <>
          <div className="reglamento-infractions-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={!schemaAvailable || !unidades.length}
              onClick={() => setShowForm(true)}
            >
              + {t('reglamentoInfractionAdd')}
            </button>
          </div>

          {showForm && (
            <div className="reglamento-infraction-form">
              <label className="unidades-field">
                <span className="unidades-field__label">{t('unidadName')}</span>
                <select
                  className="form-input"
                  value={selectedUnidadId}
                  onChange={e => setSelectedUnidadId(e.target.value)}
                >
                  <option value="">{t('selectUnidad')}</option>
                  {unidades.map(unidad => (
                    <option key={unidad.id} value={unidad.id}>{unidad.nombre}</option>
                  ))}
                </select>
              </label>
              <label className="unidades-field">
                <span className="unidades-field__label">{t('reglamentoInfractionRule')}</span>
                <select
                  className="form-input"
                  value={form.reglamento_nodo_id}
                  onChange={e => setForm(prev => ({ ...prev, reglamento_nodo_id: e.target.value }))}
                >
                  <option value="">{t('reglamentoInfractionSelectRule')}</option>
                  {penaltyRules.map(rule => (
                    <option key={rule.id} value={rule.id}>
                      {rule.titulo} (−{rule.puntos_penalizacion})
                    </option>
                  ))}
                </select>
              </label>
              <label className="unidades-field">
                <span className="unidades-field__label">{t('reglamentoInfractionCount')}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={form.cantidad}
                  onChange={e => setForm(prev => ({ ...prev, cantidad: e.target.value }))}
                />
              </label>
              <label className="unidades-field">
                <span className="unidades-field__label">{t('reglamentoInfractionDate')}</span>
                <input
                  type="date"
                  className="form-input"
                  value={form.fecha}
                  onChange={e => setForm(prev => ({ ...prev, fecha: e.target.value }))}
                />
              </label>
              <label className="unidades-field unidades-field--full">
                <span className="unidades-field__label">{t('reglamentoInfractionNotes')}</span>
                <input
                  className="form-input"
                  value={form.notas}
                  onChange={e => setForm(prev => ({ ...prev, notas: e.target.value }))}
                />
              </label>
              <div className="reglamento-editor-form__actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!selectedUnidadId || !form.reglamento_nodo_id || Boolean(savingInfraccionId)}
                  onClick={handleSubmit}
                >
                  {savingInfraccionId ? t('saving') : t('save')}
                </button>
              </div>
            </div>
          )}

          {infracciones.length > 0 && (
            <div className="unidades-table-wrap" style={{ marginTop: '16px' }}>
              <table className="unidades-table">
                <thead>
                  <tr>
                    <th>{t('unidadName')}</th>
                    <th>{t('reglamentoInfractionRule')}</th>
                    <th>{t('reglamentoInfractionCount')}</th>
                    <th>{t('reglamentoInfractionDate')}</th>
                    <th>{t('reglamentoPenaltyCol')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {infracciones.map(row => {
                    const unidad = unidades.find(item => item.id === row.unidad_id);
                    const rule = rulesById[row.reglamento_nodo_id]
                      || reglamentoNodos.find(item => item.id === row.reglamento_nodo_id);
                    const penalty = (Number(row.cantidad) || 0) * (Number(rule?.puntos_penalizacion) || 0);
                    return (
                      <tr key={row.id}>
                        <td>{unidad?.nombre || '—'}</td>
                        <td>{rule?.titulo || '—'}</td>
                        <td>{row.cantidad}</td>
                        <td>{row.fecha || '—'}</td>
                        <td>−{penalty}</td>
                        <td>
                          <button
                            type="button"
                            className="home-link-btn"
                            disabled={savingInfraccionId === row.id}
                            onClick={() => onRemoveInfraccion(row.id)}
                          >
                            {t('delete')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
