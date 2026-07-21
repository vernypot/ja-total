import { useEffect, useState } from 'react';
import {
  MIEMBRO_CLASE_PROGRESO_ESTADOS,
  applyHistorialEstadoToDraft,
  buildHistorialDraft,
  isHistorialDraftValid,
  miembroClaseProgresoEstadoLabel,
} from '../constants/miembroClaseProgresoEstado';
import { clubDisplayName } from '../utils/club';
import DatePickerInput from './DatePickerInput';

export default function MiembroClaseHistorialModal({
  row = null,
  catalogClases = [],
  memberClubs = [],
  canManage,
  saving,
  defaultValidatorName,
  t,
  onClose,
  onSave,
}) {
  const [draft, setDraft] = useState(() => buildHistorialDraft(row, defaultValidatorName));

  useEffect(() => {
    setDraft(buildHistorialDraft(row, defaultValidatorName));
  }, [row, defaultValidatorName]);

  const readOnly = !canManage;
  const showCompletionDate = draft.estado_progreso === 'completada' || draft.estado_progreso === 'investida';
  const showInvestidura = draft.estado_progreso === 'investida';
  const isNew = !row?.id;

  function handleCatalogPick(claseId) {
    const clase = catalogClases.find(c => c.id === claseId);
    setDraft(prev => ({
      ...prev,
      clase_progresiva_id: claseId,
      nombre: clase?.nombre || prev.nombre,
    }));
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.18)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#111827' }}>
              {isNew ? t('addHistorialClass') : t('editHistorialClass')}
            </h3>
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#6b7280' }}>{t('historialClassesHint')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gap: '14px', fontSize: '13px' }}>
          {canManage && catalogClases.length > 0 && (
            <label style={{ display: 'grid', gap: '6px' }}>
              <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>{t('pickFromCatalog')}</span>
              <select
                value={draft.clase_progresiva_id}
                disabled={saving}
                onChange={e => handleCatalogPick(e.target.value)}
                className="form-input"
                style={{ margin: 0, fontSize: '13px' }}
              >
                <option value="">{t('customClassName')}</option>
                {catalogClases.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </label>
          )}

          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>{t('className')}</span>
            <input
              type="text"
              value={draft.nombre}
              disabled={saving || readOnly}
              placeholder={t('classNamePlaceholder')}
              onChange={e => setDraft(prev => ({ ...prev, nombre: e.target.value }))}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
            />
          </label>

          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>{t('historialClub')}</span>
            <select
              value={draft.club_id}
              disabled={saving || readOnly}
              onChange={e => setDraft(prev => ({
                ...prev,
                club_id: e.target.value,
                club_nombre: e.target.value ? '' : prev.club_nombre,
              }))}
              className="form-input"
              style={{ margin: 0, fontSize: '13px' }}
            >
              <option value="">{t('historialClubNone')}</option>
              {memberClubs.map(club => (
                <option key={club.id} value={club.id}>{clubDisplayName(club)}</option>
              ))}
            </select>
          </label>

          {!draft.club_id && (
            <label style={{ display: 'grid', gap: '6px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>{t('historialClubOther')}</span>
              <input
                type="text"
                value={draft.club_nombre}
                disabled={saving || readOnly}
                placeholder={t('historialClubOtherPlaceholder')}
                onChange={e => setDraft(prev => ({ ...prev, club_nombre: e.target.value }))}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
              />
            </label>
          )}

          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>{t('memberClassStatus')}</span>
            {readOnly ? (
              <strong>
                {draft.estado_progreso
                  ? miembroClaseProgresoEstadoLabel(draft.estado_progreso, t)
                  : t('memberClassStatusUnspecified')}
              </strong>
            ) : (
              <select
                value={draft.estado_progreso}
                disabled={saving}
                onChange={e => setDraft(prev => applyHistorialEstadoToDraft(
                  prev,
                  e.target.value,
                  defaultValidatorName,
                ))}
                className="form-input"
                style={{ margin: 0, fontSize: '13px' }}
              >
                <option value="">{t('memberClassStatusUnspecified')}</option>
                {MIEMBRO_CLASE_PROGRESO_ESTADOS.map(estado => (
                  <option key={estado} value={estado}>
                    {miembroClaseProgresoEstadoLabel(estado, t)}
                  </option>
                ))}
              </select>
            )}
          </label>

          {showCompletionDate && (
            <label style={{ display: 'grid', gap: '4px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>{t('classCompletionDate')}</span>
              <DatePickerInput
                value={draft.fecha_completado}
                disabled={saving || readOnly}
                onChange={e => setDraft(prev => ({ ...prev, fecha_completado: e.target.value }))}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
              />
            </label>
          )}

          {showInvestidura && (
            <>
              <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: 0 }} />
              <label style={{ display: 'grid', gap: '4px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{t('investiduraDate')}</span>
                <DatePickerInput
                  value={draft.investidura_fecha}
                  disabled={saving || readOnly}
                  onChange={e => setDraft(prev => ({ ...prev, investidura_fecha: e.target.value }))}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                />
              </label>
              <label style={{ display: 'grid', gap: '4px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{t('investiduraPlace')}</span>
                <input
                  type="text"
                  value={draft.investidura_lugar}
                  disabled={saving || readOnly}
                  placeholder={t('investiduraPlacePlaceholder')}
                  onChange={e => setDraft(prev => ({ ...prev, investidura_lugar: e.target.value }))}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                />
              </label>
              <label style={{ display: 'grid', gap: '4px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{t('validatedBy')}</span>
                <input
                  type="text"
                  value={draft.investidura_validado_por_nombre}
                  disabled={saving || readOnly}
                  placeholder={t('validatedByPlaceholder')}
                  onChange={e => setDraft(prev => ({ ...prev, investidura_validado_por_nombre: e.target.value }))}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                />
              </label>
            </>
          )}

          <label style={{ display: 'grid', gap: '4px' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>{t('notes')}</span>
            <textarea
              value={draft.notas}
              disabled={saving || readOnly}
              rows={2}
              onChange={e => setDraft(prev => ({ ...prev, notas: e.target.value }))}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb', resize: 'vertical' }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
          {!canManage && (
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 14px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
            >
              {t('close')}
            </button>
          )}
          {canManage && (
            <>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '8px 14px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={saving || !isHistorialDraftValid(draft)}
                onClick={() => onSave(draft)}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: saving ? 'wait' : 'pointer',
                  fontSize: '13px',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? t('saving') : t('save')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
