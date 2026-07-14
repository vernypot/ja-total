import { useMemo } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { PageHelpLink } from '../../components/PageHelp';
import {
  AttendanceBadge,
  AttendanceControls,
  ConfirmationBadge,
  ConfirmationControls,
} from '../../components/EventAttendanceControls';
import '../../styles/eventAttendance.css';

function MemberEventCard({
  row,
  t,
  canManage,
  updateAttendance,
  updateConfirmation,
  getEventoFromRow,
  getAsistenciaFromRow,
  getCheckedInAtFromRow,
  getConfirmacionFromRow,
  memberAttendedEvent,
  eventRequiresConfirmation,
  getTipoEventoNombre,
}) {
  const evento = getEventoFromRow(row);
  const asistencia = getAsistenciaFromRow(row);
  const confirmacion = getConfirmacionFromRow(row);
  const checkedInAt = getCheckedInAtFromRow(row);
  const clubName = evento?.clubes?.nombre;
  const tipoNombre = getTipoEventoNombre(evento);
  const needsConfirmation = eventRequiresConfirmation(evento);
  const attended = memberAttendedEvent(row);

  return (
    <div className={`list-item${attended ? ' member-event-attended' : ''}`}>
      <div className="event-attendance-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <strong>{evento?.nombre || t('eventUntitled')}</strong>
            {attended && (
              <span className="member-event-attended-badge">{t('memberEventAttended')}</span>
            )}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {evento?.fecha} · {String(evento?.hora || '').slice(0, 5)} · {evento?.lugar}
            {tipoNombre && <> · {tipoNombre}</>}
          </div>
          {clubName && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {t('clubLabel')}: {clubName}
            </div>
          )}
          {checkedInAt && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {t('checkedInAt')}: {new Date(checkedInAt).toLocaleString()}
              <span className="checkin-session-qr-badge">{t('checkinViaQr')}</span>
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
}

export default function MiembroEventosView({
  rows,
  allRows,
  attendedCount,
  attendanceFilter,
  setAttendanceFilter,
  error,
  loading,
  canManage,
  updateAttendance,
  updateConfirmation,
  getEventoFromRow,
  getAsistenciaFromRow,
  getCheckedInAtFromRow,
  getConfirmacionFromRow,
  memberAttendedEvent,
  eventRequiresConfirmation,
  getTipoEventoNombre,
}) {
  const { t } = useLanguage();

  const attendedRows = useMemo(
    () => allRows.filter(memberAttendedEvent),
    [allRows, memberAttendedEvent]
  );

  const otherRows = useMemo(() => {
    if (attendanceFilter === 'attended') return [];
    return rows.filter(row => !memberAttendedEvent(row));
  }, [rows, attendanceFilter, memberAttendedEvent]);

  if (loading) {
    return <p>{t('loadingEvents')}</p>;
  }

  const cardProps = {
    t,
    canManage,
    updateAttendance,
    updateConfirmation,
    getEventoFromRow,
    getAsistenciaFromRow,
    getCheckedInAtFromRow,
    getConfirmacionFromRow,
    memberAttendedEvent,
    eventRequiresConfirmation,
    getTipoEventoNombre,
  };

  return (
    <div>
      <h3>{t('tabEvents')} <PageHelpLink pageId="memberEvents" compact /></h3>
      {error && <div className="alert alert-error">{error}</div>}

      {allRows.length > 0 && (
        <div className="member-events-toolbar">
          <span className="member-events-attended-summary">
            {t('memberEventsAttendedSummary').replace('{count}', String(attendedCount))}
          </span>
          <div className="member-events-filter">
            <button
              type="button"
              className={attendanceFilter === 'all' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary'}
              onClick={() => setAttendanceFilter('all')}
            >
              {t('memberEventsFilterAll')}
            </button>
            <button
              type="button"
              className={attendanceFilter === 'attended' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary'}
              onClick={() => setAttendanceFilter('attended')}
            >
              {t('memberEventsFilterAttended')}
            </button>
          </div>
        </div>
      )}

      {allRows.length === 0 ? (
        <p className="text-muted">{t('noMemberEvents')}</p>
      ) : (
        <>
          {attendanceFilter === 'all' && attendedRows.length > 0 && (
            <section className="member-events-attended-section">
              <h4 className="member-events-section-title">{t('memberEventsAttendedSection')}</h4>
              <div style={{ display: 'grid', gap: '12px' }}>
                {attendedRows.map(row => (
                  <MemberEventCard key={`attended-${row.id}`} row={row} {...cardProps} />
                ))}
              </div>
            </section>
          )}

          {attendanceFilter === 'attended' && attendedRows.length === 0 ? (
            <p className="text-muted">{t('noMemberEventsAttended')}</p>
          ) : attendanceFilter === 'attended' ? (
            <div style={{ display: 'grid', gap: '12px' }}>
              {attendedRows.map(row => (
                <MemberEventCard key={row.id} row={row} {...cardProps} />
              ))}
            </div>
          ) : (
            <>
              {otherRows.length > 0 && (
                <section className="member-events-other-section">
                  <h4 className="member-events-section-title">{t('memberEventsOtherSection')}</h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {otherRows.map(row => (
                      <MemberEventCard key={row.id} row={row} {...cardProps} />
                    ))}
                  </div>
                </section>
              )}
              {otherRows.length === 0 && attendedRows.length > 0 && (
                <p className="text-muted">{t('memberEventsAllAttended')}</p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
