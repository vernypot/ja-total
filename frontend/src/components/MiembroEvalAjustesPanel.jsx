import { useMemo, useState } from 'react';
import { formatEvalPoints } from '../utils/unidadEvaluacion';
import '../styles/reglamento.css';

const EMPTY_FORM = {
  puntos: '',
  fecha: new Date().toISOString().slice(0, 10),
  motivo: '',
};

const APPLY_MODES = ['individual', 'bulk', 'unidad'];

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function MiembroEvalAjustesPanel({
  canManage,
  clubId,
  unidades = [],
  members = [],
  membersById = {},
  ajustes = [],
  schemaAvailable = true,
  savingAjusteId,
  onSaveAjuste,
  onRemoveAjuste,
  memberDisplayName,
  fixedMemberId = null,
  t,
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, fecha: todayDateInputValue() });
  const [showForm, setShowForm] = useState(false);
  const [applyMode, setApplyMode] = useState(fixedMemberId ? 'individual' : 'individual');
  const [selectedMemberId, setSelectedMemberId] = useState(fixedMemberId || '');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [selectedUnidadId, setSelectedUnidadId] = useState('');

  const assignedMembers = useMemo(() => {
    const ids = new Set();
    for (const unidad of unidades) {
      for (const row of unidad.miembro_unidad || []) {
        if (row.miembro_id) ids.add(row.miembro_id);
      }
    }
    return members.filter(member => member?.id && ids.has(member.id));
  }, [unidades, members]);

  const visibleAjustes = useMemo(() => {
    if (!fixedMemberId) return ajustes;
    return ajustes.filter(row => row.miembro_id === fixedMemberId);
  }, [ajustes, fixedMemberId]);

  const unidadMemberIds = useMemo(() => {
    if (!selectedUnidadId) return [];
    const unidad = unidades.find(item => item.id === selectedUnidadId);
    return (unidad?.miembro_unidad || [])
      .map(row => row.miembro_id)
      .filter(Boolean);
  }, [selectedUnidadId, unidades]);

  if (!canManage) return null;

  function resetForm() {
    setForm({ ...EMPTY_FORM, fecha: todayDateInputValue() });
    if (!fixedMemberId) {
      setSelectedMemberId('');
      setSelectedMemberIds([]);
      setSelectedUnidadId('');
    }
    setShowForm(false);
  }

  function toggleBulkMember(memberId) {
    setSelectedMemberIds(prev => (
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    ));
  }

  function resolveTargetMemberIds() {
    if (fixedMemberId) return [fixedMemberId];
    if (applyMode === 'individual') {
      return selectedMemberId ? [selectedMemberId] : [];
    }
    if (applyMode === 'bulk') {
      return selectedMemberIds;
    }
    return unidadMemberIds;
  }

  function handleSubmit() {
    const puntos = Number(form.puntos);
    const motivo = form.motivo.trim();
    const memberIds = resolveTargetMemberIds();

    if (!clubId || !Number.isFinite(puntos) || !motivo || memberIds.length === 0) {
      return;
    }

    onSaveAjuste({
      memberIds,
      puntos,
      fecha: form.fecha || null,
      motivo,
      applyMode: fixedMemberId ? 'individual' : applyMode,
    });
    resetForm();
  }

  const canSubmit = Boolean(
    clubId
    && form.motivo.trim()
    && form.puntos !== ''
    && Number.isFinite(Number(form.puntos))
    && resolveTargetMemberIds().length > 0
    && !savingAjusteId,
  );

  return (
    <div className="card unidades-eval-card">
      <h2 className="unidades-eval-title">{t('memberEvalAjustesTitle')}</h2>
      <p className="unidades-eval-intro">{t('memberEvalAjustesHint')}</p>

      {!schemaAvailable && (
        <div className="alert alert-error" style={{ marginBottom: '12px' }}>
          {t('memberEvalAjustesSchemaHint')}
        </div>
      )}

      <div className="reglamento-infractions-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={!schemaAvailable || !clubId}
          onClick={() => setShowForm(true)}
        >
          + {t('memberEvalAjusteAdd')}
        </button>
      </div>

      {showForm && (
        <div className="reglamento-infraction-form">
          {!fixedMemberId && (
            <label className="unidades-field unidades-field--full">
              <span className="unidades-field__label">{t('memberEvalAjusteApplyMode')}</span>
              <select
                className="form-input"
                value={applyMode}
                onChange={e => {
                  setApplyMode(e.target.value);
                  setSelectedMemberId('');
                  setSelectedMemberIds([]);
                  setSelectedUnidadId('');
                }}
              >
                {APPLY_MODES.map(mode => (
                  <option key={mode} value={mode}>{t(`memberEvalAjusteMode_${mode}`)}</option>
                ))}
              </select>
            </label>
          )}

          {!fixedMemberId && applyMode === 'individual' && (
            <label className="unidades-field unidades-field--full">
              <span className="unidades-field__label">{t('members')}</span>
              <select
                className="form-input"
                value={selectedMemberId}
                onChange={e => setSelectedMemberId(e.target.value)}
              >
                <option value="">{t('memberEvalAjusteSelectMember')}</option>
                {assignedMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {memberDisplayName(member)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {!fixedMemberId && applyMode === 'bulk' && (
            <div className="unidades-field unidades-field--full">
              <span className="unidades-field__label">{t('memberEvalAjusteBulkMembers')}</span>
              {assignedMembers.length === 0 ? (
                <p className="reglamento-empty">{t('memberEvalAjusteNoMembers')}</p>
              ) : (
                <div className="member-eval-ajuste-bulk-list">
                  {assignedMembers.map(member => (
                    <label key={member.id} className="member-eval-ajuste-bulk-item">
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(member.id)}
                        onChange={() => toggleBulkMember(member.id)}
                      />
                      <span>{memberDisplayName(member)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {!fixedMemberId && applyMode === 'unidad' && (
            <label className="unidades-field unidades-field--full">
              <span className="unidades-field__label">{t('unidadName')}</span>
              <select
                className="form-input"
                value={selectedUnidadId}
                onChange={e => setSelectedUnidadId(e.target.value)}
              >
                <option value="">{t('selectUnidad')}</option>
                {unidades.map(unidad => (
                  <option key={unidad.id} value={unidad.id}>
                    {unidad.nombre} ({(unidad.miembro_unidad || []).length})
                  </option>
                ))}
              </select>
              {selectedUnidadId && (
                <p className="member-eval-ajuste-unidad-note">
                  {t('memberEvalAjusteUnidadCount').replace('{count}', String(unidadMemberIds.length))}
                </p>
              )}
            </label>
          )}

          <label className="unidades-field">
            <span className="unidades-field__label">{t('memberEvalAjustePoints')}</span>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={form.puntos}
              onChange={e => setForm(prev => ({ ...prev, puntos: e.target.value }))}
              placeholder={t('memberEvalAjustePointsPlaceholder')}
            />
          </label>

          <label className="unidades-field">
            <span className="unidades-field__label">{t('memberEvalAjusteDate')}</span>
            <input
              type="date"
              className="form-input"
              value={form.fecha}
              onChange={e => setForm(prev => ({ ...prev, fecha: e.target.value }))}
            />
          </label>

          <label className="unidades-field unidades-field--full">
            <span className="unidades-field__label">{t('memberEvalAjusteReason')}</span>
            <textarea
              className="form-input"
              rows={3}
              value={form.motivo}
              onChange={e => setForm(prev => ({ ...prev, motivo: e.target.value }))}
              placeholder={t('memberEvalAjusteReasonPlaceholder')}
            />
          </label>

          <div className="reglamento-editor-form__actions">
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              {t('cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {savingAjusteId ? t('saving') : t('save')}
            </button>
          </div>
        </div>
      )}

      {visibleAjustes.length > 0 && (
        <div className="unidades-table-wrap" style={{ marginTop: '16px' }}>
          <table className="unidades-table">
            <thead>
              <tr>
                {!fixedMemberId && <th>{t('members')}</th>}
                <th>{t('memberEvalAjustePoints')}</th>
                <th>{t('memberEvalAjusteDate')}</th>
                <th>{t('memberEvalAjusteReason')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleAjustes.map(row => {
                const member = membersById[row.miembro_id];
                const puntos = Number(row.puntos);
                const puntosLabel = puntos > 0
                  ? `+${formatEvalPoints(puntos)}`
                  : formatEvalPoints(puntos);
                return (
                  <tr key={row.id}>
                    {!fixedMemberId && (
                      <td>{member ? memberDisplayName(member) : '—'}</td>
                    )}
                    <td>{puntosLabel}</td>
                    <td>{row.fecha || '—'}</td>
                    <td>{row.motivo || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="home-link-btn"
                        disabled={savingAjusteId === row.id}
                        onClick={() => {
                          if (window.confirm(t('memberEvalAjusteDeleteConfirm'))) {
                            onRemoveAjuste(row.id);
                          }
                        }}
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
    </div>
  );
}
