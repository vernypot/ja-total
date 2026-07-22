import { Link } from 'react-router-dom';
import PasswordReset from '../../components/PasswordReset';
import { useLanguage } from '../../hooks/useLanguage';
import { estadoLabel, roleLabel } from '../../i18n/helpers';
import ListSearchInput from '../../components/ListSearchInput';
import ListPagination from '../../components/ListPagination';
import { PageHelpLink } from '../../components/PageHelp';
import '../../styles/form.css';

const fieldKeys = {
  nombre: 'firstName',
  apellido1: 'lastName1',
  apellido2: 'lastName2',
  email: 'email',
  telefono: 'phone',
};

export default function UsuariosView({
  usuarios,
  searchQuery,
  setSearchQuery,
  iglesias,
  loading,
  error,
  success,
  showForm,
  setShowForm,
  editingId,
  showPasswordReset,
  selectedUserEmail,
  form,
  setForm,
  showInactive,
  setShowInactive,
  handleSave,
  toggleEstado,
  handleEdit,
  resetForm,
  openPasswordReset,
  closePasswordReset,
  listPagination,
}) {
  const { t } = useLanguage();
  const isSearching = searchQuery.trim().length > 0;

  if (loading) {
    return <div className="container"><div className="loading">{t('loadingUsers')}</div></div>;
  }

  const tableHeaders = ['firstName', 'email', 'linkedMember', 'churchLabel', 'role', 'status', 'phone', 'created', 'actions'];

  return (
    <div className="container">
      <div className="page-header">
        <h1>🔑 {t('userManagement')} <PageHelpLink pageId="users" /></h1>
        <button
          style={{ padding: '10px 15px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
          onClick={() => { resetForm(); setShowForm(!showForm); }}
        >
          {showForm ? `✕ ${t('cancel')}` : `➕ ${t('newUser')}`}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="card" style={{ padding: '20px', backgroundColor: '#f0f9ff', border: '2px solid #0891b2', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? `✏️ ${t('editUser')}` : `➕ ${t('createNewUser')}`}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            {Object.entries(fieldKeys).map(([field, labelKey]) => (
              <div key={field}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  {t(labelKey)}{(field === 'nombre' || field === 'email') ? ' *' : ''}
                </label>
                <input
                  type={field === 'email' ? 'email' : field === 'telefono' ? 'tel' : 'text'}
                  value={form[field]}
                  onChange={e => setForm({ ...form, [field]: e.target.value })}
                  placeholder={t(labelKey)}
                  className="form-input"
                  disabled={field === 'email' && !!editingId}
                  style={{ margin: 0 }}
                />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('role')}</label>
              <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })} className="form-input" style={{ margin: 0 }}>
                <option value="user">{t('roleUser')}</option>
                <option value="admin">{t('roleAdmin')}</option>
                <option value="superadmin">{t('roleSuperadmin')}</option>
              </select>
            </div>
            {editingId && (
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('status')}</label>
                <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} className="form-input" style={{ margin: 0 }}>
                  <option value="activo">{t('active')}</option>
                  <option value="inactivo">{t('inactive')}</option>
                  <option value="suspendido">{t('suspended')}</option>
                </select>
              </div>
            )}
            {!editingId && (
              <>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                    <input
                      type="checkbox"
                      checked={form.sendSetupEmail}
                      onChange={e => setForm({
                        ...form,
                        sendSetupEmail: e.target.checked,
                        password: '',
                        confirmPassword: '',
                      })}
                    />
                    {t('sendPasswordSetupEmail')}
                  </label>
                  <p className="text-muted" style={{ margin: '8px 0 0', fontSize: '13px' }}>
                    {t('sendPasswordSetupEmailHint')}
                  </p>
                </div>
                {!form.sendSetupEmail && (
                  <>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        {t('initialPassword')} *
                      </label>
                      <input
                        type="password"
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        placeholder={t('initialPassword')}
                        className="form-input"
                        style={{ margin: 0 }}
                      />
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '5px' }}>
                        {t('passwordHintShort')}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        {t('confirmPassword')} *
                      </label>
                      <input
                        type="password"
                        value={form.confirmPassword}
                        onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                        placeholder={t('confirmPassword')}
                        className="form-input"
                        style={{ margin: 0 }}
                      />
                    </div>
                  </>
                )}
              </>
            )}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('churchLabel')} *</label>
              <select
                value={form.iglesia_id}
                onChange={e => setForm({ ...form, iglesia_id: e.target.value })}
                className="form-input"
                style={{ margin: 0 }}
                required
              >
                <option value="">{t('selectChurch')}</option>
                {iglesias.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('churchRole')}</label>
              <select value={form.rol_iglesia} onChange={e => setForm({ ...form, rol_iglesia: e.target.value })} className="form-input" style={{ margin: 0 }}>
                <option value="member">{t('roleMember')}</option>
                <option value="coordinator">{t('roleCoordinator')}</option>
                <option value="admin">{t('roleAdmin')}</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSave} style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
              ✓ {editingId ? t('update') : t('create')}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} style={{ padding: '10px 20px', backgroundColor: 'var(--color-btn-neutral)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
              ✕ {t('cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0 }}>👥 {t('usersCount')} ({listPagination?.totalItems ?? usuarios.length})</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <ListSearchInput value={searchQuery} onChange={setSearchQuery} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
              {t('showInactive')}
            </label>
          </div>
        </div>
        <ListPagination {...listPagination} />
        {usuarios.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>
            {isSearching ? t('noSearchResults') : t('noUsers')}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                  {tableHeaders.map(h => (
                    <th key={h} style={{ padding: '12px', textAlign: h === 'actions' ? 'center' : 'left', fontWeight: 'bold' }}>{t(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map(usuario => (
                  <tr key={usuario.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px' }}>
                      <strong>{usuario.nombre}</strong>
                      {usuario.apellido1 && ` ${usuario.apellido1}`}
                      {usuario.apellido2 && ` ${usuario.apellido2}`}
                    </td>
                    <td style={{ padding: '12px' }}>{usuario.email}</td>
                    <td style={{ padding: '12px' }}>
                      {usuario.linked_miembro_id ? (
                        <Link to={`/dashboard/miembro/${usuario.linked_miembro_id}/datos`}>
                          {usuario.linked_miembro_nombre || t('memberDetail')}
                        </Link>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {usuario.iglesia_nombre || '—'}
                      {usuario.rol_iglesia && usuario.iglesia_nombre && (
                        <div className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                          {roleLabel(usuario.rol_iglesia, t)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>{roleLabel(usuario.rol, t)}</td>
                    <td style={{ padding: '12px' }}>
                      <span className={`badge badge-${usuario.estado}`}>{estadoLabel(usuario.estado, t)}</span>
                    </td>
                    <td style={{ padding: '12px' }}>{usuario.telefono || '—'}</td>
                    <td style={{ padding: '12px' }}>{new Date(usuario.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => handleEdit(usuario)} className="btn btn-sm btn-edit" title={t('edit')}>✏️ {t('edit')}</button>
                        <button onClick={() => openPasswordReset(usuario.email)} className="btn btn-sm btn-edit" title={t('resetPassword')}>🔑</button>
                        <button
                          onClick={() => toggleEstado(usuario)}
                          className={`btn btn-sm ${usuario.estado === 'activo' ? 'btn-danger' : 'btn-success'}`}
                          title={usuario.estado === 'activo' ? t('deactivate') : t('activate')}
                        >
                          {usuario.estado === 'activo' ? `❌ ${t('deactivate')}` : `✓ ${t('activate')}`}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {listPagination?.totalPages > 1 && <ListPagination {...listPagination} />}
      </div>

      {showPasswordReset && (
        <PasswordReset onClose={closePasswordReset} userEmail={selectedUserEmail} isOwnPassword={false} />
      )}
    </div>
  );
}
