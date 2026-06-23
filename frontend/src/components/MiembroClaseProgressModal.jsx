import { useEffect, useState } from 'react';

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildDraft(assignment, defaultValidatorName) {
  return {
    completado: assignment?.completado || false,
    fecha_completado: assignment?.fecha_completado || '',
    tiene_investidura: assignment?.tiene_investidura || false,
    investidura_fecha: assignment?.investidura_fecha || '',
    investidura_lugar: assignment?.investidura_lugar || '',
    investidura_validado_por_nombre:
      assignment?.investidura_validado_por_nombre || defaultValidatorName || '',
  };
}

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
  const [draft, setDraft] = useState(() => buildDraft(assignment, defaultValidatorName));

  useEffect(() => {
    setDraft(buildDraft(assignment, defaultValidatorName));
  }, [assignment, defaultValidatorName]);

  const readOnly = !canManage;

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
                <span style={{ color: '#6b7280' }}>{t('classCompleted')}: </span>
                <strong style={{ color: draft.completado ? '#059669' : '#6b7280' }}>
                  {draft.completado ? '✓' : t('requirementPending')}
                </strong>
              </div>
              {draft.completado && draft.fecha_completado && (
                <div>
                  <span style={{ color: '#6b7280' }}>{t('classCompletionDate')}: </span>
                  <strong>{draft.fecha_completado}</strong>
                </div>
              )}
              <div>
                <span style={{ color: '#6b7280' }}>{t('hadInvestidura')}: </span>
                <strong>{draft.tiene_investidura ? t('yes') : t('no')}</strong>
              </div>
              {draft.tiene_investidura && (
                <>
                  {draft.investidura_fecha && (
                    <div>
                      <span style={{ color: '#6b7280' }}>{t('investiduraDate')}: </span>
                      <strong>{draft.investidura_fecha}</strong>
                    </div>
                  )}
                  {draft.investidura_lugar && (
                    <div>
                      <span style={{ color: '#6b7280' }}>{t('investiduraPlace')}: </span>
                      <strong>{draft.investidura_lugar}</strong>
                    </div>
                  )}
                  {draft.investidura_validado_por_nombre && (
                    <div>
                      <span style={{ color: '#6b7280' }}>{t('validatedBy')}: </span>
                      <strong>{draft.investidura_validado_por_nombre}</strong>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={draft.completado}
                  disabled={saving}
                  onChange={e => {
                    const checked = e.target.checked;
                    setDraft(prev => ({
                      ...prev,
                      completado: checked,
                      fecha_completado: checked ? (prev.fecha_completado || todayIsoDate()) : '',
                    }));
                  }}
                />
                <span>{t('classCompleted')}</span>
              </label>
              <label style={{ display: 'grid', gap: '4px' }}>
                <span style={{ color: '#6b7280' }}>{t('classCompletionDate')}</span>
                <input
                  type="date"
                  value={draft.fecha_completado}
                  disabled={saving || !draft.completado}
                  onChange={e => setDraft(prev => ({ ...prev, fecha_completado: e.target.value }))}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                />
              </label>

              <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: 0 }} />

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={draft.tiene_investidura}
                  disabled={saving}
                  onChange={e => {
                    const checked = e.target.checked;
                    setDraft(prev => ({
                      ...prev,
                      tiene_investidura: checked,
                      investidura_fecha: checked ? (prev.investidura_fecha || todayIsoDate()) : '',
                      investidura_lugar: checked ? prev.investidura_lugar : '',
                      investidura_validado_por_nombre: checked
                        ? (prev.investidura_validado_por_nombre || defaultValidatorName)
                        : '',
                    }));
                  }}
                />
                <span>{t('hadInvestidura')}</span>
              </label>
              {draft.tiene_investidura && (
                <>
                  <label style={{ display: 'grid', gap: '4px' }}>
                    <span style={{ color: '#6b7280' }}>{t('investiduraDate')}</span>
                    <input
                      type="date"
                      value={draft.investidura_fecha}
                      disabled={saving}
                      onChange={e => setDraft(prev => ({ ...prev, investidura_fecha: e.target.value }))}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '4px' }}>
                    <span style={{ color: '#6b7280' }}>{t('investiduraPlace')}</span>
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
                    <span style={{ color: '#6b7280' }}>{t('validatedBy')}</span>
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
                disabled={
                  saving
                  || (draft.completado && !draft.fecha_completado)
                  || (draft.tiene_investidura && !draft.investidura_fecha)
                }
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
