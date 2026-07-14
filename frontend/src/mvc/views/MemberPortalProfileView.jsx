import '../../styles/form.css';

export default function MemberPortalProfileView({
  profile,
  fullName,
  displayPhotoUrl,
  fields,
  clubs,
  iglesias,
  error,
  loading,
  calcularEdad,
  t,
}) {
  if (loading) return <div className="container loading" style={{ padding: '24px' }}>{t('loadingData')}</div>;
  if (error) return <div className="container alert alert-error" style={{ margin: '24px' }}>{error}</div>;
  if (!profile) return <div className="container text-muted" style={{ padding: '24px' }}>{t('noMemberData')}</div>;

  return (
    <div className="container" style={{ maxWidth: '900px', margin: '0 auto', padding: '8px 0' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: '0 0 6px' }}>{t('portalProfileTitle')}</h1>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{t('portalProfileSubtitle')}</p>
      </div>

      <div style={{
        display: 'flex',
        gap: '20px',
        alignItems: 'flex-start',
        marginBottom: '24px',
        padding: '20px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
      }}>
        <div style={{
          width: '96px',
          height: '96px',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {displayPhotoUrl ? (
            <img src={displayPhotoUrl} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '36px' }}>👤</span>
          )}
        </div>
        <div>
          <h2 style={{ margin: '0 0 8px' }}>{fullName}</h2>
          {profile.fecha_nacimiento && (
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
              {calcularEdad(profile.fecha_nacimiento)} {t('yearsOld')} • {profile.fecha_nacimiento}
            </p>
          )}
          {clubs.length > 0 && (
            <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              {t('clubs')}: {clubs.map(club => club.nombre).join(', ')}
            </p>
          )}
        </div>
      </div>

      {(iglesias?.length > 0 || clubs?.length > 0) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
          marginBottom: '16px',
        }}>
          {iglesias?.length > 0 && (
            <div style={{ padding: '14px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontWeight: 'bold', color: '#2563eb', marginBottom: '6px' }}>{t('portalMyChurches')}</div>
              <div>{iglesias.map(i => i.nombre).join(', ')}</div>
            </div>
          )}
          {clubs?.length > 0 && (
            <div style={{ padding: '14px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontWeight: 'bold', color: '#2563eb', marginBottom: '6px' }}>{t('portalMyClubs')}</div>
              <div>{clubs.map(c => `${c.nombre}${c.iglesia_nombre ? ` (${c.iglesia_nombre})` : ''}`).join(', ')}</div>
            </div>
          )}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '16px',
      }}>
        {fields.map(({ key, labelKey, fullWidth }) => (
          <div
            key={key}
            style={{
              gridColumn: fullWidth ? '1 / -1' : undefined,
              padding: '14px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
            }}
          >
            <div style={{ fontWeight: 'bold', color: '#2563eb', marginBottom: '6px' }}>{t(labelKey)}</div>
            <div>{profile[key] || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
