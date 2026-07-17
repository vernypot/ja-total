import { useLanguage } from '../../hooks/useLanguage';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import FormField from '../../components/FormField';
import { PageHelpLink } from '../../components/PageHelp';
import { clubDisplayName } from '../../utils/club';
import '../../styles/form.css';

export default function MiembroDistincionesView({
  assigned,
  assignable,
  memberClubs,
  error,
  fieldErrors,
  loading,
  showForm,
  form,
  setForm,
  canManage,
  hasTable,
  startAssign,
  closeForm,
  assignDistincion,
  unassignDistincion,
  getDistincionFromRow,
}) {
  const { t } = useLanguage();
  const { askConfirm, confirmDialog } = useConfirmDialog({
    cancelLabel: t('cancel'),
    confirmingLabel: t('saving'),
  });

  function confirmUnassign(linkId, name) {
    askConfirm({
      title: t('confirmUnassignDistincionTitle'),
      message: t('confirmUnassignDistincionMessage'),
      highlight: name,
      confirmLabel: t('remove'),
      onConfirm: async () => { await unassignDistincion(linkId); },
    });
  }

  if (loading) {
    return <p>{t('loadingData')}</p>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>{t('tabDistinciones')} <PageHelpLink pageId="memberDistinciones" compact /></h3>
        {canManage && !showForm && (
          <button
            type="button"
            onClick={startAssign}
            disabled={!hasTable || assignable.length === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: assignable.length === 0 ? 'not-allowed' : 'pointer',
              opacity: assignable.length === 0 ? 0.6 : 1,
            }}
          >
            ➕ {t('assignDistincion')}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: '12px' }}>{error}</div>}
      {!hasTable && (
        <div className="alert alert-error" style={{ marginTop: '12px' }}>{t('distincionesSchemaMissing')}</div>
      )}

      {showForm && canManage && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
          <h4 style={{ marginTop: 0 }}>{t('assignDistincion')}</h4>
          <div className="form-grid">
            <FormField label={t('distincionLabel')} htmlFor="miembro-distincion" error={fieldErrors.distincion_id} required>
              <select
                id="miembro-distincion"
                className="form-input"
                value={form.distincion_id}
                onChange={e => setForm(f => ({ ...f, distincion_id: e.target.value }))}
              >
                <option value="">{t('selectDistincion')}</option>
                {assignable.map(item => (
                  <option key={item.id} value={item.id}>{item.nombre}</option>
                ))}
              </select>
            </FormField>
            <FormField label={t('clubLabel')} htmlFor="miembro-distincion-club">
              <select
                id="miembro-distincion-club"
                className="form-input"
                value={form.club_id}
                onChange={e => setForm(f => ({ ...f, club_id: e.target.value }))}
              >
                <option value="">{t('optional')}</option>
                {memberClubs.map(club => (
                  <option key={club.id} value={club.id}>{clubDisplayName(club)}</option>
                ))}
              </select>
            </FormField>
            <FormField label={t('distincionDateAwarded')} htmlFor="miembro-distincion-fecha" error={fieldErrors.fecha_otorgada} required>
              <input
                id="miembro-distincion-fecha"
                type="date"
                className="form-input"
                value={form.fecha_otorgada}
                onChange={e => setForm(f => ({ ...f, fecha_otorgada: e.target.value }))}
              />
            </FormField>
            <FormField label={t('notes')} htmlFor="miembro-distincion-notas">
              <input
                id="miembro-distincion-notas"
                className="form-input"
                value={form.notas}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              />
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={assignDistincion}
              style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              ✓ {t('save')}
            </button>
            <button
              type="button"
              onClick={closeForm}
              style={{ padding: '8px 16px', backgroundColor: 'var(--color-btn-neutral)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              ✕ {t('cancel')}
            </button>
          </div>
        </div>
      )}

      <h4 style={{ marginTop: '24px' }}>{t('assignedDistinciones')}</h4>
      {assigned.length === 0 ? (
        <p className="text-muted">{t('noAssignedDistinciones')}</p>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {assigned.map(row => {
            const dist = getDistincionFromRow(row);
            const club = row.clubes;
            return (
              <div key={row.id} style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div>
                    <strong>{dist?.nombre || t('notAvailable')}</strong>
                    {dist?.descripcion && (
                      <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        {dist.descripcion}
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                      {t('distincionDateAwarded')}: {row.fecha_otorgada || '—'}
                      {club?.nombre && (
                        <span style={{ marginLeft: '12px' }}>
                          {t('clubLabel')}: {club.nombre}
                        </span>
                      )}
                    </div>
                    {row.notas && (
                      <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '4px' }}>
                        {t('notes')}: {row.notas}
                      </div>
                    )}
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => confirmUnassign(row.id, dist?.nombre || t('notAvailable'))}
                      style={{ padding: '6px 12px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}
                    >
                      ✕ {t('remove')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {confirmDialog}
    </div>
  );
}
