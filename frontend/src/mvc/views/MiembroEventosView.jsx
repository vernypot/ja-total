import { useLanguage } from '../../hooks/useLanguage';
import { PageHelpLink } from '../../components/PageHelp';
import {
  AttendanceBadge,
  AttendanceControls,
  ConfirmationBadge,
  ConfirmationControls,
} from '../../components/EventAttendanceControls';

export default function MiembroEventosView({
  rows,
  error,
  loading,
  canManage,
  updateAttendance,
  updateConfirmation,
  getEventoFromRow,
  getAsistenciaFromRow,
  getConfirmacionFromRow,
  eventRequiresConfirmation,
  getTipoEventoNombre,
}) {
  const { t } = useLanguage();

  if (loading) {
    return <p>{t('loadingEvents')}</p>;
  }

  return (
    <div>
      <h3>{t('tabEvents')} <PageHelpLink pageId="memberEvents" compact /></h3>
      {error && <div className="alert alert-error">{error}</div>}

      {rows.length === 0 ? (
        <p className="text-muted">{t('noMemberEvents')}</p>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {rows.map(row => {
            const evento = getEventoFromRow(row);
            const asistencia = getAsistenciaFromRow(row);
            const confirmacion = getConfirmacionFromRow(row);
            const clubName = evento?.clubes?.nombre;
            const tipoNombre = getTipoEventoNombre(evento);
            const needsConfirmation = eventRequiresConfirmation(evento);

            return (
              <div key={row.id} className="list-item">
                <div className="event-attendance-row">
                  <div>
                    <strong>{evento?.nombre || t('eventUntitled')}</strong>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      {evento?.fecha} · {String(evento?.hora || '').slice(0, 5)} · {evento?.lugar}
                      {tipoNombre && <> · {tipoNombre}</>}
                    </div>
                    {clubName && (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        {t('clubLabel')}: {clubName}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                    {needsConfirmation && (
                      <div>
                        <div className="event-attendance-row-label">{t('attendanceConfirmation')}</div>
                        {canManage ? (
                          <ConfirmationControls
                            eventoMiembroId={row.id}
                            eventoId={evento?.id}
                            current={confirmacion}
                            canManage={canManage}
                            onSet={(eventoMiembroId, estado) => updateConfirmation(eventoMiembroId, estado)}
                            t={t}
                          />
                        ) : (
                          <ConfirmationBadge estado={confirmacion} t={t} />
                        )}
                      </div>
                    )}

                    <div>
                      <div className="event-attendance-row-label">{t('attendanceList')}</div>
                      {canManage ? (
                        <AttendanceControls
                          eventoMiembroId={row.id}
                          eventoId={evento?.id}
                          current={asistencia}
                          canManage={canManage}
                          onSet={(eventoMiembroId, estado) => updateAttendance(eventoMiembroId, estado)}
                          t={t}
                        />
                      ) : (
                        <AttendanceBadge estado={asistencia} t={t} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
