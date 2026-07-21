import { useLanguage } from '../../hooks/useLanguage';
import { PageHelpLink } from '../../components/PageHelp';
import FormField from '../../components/FormField';
import DatePickerInput from '../../components/DatePickerInput';

function formatCargoDate(value, t) {
  if (!value) return t('cargoStartUnknown');
  return value;
}

function CargoAssignmentCard({
  row,
  canManage,
  t,
  getCargoFromLink,
  getCargoPath,
  onEdit,
  onClose,
  isCurrent,
}) {
  const cargo = getCargoFromLink(row);
  const path = getCargoPath(cargo?.id).map(c => c.nombre).join(' › ');
  const clubName = row.clubes?.nombre;

  return (
    <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div>
          <strong>{cargo?.nombre || t('notAvailable')}</strong>
          {path && path !== cargo?.nombre && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {t('cargoPath')}: {path}
            </div>
          )}
          {clubName && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {t('clubLabel')}: {clubName}
            </div>
          )}
          <div style={{ fontSize: '13px', marginTop: '8px', color: '#374151' }}>
            <div>
              {t('planStartDate')}: {formatCargoDate(row.fecha_inicio, t)}
            </div>
            <div>
              {t('planEndDate')}: {row.en_curso ? t('cargoOngoing') : formatCargoDate(row.fecha_fin, t)}
            </div>
            {isCurrent && (
              <span style={{ display: 'inline-block', marginTop: '6px', padding: '2px 8px', borderRadius: '999px', background: '#dcfce7', color: '#166534', fontSize: '12px' }}>
                {t('cargoOngoing')}
              </span>
            )}
          </div>
          {row.notas && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
              {t('notes')}: {row.notas}
            </div>
          )}
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onEdit(row)}
              style={{ padding: '6px 12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
            >
              ✏️ {t('edit')}
            </button>
            {isCurrent && (
              <button
                type="button"
                onClick={() => onClose(row.id)}
                style={{ padding: '6px 12px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                {t('closeCargo')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MiembroCargosView({
  active,
  history,
  assignableCargos,
  memberClubs,
  memberTipos,
  error,
  fieldErrors,
  loading,
  showForm,
  editingId,
  form,
  setForm,
  canManage,
  resetForm,
  startAssign,
  startEdit,
  saveAssignment,
  closeAssignment,
  getCargoFromLink,
  getCargoPath,
}) {
  const { t } = useLanguage();

  if (loading) {
    return <p>{t('loadingData')}</p>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>{t('tabCargos')} <PageHelpLink pageId="memberCargos" compact /></h3>
        {canManage && !showForm && (
          <button
            type="button"
            onClick={startAssign}
            style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ➕ {t('assignCargo')}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: '12px' }}>{error}</div>}

      {memberTipos.length === 0 && (
        <p style={{ color: '#b45309', fontSize: '14px', marginTop: '12px' }}>{t('memberNoClubsForClasses')}</p>
      )}

      {showForm && canManage && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
          <h4 style={{ marginTop: 0 }}>{editingId ? t('editCargoAssignment') : t('assignCargo')}</h4>
          <div className="form-grid">
            {!editingId && (
              <FormField label={t('cargo')} htmlFor="miembro-cargo" error={fieldErrors.cargo_id} required>
                <select
                  id="miembro-cargo"
                  className="form-input"
                  value={form.cargo_id}
                  onChange={e => setForm(f => ({ ...f, cargo_id: e.target.value }))}
                >
                  <option value="">{t('selectCargo')}</option>
                  {assignableCargos.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </FormField>
            )}
            <FormField label={t('clubLabel')} htmlFor="miembro-cargo-club">
              <select
                id="miembro-cargo-club"
                className="form-input"
                value={form.club_id}
                onChange={e => setForm(f => ({ ...f, club_id: e.target.value }))}
              >
                <option value="">{t('optional')}</option>
                {memberClubs.map(club => (
                  <option key={club.id} value={club.id}>{club.nombre}</option>
                ))}
              </select>
            </FormField>
            <FormField label={t('planStartDate')} htmlFor="miembro-cargo-inicio" error={fieldErrors.fecha_inicio}>
              <DatePickerInput
                id="miembro-cargo-inicio"
                className="form-input"
                value={form.fecha_inicio}
                disabled={form.inicioDesconocido}
                onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))}
              />
            </FormField>
            <FormField label={t('cargoStartUnknown')} htmlFor="miembro-cargo-inicio-unknown">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <input
                  id="miembro-cargo-inicio-unknown"
                  type="checkbox"
                  checked={form.inicioDesconocido}
                  onChange={e => setForm(f => ({
                    ...f,
                    inicioDesconocido: e.target.checked,
                    fecha_inicio: e.target.checked ? '' : f.fecha_inicio,
                  }))}
                />
                {t('cargoStartUnknownHint')}
              </label>
            </FormField>
            <FormField label={t('cargoOngoing')} htmlFor="miembro-cargo-en-curso">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <input
                  id="miembro-cargo-en-curso"
                  type="checkbox"
                  checked={form.en_curso}
                  onChange={e => setForm(f => ({
                    ...f,
                    en_curso: e.target.checked,
                    fecha_fin: e.target.checked ? '' : f.fecha_fin,
                  }))}
                />
                {t('cargoOngoingHint')}
              </label>
            </FormField>
            {!form.en_curso && (
              <FormField label={t('planEndDate')} htmlFor="miembro-cargo-fin" error={fieldErrors.fecha_fin} required>
                <DatePickerInput
                  id="miembro-cargo-fin"
                  className="form-input"
                  value={form.fecha_fin}
                  onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))}
                  required
                />
              </FormField>
            )}
            <FormField label={t('notes')} htmlFor="miembro-cargo-notas" className="form-grid-full">
              <textarea
                id="miembro-cargo-notas"
                className="form-input"
                rows={2}
                value={form.notas}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              />
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button type="button" className="btn btn-primary" onClick={saveAssignment}>
              {t('save')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      <h4 style={{ marginTop: '24px' }}>{t('currentCargos')}</h4>
      {active.length === 0 ? (
        <p className="text-muted">{t('noCurrentCargos')}</p>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {active.map(row => (
            <CargoAssignmentCard
              key={row.id}
              row={row}
              canManage={canManage}
              t={t}
              getCargoFromLink={getCargoFromLink}
              getCargoPath={getCargoPath}
              onEdit={startEdit}
              onClose={closeAssignment}
              isCurrent
            />
          ))}
        </div>
      )}

      <h4 style={{ marginTop: '24px' }}>{t('cargoHistory')}</h4>
      {history.length === 0 ? (
        <p className="text-muted">{t('noCargoHistory')}</p>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {history.map(row => (
            <CargoAssignmentCard
              key={row.id}
              row={row}
              canManage={canManage}
              t={t}
              getCargoFromLink={getCargoFromLink}
              getCargoPath={getCargoPath}
              onEdit={startEdit}
              onClose={closeAssignment}
              isCurrent={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
