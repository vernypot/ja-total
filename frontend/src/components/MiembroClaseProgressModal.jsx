import { useEffect, useState } from 'react';
import {
  MIEMBRO_CLASE_PROGRESO_ESTADOS,
  applyMiembroClaseProgresoEstadoToDraft,
  buildMiembroClaseProgressDraft,
  isMiembroClaseProgressDraftValid,
  miembroClaseProgresoEstadoLabel,
} from '../constants/miembroClaseProgresoEstado';
import MiembroClaseProgresoEstadoBadge from './MiembroClaseProgresoEstadoBadge';
import DatePickerInput from './DatePickerInput';

export default function MiembroClaseProgressModal({
  claseNombre,
  assignment,
  canManage,
  saving,
  defaultValidatorName,
  t,
  onClose,
  onSave,
}) {
  const [draft, setDraft] = useState(() => buildMiembroClaseProgressDraft(assignment, defaultValidatorName));

  useEffect(() => {
    setDraft(buildMiembroClaseProgressDraft(assignment, defaultValidatorName));
  }, [assignment, defaultValidatorName]);

  const readOnly = !canManage;
  const showCompletionDate = draft.estado_progreso === 'completada' || draft.estado_progreso === 'investida';
  const showInvestidura = draft.estado_progreso === 'investida';

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
          maxWidth: '440px',
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#111827' }}>{t('classProgress')}</h3>
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#4b5563' }}>{claseNombre}</p>
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
          {readOnly ? (
            <>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>{t('memberClassStatus')}: </span>
                <MiembroClaseProgresoEstadoBadge assignment={assignment} t={t} />
              </div>
              {showCompletionDate && draft.fecha_completado && (
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>{t('classCompletionDate')}: </span>
                  <strong>{draft.fecha_completado}</strong>
                </div>
              )}
              {showInvestidura && (
                <>
                  {draft.investidura_fecha && (
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>{t('investiduraDate')}: </span>
                      <strong>{draft.investidura_fecha}</strong>
                    </div>
                  )}
                  {draft.investidura_lugar && (
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>{t('investiduraPlace')}: </span>
                      <strong>{draft.investidura_lugar}</strong>
                    </div>
                  )}
                  {draft.investidura_validado_por_nombre && (
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>{t('validatedBy')}: </span>
                      <strong>{draft.investidura_validado_por_nombre}</strong>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <label style={{ display: 'grid', gap: '6px' }}>
                <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>{t('memberClassStatus')}</span>
                <select
                  value={draft.estado_progreso}
                  disabled={saving}
                  onChange={e => setDraft(prev => applyMiembroClaseProgresoEstadoToDraft(
                    prev,
                    e.target.value,
                    defaultValidatorName,
                  ))}
                  className="form-input"
                  style={{ margin: 0, fontSize: '13px' }}
                >
                  {MIEMBRO_CLASE_PROGRESO_ESTADOS.map(estado => (
                    <option key={estado} value={estado}>
                      {miembroClaseProgresoEstadoLabel(estado, t)}
                    </option>
                  ))}
                </select>
              </label>

              {showCompletionDate && (
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{t('classCompletionDate')}</span>
                  <DatePickerInput
                    value={draft.fecha_completado}
                    disabled={saving}
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
                      disabled={saving}
                      onChange={e => setDraft(prev => ({ ...prev, investidura_fecha: e.target.value }))}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '4px' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{t('investiduraPlace')}</span>
                    <input
                      type="text"
                      value={draft.investidura_lugar}
                      disabled={saving}
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
                      disabled={saving}
                      placeholder={t('validatedByPlaceholder')}
                      onChange={e => setDraft(prev => ({ ...prev, investidura_validado_por_nombre: e.target.value }))}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                    />
                  </label>
                </>
              )}
            </>
          )}
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
                disabled={saving || !isMiembroClaseProgressDraftValid(draft)}
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
