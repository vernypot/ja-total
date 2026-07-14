import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { PageHelpLink } from '../components/PageHelp';
import EventCheckinScanner from '../components/EventCheckinScanner';
import { AttendanceBadge, EventActionButton } from '../components/EventAttendanceControls';
import { useEventCheckinController } from '../mvc/controllers/useEventCheckinController';
import '../styles/eventAttendance.css';

export default function Checkin() {
  const { t } = useLanguage();
  const {
    eventoId,
    evento,
    rows,
    recordedCount,
    loading,
    error,
    notice,
    canManage,
    sessionStarted,
    scannerEnabled,
    beginEvent,
    checkin,
    memberDisplayName,
    getAsistenciaFromRow,
    getCheckedInAtFromRow,
    getTipoEventoNombre,
  } = useEventCheckinController();

  if (!eventoId) {
    return (
      <div className="container" style={{ padding: '24px' }}>
        <h1>{t('memberCheckin')} <PageHelpLink pageId="checkin" /></h1>
        <div className="alert alert-warning">{t('checkinSelectEventHint')}</div>
        <p className="text-muted">{t('checkinLandingHint')}</p>
        <Link to="/dashboard/eventos" className="btn btn-primary" style={{ marginTop: '12px' }}>
          {t('goToEvents')}
        </Link>
      </div>
    );
  }

  const tipoNombre = getTipoEventoNombre(evento);

  return (
    <div className="container checkin-session-page">
      <div className="page-header">
        <div>
          <h1>
            {sessionStarted ? t('eventStartedTitle') : t('memberCheckin')}
            {' '}
            <PageHelpLink pageId="checkin" />
          </h1>
          {evento && (
            <>
              <p className="checkin-session-event-title">
                <strong>{evento.nombre || t('eventUntitled')}</strong>
              </p>
              <p className="checkin-session-event-meta">
                {evento.fecha} · {String(evento.hora || '').slice(0, 5)} · {evento.lugar}
                {tipoNombre && <> · {tipoNombre}</>}
              </p>
              {evento.clubes?.nombre && (
                <p className="checkin-session-event-meta">
                  {t('clubLabel')}: {evento.clubes.nombre}
                </p>
              )}
            </>
          )}
        </div>
        <Link to="/dashboard/eventos" className="btn btn-secondary">
          {t('goToEvents')}
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && !error && (
        <div className="alert checkin-session-notice">{notice}</div>
      )}

      {loading ? (
        <p>{t('loading')}</p>
      ) : !canManage ? (
        <div className="alert alert-warning">{t('checkinNoPermission')}</div>
      ) : !sessionStarted ? (
        <section className="event-start-scan-cta card">
          <h2 style={{ marginTop: 0 }}>{t('startEvent')}</h2>
          <p>{t('startEventScanHint')}</p>
          <EventActionButton tone="success" onClick={beginEvent}>
            ▶ {t('startEvent')}
          </EventActionButton>
        </section>
      ) : (
        <>
          <div className="event-started-banner">
            {t('eventStartedBanner')}
          </div>

          <EventCheckinScanner
            eventoId={eventoId}
            scannerId="checkin-session-qr-reader"
            disabled={!scannerEnabled}
            onCheckin={checkin}
          />

          <section className="checkin-session-registry card">
            <div className="checkin-session-registry-head">
              <h2>{t('eventAttendanceRegistry')}</h2>
              <span className="checkin-session-registry-count">
                {t('attendanceSummary')
                  .replace('{assigned}', String(rows.length))
                  .replace('{recorded}', String(recordedCount))}
              </span>
            </div>

            {rows.length === 0 ? (
              <p className="text-muted">{t('eventQrAttendanceEmpty')}</p>
            ) : (
              <div className="checkin-session-registry-list">
                {rows.map(row => {
                  const asistencia = getAsistenciaFromRow(row);
                  const checkedInAt = getCheckedInAtFromRow(row);
                  return (
                    <div key={row.id} className="checkin-session-registry-item">
                      <div>
                        <strong>{memberDisplayName(row.miembros)}</strong>
                        {checkedInAt && (
                          <div className="checkin-session-registry-time">
                            {t('checkedInAt')}: {new Date(checkedInAt).toLocaleString()}
                            <span className="checkin-session-qr-badge">{t('checkinViaQr')}</span>
                          </div>
                        )}
                      </div>
                      <AttendanceBadge estado={asistencia} t={t} />
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
