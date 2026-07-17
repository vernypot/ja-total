import { useLanguage } from '../../hooks/useLanguage';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { estadoLabel, roleLabel } from '../../i18n/helpers';
import { useMiembroSystemAccessController } from '../controllers/useMiembroSystemAccessController';

function usuarioDisplayName(usuario) {
  if (!usuario) return '';
  return [usuario.nombre, usuario.apellido1, usuario.apellido2].filter(Boolean).join(' ');
}

export default function MiembroSystemAccessPanel({ miembroId }) {
  const { t } = useLanguage();
  const { askConfirm, confirmDialog } = useConfirmDialog({
    cancelLabel: t('cancel'),
    confirmingLabel: t('saving'),
  });
  const {
    canManage,
    linkedUsuario,
    unlinkedUsuarios,
    iglesias,
    loading,
    error,
    success,
    fieldErrors,
    saving,
    showPromoteForm,
    setShowPromoteForm,
    showLinkForm,
    setShowLinkForm,
    promoteForm,
    setPromoteForm,
    linkUsuarioId,
    setLinkUsuarioId,
    promoteMember,
    linkExistingUser,
    unlinkUser,
    deactivateSystemAccess,
    reactivateSystemAccess,
  } = useMiembroSystemAccessController(miembroId);

  if (!canManage) return null;

  function confirmUnlink() {
    askConfirm({
      title: t('confirmUnlinkUserTitle'),
      message: t('confirmUnlinkUserMessage'),
      confirmLabel: t('unlinkUserMember'),
      onConfirm: unlinkUser,
    });
  }

  function confirmDeactivate() {
    askConfirm({
      title: t('confirmDeactivateSystemAccessTitle'),
      message: t('confirmDeactivateSystemAccessMessage'),
      confirmLabel: t('deactivateSystemAccess'),
      onConfirm: deactivateSystemAccess,
    });
  }

  return (
    <section style={{
      marginTop: '28px',
      padding: '20px',
      border: '1px solid #dbeafe',
      borderRadius: '8px',
      backgroundColor: '#f8fbff',
    }}>
      <h4 style={{ margin: '0 0 8px' }}>{t('memberSystemAccessTitle')}</h4>
      <p className="text-muted" style={{ margin: '0 0 16px', fontSize: '13px' }}>
        {t('memberSystemAccessHint')}
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading ? (
        <p className="text-muted">{t('loading')}</p>
      ) : linkedUsuario ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{
            padding: '14px 16px',
            borderRadius: '8px',
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ fontWeight: 600 }}>{usuarioDisplayName(linkedUsuario)}</div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {linkedUsuario.email}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 'bold',
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: linkedUsuario.estado === 'activo' ? '#dcfce7' : '#f3f4f6',
                color: linkedUsuario.estado === 'activo' ? '#166534' : '#4b5563',
              }}>
                {estadoLabel(linkedUsuario.estado, t)}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 'bold',
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
              }}>
                {roleLabel(linkedUsuario.rol, t)}
              </span>
            </div>
          </div>

          <p className="text-muted" style={{ margin: 0, fontSize: '13px' }}>
            {t('memberPortalAccessUnaffected')}
          </p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {linkedUsuario.estado === 'activo' ? (
              <button type="button" className="btn btn-sm btn-secondary" disabled={saving} onClick={confirmDeactivate}>
                {t('deactivateSystemAccess')}
              </button>
            ) : (
              <button type="button" className="btn btn-sm btn-primary" disabled={saving} onClick={reactivateSystemAccess}>
                {t('reactivateSystemAccess')}
              </button>
            )}
            <button type="button" className="btn btn-sm btn-secondary" disabled={saving} onClick={confirmUnlink}>
              {t('unlinkUserMember')}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          <p className="text-muted" style={{ margin: 0 }}>{t('memberNoSystemAccess')}</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={saving}
              onClick={() => {
                setShowLinkForm(false);
                setShowPromoteForm(prev => !prev);
              }}
            >
              {showPromoteForm ? t('cancel') : t('promoteMemberToUser')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              disabled={saving}
              onClick={() => {
                setShowPromoteForm(false);
                setShowLinkForm(prev => !prev);
              }}
            >
              {showLinkForm ? t('cancel') : t('linkExistingUser')}
            </button>
          </div>

          {showPromoteForm && (
            <div style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              display: 'grid',
              gap: '12px',
            }}>
              <h5 style={{ margin: 0 }}>{t('promoteMemberToUser')}</h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>{t('email')} *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={promoteForm.email}
                    onChange={e => setPromoteForm({ ...promoteForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>{t('role')}</label>
                  <select className="form-input" value={promoteForm.rol} onChange={e => setPromoteForm({ ...promoteForm, rol: e.target.value })}>
                    <option value="user">{t('roleUser')}</option>
                    <option value="admin">{t('roleAdmin')}</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>{t('churchLabel')} *</label>
                  <select className="form-input" value={promoteForm.iglesia_id} onChange={e => setPromoteForm({ ...promoteForm, iglesia_id: e.target.value })}>
                    <option value="">{t('selectChurch')}</option>
                    {iglesias.map(iglesia => (
                      <option key={iglesia.id} value={iglesia.id}>{iglesia.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>{t('churchRole')}</label>
                  <select className="form-input" value={promoteForm.rol_iglesia} onChange={e => setPromoteForm({ ...promoteForm, rol_iglesia: e.target.value })}>
                    <option value="member">{t('roleMember')}</option>
                    <option value="coordinator">{t('roleCoordinator')}</option>
                    <option value="admin">{t('roleAdmin')}</option>
                  </select>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                <input
                  type="checkbox"
                  checked={promoteForm.sendSetupEmail}
                  onChange={e => setPromoteForm({
                    ...promoteForm,
                    sendSetupEmail: e.target.checked,
                    password: '',
                    confirmPassword: '',
                  })}
                />
                {t('sendPasswordSetupEmail')}
              </label>
              {!promoteForm.sendSetupEmail && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>{t('initialPassword')} *</label>
                    <input
                      type="password"
                      className="form-input"
                      value={promoteForm.password}
                      onChange={e => setPromoteForm({ ...promoteForm, password: e.target.value })}
                    />
                    {fieldErrors.password && <div className="text-danger" style={{ fontSize: '12px' }}>{fieldErrors.password}</div>}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>{t('confirmPassword')} *</label>
                    <input
                      type="password"
                      className="form-input"
                      value={promoteForm.confirmPassword}
                      onChange={e => setPromoteForm({ ...promoteForm, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
              )}
              <button type="button" className="btn btn-primary" disabled={saving} onClick={promoteMember}>
                {saving ? t('saving') : t('promoteMemberToUser')}
              </button>
            </div>
          )}

          {showLinkForm && (
            <div style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              display: 'grid',
              gap: '12px',
            }}>
              <h5 style={{ margin: 0 }}>{t('linkExistingUser')}</h5>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>{t('selectUser')}</label>
                <select className="form-input" value={linkUsuarioId} onChange={e => setLinkUsuarioId(e.target.value)}>
                  <option value="">{t('selectUser')}</option>
                  {unlinkedUsuarios.map(usuario => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuarioDisplayName(usuario)} ({usuario.email})
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" className="btn btn-primary" disabled={saving || !linkUsuarioId} onClick={linkExistingUser}>
                {saving ? t('saving') : t('linkExistingUser')}
              </button>
            </div>
          )}
        </div>
      )}
      {confirmDialog}
    </section>
  );
}
