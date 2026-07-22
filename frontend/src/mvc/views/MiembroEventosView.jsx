import { useMemo } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { PageHelpLink } from '../../components/PageHelp';
import ListPagination from '../../components/ListPagination';
import MemberEventConfirmBlock from '../../components/MemberEventConfirmBlock';
import MemberEventConfirmationStatus from '../../components/MemberEventConfirmationStatus';
import EventDescriptionToggle from '../../components/EventDescriptionToggle';
import * as EventosModel from '../../mvc/models/eventos.model';
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
  language,
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
  isEventInFuture,
  getEventChurchTimezone,
  savingConfirmationId = null,
  confirmBeforeConfirmationSet,
  confirmBeforeAttendanceSet,
}) {
  const evento = getEventoFromRow(row);
  const asistencia = getAsistenciaFromRow(row);
  const confirmacion = getConfirmacionFromRow(row);
  const checkedInAt = getCheckedInAtFromRow(row);
  const clubName = evento?.clubes?.nombre;
  const tipoNombre = getTipoEventoNombre(evento);
  const needsConfirmation = eventRequiresConfirmation(evento);
  const attended = memberAttendedEvent(row);
  const canMemberConfirm = !canManage && EventosModel.canMemberConfirmEvent(row);
  const memberResponded = !canManage && EventosModel.memberEventConfirmationResponded(row);
  const isFuture = evento && isEventInFuture(evento, new Date(), getEventChurchTimezone(evento));
  const showMemberAttendance = canManage || !isFuture;

  return (
    <div className={`list-item${attended ? ' member-event-attended' : ''}${canMemberConfirm ? ' list-item--needs-confirm' : ''}`}>
      <div className="event-attendance-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <strong>{evento?.nombre || t('eventUntitled')}</strong>
            {attended && (
              <span className="member-event-attended-badge">{t('memberEventAttended')}</span>
            )}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {evento?.fecha} · {EventosModel.formatEventLocalTime(evento?.hora, language)} · {evento?.lugar}
            {tipoNombre && <> · {tipoNombre}</>}
          </div>
          {clubName && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {t('clubLabel')}: {clubName}
            </div>
          )}
          <EventDescriptionToggle description={evento?.descripcion} />
          {checkedInAt && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {t('checkedInAt')}: {(() => {
                const stamp = new Date(checkedInAt);
                return Number.isNaN(stamp.getTime()) ? String(checkedInAt) : stamp.toLocaleString();
              })()}
              <span className="checkin-session-qr-badge">{t('checkinViaQr')}</span>
            </div>
          )}
        </div>

        {canManage && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
          {needsConfirmation && (
            <div>
              <div className="event-attendance-row-label">{t('attendanceConfirmation')}</div>
              <ConfirmationControls
                eventoMiembroId={row.id}
                eventoId={evento?.id}
                current={confirmacion}
                canManage={canManage}
                onSet={(eventoMiembroId, estado) => updateConfirmation(eventoMiembroId, estado)}
                confirmBeforeSet={confirmBeforeConfirmationSet}
                t={t}
              />
            </div>
          )}

          <div>
            <div className="event-attendance-row-label">{t('attendanceList')}</div>
            <AttendanceControls
              eventoMiembroId={row.id}
              eventoId={evento?.id}
              current={asistencia}
              canManage={canManage}
              onSet={(eventoMiembroId, estado) => updateAttendance(eventoMiembroId, estado)}
              confirmBeforeSet={confirmBeforeAttendanceSet}
              t={t}
            />
          </div>
        </div>
        )}

        {!canManage && !canMemberConfirm && !memberResponded && needsConfirmation && (
          <div className="member-event-status-only">
            <div className="event-attendance-row-label">{t('attendanceConfirmation')}</div>
            <ConfirmationBadge estado={confirmacion} t={t} />
          </div>
        )}
      </div>

      {!canManage && canMemberConfirm && (
        <div className="member-event-confirm-banner">
          <div className="member-event-confirm-banner__head">
            <span className="member-event-confirm-banner__label">{t('memberEventConfirmPrompt')}</span>
          </div>
          <MemberEventConfirmBlock
            row={row}
            updateConfirmation={updateConfirmation}
            savingConfirmationId={savingConfirmationId}
            t={t}
          />
        </div>
      )}

      {!canManage && memberResponded && isFuture && (
        <MemberEventConfirmationStatus
          row={row}
          updateConfirmation={updateConfirmation}
          savingConfirmationId={savingConfirmationId}
          t={t}
        />
      )}

      {!canManage && showMemberAttendance && (
        <div className="member-event-attendance-summary">
          <div className="event-attendance-row-label">{t('attendanceList')}</div>
          <AttendanceBadge estado={asistencia} t={t} />
        </div>
      )}
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
  isEventInFuture,
  getEventChurchTimezone,
  savingConfirmationId = null,
  listPagination,
}) {
  const { t, language } = useLanguage();
  const { askConfirm, confirmDialog } = useConfirmDialog({
    cancelLabel: t('cancel'),
    confirmingLabel: t('saving'),
  });

  function buildConfirmBeforeConfirmation(eventName) {
    return (estado, proceed) => {
      if (estado !== 'rechazado') {
        proceed();
        return;
      }
      askConfirm({
        title: t('confirmRejectConfirmationTitle'),
        message: t('confirmRejectConfirmationMessage'),
        highlight: eventName,
        confirmLabel: t('approvalRequestReject'),
        onConfirm: proceed,
      });
    };
  }

  function buildConfirmBeforeAttendance(eventName) {
    return (estado, proceed) => {
      if (estado !== 'ausente') {
        proceed();
        return;
      }
      askConfirm({
        title: t('confirmMarkAbsentTitle'),
        message: t('confirmMarkAbsentMessage'),
        highlight: eventName,
        confirmLabel: t('attendanceAbsent'),
        onConfirm: proceed,
      });
    };
  }

  function cardPropsForRow(row) {
    const evento = getEventoFromRow(row);
    const eventName = evento?.nombre || t('eventUntitled');
    return {
      t,
      language,
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
      isEventInFuture,
      getEventChurchTimezone,
      savingConfirmationId,
      confirmBeforeConfirmationSet: canManage ? buildConfirmBeforeConfirmation(eventName) : undefined,
      confirmBeforeAttendanceSet: canManage ? buildConfirmBeforeAttendance(eventName) : undefined,
    };
  }

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

      <ListPagination {...listPagination} />

      {allRows.length === 0 ? (
        <p className="text-muted">{t('noMemberEvents')}</p>
      ) : (
        <>
          {attendanceFilter === 'all' && attendedRows.length > 0 && (
            <section className="member-events-attended-section">
              <h4 className="member-events-section-title">{t('memberEventsAttendedSection')}</h4>
              <div style={{ display: 'grid', gap: '12px' }}>
                {attendedRows.map(row => (
                  <MemberEventCard key={`attended-${row.id || row.evento_id}`} row={row} {...cardPropsForRow(row)} />
                ))}
              </div>
            </section>
          )}

          {attendanceFilter === 'attended' && attendedRows.length === 0 ? (
            <p className="text-muted">{t('noMemberEventsAttended')}</p>
          ) : attendanceFilter === 'attended' ? (
            <div style={{ display: 'grid', gap: '12px' }}>
              {attendedRows.map(row => (
                <MemberEventCard key={row.id || row.evento_id} row={row} {...cardPropsForRow(row)} />
              ))}
            </div>
          ) : (
            <>
              {otherRows.length > 0 && (
                <section className="member-events-other-section">
                  <h4 className="member-events-section-title">{t('memberEventsOtherSection')}</h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {otherRows.map(row => (
                      <MemberEventCard key={row.id || row.evento_id} row={row} {...cardPropsForRow(row)} />
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
      {listPagination?.totalPages > 1 && <ListPagination {...listPagination} />}
      {confirmDialog}
    </div>
  );
}
