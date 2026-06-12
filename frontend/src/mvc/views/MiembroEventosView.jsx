import { useLanguage } from '../../hooks/useLanguage';
import { attendanceLabel } from '../../i18n/helpers';

function AttendanceBadge({ estado, t }) {
  const colors = {
    a_tiempo: { bg: '#dcfce7', color: '#166534' },
    tarde: { bg: '#fef9c3', color: '#854d0e' },
    ausente: { bg: '#fee2e2', color: '#991b1b' },
  };
  const style = colors[estado] || { bg: '#f3f4f6', color: '#4b5563' };

  return (
    <span style={{
      fontSize: '12px',
      fontWeight: 'bold',
      padding: '4px 10px',
      borderRadius: '999px',
      backgroundColor: style.bg,
      color: style.color,
    }}>
      {attendanceLabel(estado, t)}
    </span>
  );
}

export default function MiembroEventosView({
  rows,
  error,
  loading,
  canManage,
  updateAttendance,
  getEventoFromRow,
  getAsistenciaFromRow,
}) {
  const { t } = useLanguage();

  if (loading) {
    return <p>{t('loadingEvents')}</p>;
  }

  return (
    <div>
      <h3>{t('tabEvents')}</h3>
      {error && <div className="alert alert-error">{error}</div>}

      {rows.length === 0 ? (
        <p className="text-muted">{t('noMemberEvents')}</p>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {rows.map(row => {
            const evento = getEventoFromRow(row);
            const asistencia = getAsistenciaFromRow(row);
            const clubName = evento?.clubes?.nombre;

            return (
              <div key={row.id} style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <strong>{evento?.nombre || t('eventUntitled')}</strong>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                      {evento?.fecha} · {String(evento?.hora || '').slice(0, 5)} · {evento?.lugar}
                    </div>
                    {clubName && (
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                        {t('clubLabel')}: {clubName}
                      </div>
                    )}
                  </div>

                  {canManage ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {['a_tiempo', 'tarde', 'ausente'].map(estado => (
                        <button
                          key={estado}
                          type="button"
                          onClick={() => updateAttendance(row.id, estado)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            borderRadius: '4px',
                            border: asistencia === estado ? '2px solid #2563eb' : '1px solid #d1d5db',
                            backgroundColor: asistencia === estado ? '#dbeafe' : '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          {attendanceLabel(estado, t)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <AttendanceBadge estado={asistencia} t={t} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
