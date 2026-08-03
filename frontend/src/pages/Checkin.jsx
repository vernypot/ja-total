import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { PageHelpLink } from '../components/PageHelp';
import ListPagination from '../components/ListPagination';
import EventCheckinScanner from '../components/EventCheckinScanner';
import EventDescriptionToggle from '../components/EventDescriptionToggle';
import { AttendanceControls, ConfirmationControls, EventActionButton } from '../components/EventAttendanceControls';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { useEventCheckinController } from '../mvc/controllers/useEventCheckinController';
import * as EventosModel from '../mvc/models/eventos.model';
import '../styles/eventAttendance.css';

function InitializeEventPanel({
  evento,
  activityStartDraft,
  setActivityStartDraft,
  initializeEvent,
  saveActivityStartManual,
  savingActivityStart,
  formatTimestamp,
  canManage,
  t,
}) {
  const initialized = Boolean(
    evento?.actividad_inicio_at || evento?.evento_asistencia_grupo?.actividad_inicio_at
  );
  const initializedAt = evento?.actividad_inicio_at || evento?.evento_asistencia_grupo?.actividad_inicio_at;

  return (
    <section className="event-checkin-action card event-checkin-action--initialize">
      <h2 style={{ marginTop: 0 }}>{t('initializeEvent')}</h2>
      <p className="event-checkin-action__hint">{t('initializeEventHint')}</p>

      {initialized ? (
        <p className="event-checkin-action__status">
          <strong>{t('eventInitializedAt')}:</strong> {formatTimestamp(initializedAt)}
        </p>
      ) : (
        <p className="text-muted event-checkin-action__status">{t('activityStartNotSet')}</p>
      )}

      {canManage && (
        <>
          <EventActionButton
            tone="primary"
            onClick={initializeEvent}
            disabled={initialized || savingActivityStart}
          >
            ▶ {savingActivityStart ? t('loading') : t('initializeEvent')}
          </EventActionButton>
          {initialized && (
            <p className="text-muted" style={{ margin: '8px 0 0', fontSize: '13px' }}>
              {t('eventAlreadyInitialized')}
            </p>
          )}
          {!initialized && (
            <details className="event-checkin-action__manual">
              <summary>{t('eventActivityStartField')}</summary>
              <div className="event-checkin-action__manual-body">
                <input
                  type="datetime-local"
                  className="form-input"
                  value={activityStartDraft}
                  onChange={e => setActivityStartDraft(e.target.value)}
                />
                <EventActionButton
                  tone="muted"
                  onClick={saveActivityStartManual}
                  disabled={!activityStartDraft || savingActivityStart}
                >
                  {savingActivityStart ? t('loading') : t('saveActivityStart')}
                </EventActionButton>
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}

function ScanAttendeesPanel({ onScan, startingScan, isActive, t }) {
  return (
    <section className="event-checkin-action card event-checkin-action--scan">
      <h2 style={{ marginTop: 0 }}>{t('scanAttendees')}</h2>
      <p className="event-checkin-action__hint">{t('scanAttendeesHint')}</p>
      <EventActionButton tone="success" onClick={onScan} disabled={!isActive || startingScan}>
        ▶ {startingScan ? t('loading') : t('scanAttendees')}
      </EventActionButton>
    </section>
  );
}

export default function Checkin() {
  const { t, language } = useLanguage();
  const { askConfirm, confirmDialog } = useConfirmDialog();
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
    isActive,
    isEnded,
    isExcludedFromAttendance,
    scannerEnabled,
    beginEvent,
    endEvent,
    checkin,
    activityStartDraft,
    setActivityStartDraft,
    markActivityStartedNow,
    saveActivityStartManual,
    savingActivityStart,
    startingScan,
    formatTimestamp,
    grupoEventos,
    memberDisplayName,
    getAsistenciaFromRow,
    getConfirmacionFromRow,
    getCheckedInAtFromRow,
    getTipoEventoNombre,
    setConfirmation,
    setAttendance,
    needsConfirmation,
    listPagination,
  } = useEventCheckinController();

  function buildConfirmBeforeConfirmation(eventName, memberName) {
    return (estado, proceed) => {
      if (estado !== 'rechazado') {
        proceed();
        return;
      }
      askConfirm({
        title: t('confirmRejectConfirmationTitle'),
        message: t('confirmRejectConfirmationMessage'),
        highlight: memberName || eventName,
        confirmLabel: t('approvalRequestReject'),
        onConfirm: proceed,
      });
    };
  }

  function buildConfirmBeforeAttendance(eventName, memberName) {
    return (estado, proceed) => {
      if (estado !== 'ausente') {
        proceed();
        return;
      }
      askConfirm({
        title: t('confirmMarkAbsentTitle'),
        message: t('confirmMarkAbsentMessage'),
        highlight: memberName || eventName,
        confirmLabel: t('attendanceAbsent'),
        onConfirm: proceed,
      });
    };
  }

  const eventName = evento?.nombre || t('eventUntitled');

  function confirmEndEvent() {
    askConfirm({
      title: t('confirmEndEventTitle'),
      message: t('endEventConfirm'),
      highlight: evento?.nombre || t('eventUntitled'),
      confirmLabel: t('endEvent'),
      onConfirm: endEvent,
    });
  }

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
                {evento.fecha} · {EventosModel.formatEventLocalTime(evento.hora, language)} · {evento.lugar}
                {tipoNombre && <> · {tipoNombre}</>}
              </p>
              {evento.clubes?.nombre && (
                <p className="checkin-session-event-meta">
                  {t('clubLabel')}: {evento.clubes.nombre}
                </p>
              )}
              {evento.actividad_inicio_at && (
                <p className="checkin-session-event-meta">
                  {t('eventInitializedAt')}: {formatTimestamp(evento.actividad_inicio_at || evento.evento_asistencia_grupo?.actividad_inicio_at)}
                </p>
              )}
              {(evento.escaneo_inicio_at || evento.evento_asistencia_grupo?.escaneo_inicio_at) && (
                <p className="checkin-session-event-meta">
                  {t('scanStartAt')}: {formatTimestamp(evento.escaneo_inicio_at || evento.evento_asistencia_grupo?.escaneo_inicio_at)}
                </p>
              )}
              {grupoEventos.length > 1 && (
                <>
                  <p className="event-merge-badge checkin-session-event-meta">
                    {t('eventMergedAttendanceBadge')}: {grupoEventos.map(e => e.nombre || t('eventUntitled')).join(', ')}
                  </p>
                  <p className="text-muted checkin-session-event-meta">{t('eventMergedAttendanceHint')}</p>
                </>
              )}
              <EventDescriptionToggle description={evento.descripcion} />
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
      ) : isExcludedFromAttendance ? (
        <div className="alert alert-warning">{t('checkinExcludedFromAttendance')}</div>
      ) : isEnded ? (
        <div className="alert alert-warning">{t('eventEndedHint')}</div>
      ) : !sessionStarted ? (
        <div className="event-checkin-actions">
          <InitializeEventPanel
            evento={evento}
            activityStartDraft={activityStartDraft}
            setActivityStartDraft={setActivityStartDraft}
            initializeEvent={markActivityStartedNow}
            saveActivityStartManual={saveActivityStartManual}
            savingActivityStart={savingActivityStart}
            formatTimestamp={formatTimestamp}
            canManage={canManage}
            t={t}
          />
          <ScanAttendeesPanel
            onScan={beginEvent}
            startingScan={startingScan}
            isActive={isActive}
            t={t}
          />
        </div>
      ) : (
        <>
          {!evento?.actividad_inicio_at && (
            <InitializeEventPanel
              evento={evento}
              activityStartDraft={activityStartDraft}
              setActivityStartDraft={setActivityStartDraft}
              initializeEvent={markActivityStartedNow}
              saveActivityStartManual={saveActivityStartManual}
              savingActivityStart={savingActivityStart}
              formatTimestamp={formatTimestamp}
              canManage={canManage}
              t={t}
            />
          )}

          <div className="event-started-banner">
            {t('eventStartedBanner')}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <EventActionButton tone="muted" onClick={confirmEndEvent}>
              ⏹ {t('endEvent')}
            </EventActionButton>
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
                  .replace('{assigned}', String(listPagination?.totalItems ?? rows.length))
                  .replace('{recorded}', String(recordedCount))}
              </span>
            </div>

            <ListPagination {...listPagination} />

            {rows.length === 0 ? (
              <p className="text-muted">{t('eventQrAttendanceEmpty')}</p>
            ) : (
              <div className="checkin-session-registry-list">
                {rows.map(row => {
                  const asistencia = getAsistenciaFromRow(row);
                  const confirmacion = getConfirmacionFromRow(row);
                  const checkedInAt = getCheckedInAtFromRow(row);
                  const name = memberDisplayName(row.miembros);
                  return (
                    <div key={row.id} className="checkin-session-registry-item">
                      <div>
                        <strong>{name}</strong>
                        {checkedInAt && (
                          <div className="checkin-session-registry-time">
                            {t('checkedInAt')}: {new Date(checkedInAt).toLocaleString()}
                            <span className="checkin-session-qr-badge">{t('checkinViaQr')}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                        {needsConfirmation && (
                          <div>
                            <div className="event-attendance-row-label">{t('attendanceConfirmation')}</div>
                            <ConfirmationControls
                              eventoMiembroId={row.id}
                              eventoId={eventoId}
                              current={confirmacion}
                              canManage={canManage}
                              onSet={setConfirmation}
                              confirmBeforeSet={buildConfirmBeforeConfirmation(eventName, name)}
                              t={t}
                            />
                          </div>
                        )}
                        <div>
                          <div className="event-attendance-row-label">{t('attendanceList')}</div>
                          <AttendanceControls
                            eventoMiembroId={row.id}
                            eventoId={eventoId}
                            current={asistencia}
                            currentJustificada={EventosModel.getAsistenciaJustificadaFromRow(row)}
                            canManage={canManage}
                            onSet={setAttendance}
                            confirmBeforeSet={buildConfirmBeforeAttendance(eventName, name)}
                            t={t}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {listPagination?.totalPages > 1 && <ListPagination {...listPagination} />}
          </section>
        </>
      )}
      {confirmDialog}
    </div>
  );
}
