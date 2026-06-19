import PasswordReset from '../../components/PasswordReset';
import { useLanguage } from '../../hooks/useLanguage';
import { estadoLabel, roleLabel } from '../../i18n/helpers';
import { PageHelpLink } from '../../components/PageHelp';
import '../../styles/form.css';

const roleColors = { superadmin: '#dc2626', admin: '#2563eb', user: '#16a34a' };
const estadoColors = { activo: '#16a34a', inactivo: '#6b7280', suspendido: '#dc2626' };

export default function UserProfileView({
  user,
  userData,
  loading,
  showPasswordModal,
  setShowPasswordModal,
  error,
  success,
  isEditing,
  isSaving,
  formData,
  setFormData,
  handleEditToggle,
  handleSaveProfile,
  handleLogout,
}) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '40px' }}>
        <p>{t('loadingProfile')}</p>
      </div>
    );
  }

  const userRole = userData?.rol || 'user';
  const userEstado = userData?.estado || 'activo';

  const fields = [
    { key: 'email', labelKey: 'email', readOnly: true, value: userData?.email },
    { key: 'nombre', labelKey: 'firstName' },
    { key: 'apellido1', labelKey: 'lastName1' },
    { key: 'apellido2', labelKey: 'lastName2' },
    { key: 'telefono', labelKey: 'phone', type: 'tel' },
  ];

  return (
    <div className="container">
      <div className="page-header">
        <h1>👤 {t('profile')} <PageHelpLink pageId="profile" /></h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {userData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>{t('personalInfo')}</h3>
              <button onClick={handleEditToggle} style={{ padding: '6px 12px', backgroundColor: isEditing ? '#6b7280' : '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                {isEditing ? `✕ ${t('cancel')}` : `✏️ ${t('edit')}`}
              </button>
            </div>

            <div style={{ display: 'grid', gap: '15px' }}>
              {fields.map(field => (
                <div key={field.key}>
                  <label style={{ fontSize: '0.875rem', color: '#666', marginBottom: '4px', display: 'block' }}>{t(field.labelKey)}</label>
                  {isEditing && !field.readOnly ? (
                    <input
                      type={field.type || 'text'}
                      value={formData[field.key]}
                      onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                      className="form-input"
                      style={{ margin: 0 }}
                    />
                  ) : (
                    <div style={{ padding: '10px 12px', backgroundColor: '#f3f4f6', borderRadius: '4px', fontSize: '14px', color: field.readOnly ? '#999' : 'inherit' }}>
                      {field.value ?? userData[field.key] ?? t('notAvailable')}
                      {field.readOnly && <span style={{ fontSize: '0.75rem' }}> ({t('emailNotEditable')})</span>}
                    </div>
                  )}
                </div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.875rem', color: '#666', marginBottom: '4px', display: 'block' }}>{t('role')}</label>
                  <span className="badge" style={{ backgroundColor: roleColors[userRole] || '#6b7280', color: 'white', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block' }}>
                    {roleLabel(userRole, t).toUpperCase()}
                  </span>
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', color: '#666', marginBottom: '4px', display: 'block' }}>{t('status')}</label>
                  <span className="badge" style={{ backgroundColor: estadoColors[userEstado] || '#6b7280', color: 'white', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block' }}>
                    {estadoLabel(userEstado, t)}
                  </span>
                </div>
              </div>

              {isEditing && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button onClick={handleSaveProfile} disabled={isSaving} style={{ flex: 1, padding: '10px 15px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 'bold', opacity: isSaving ? 0.6 : 1 }}>
                    {isSaving ? `⏳ ${t('saving')}` : `✓ ${t('saveChanges')}`}
                  </button>
                  <button onClick={handleEditToggle} disabled={isSaving} style={{ flex: 1, padding: '10px 15px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 'bold', opacity: isSaving ? 0.6 : 1 }}>
                    ✕ {t('cancel')}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>🔐 {t('security')}</h3>
            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.875rem', color: '#666', marginBottom: '4px', display: 'block' }}>{t('password')}</label>
                <button onClick={() => setShowPasswordModal(true)} style={{ width: '100%', padding: '10px 15px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                  🔑 {t('changePassword')}
                </button>
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', color: '#666', marginBottom: '4px', display: 'block' }}>{t('session')}</label>
                <button onClick={handleLogout} style={{ width: '100%', padding: '10px 15px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                  🚪 {t('signOut')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <PasswordReset onClose={() => setShowPasswordModal(false)} userEmail={user?.email} isOwnPassword={true} />
      )}
    </div>
  );
}
