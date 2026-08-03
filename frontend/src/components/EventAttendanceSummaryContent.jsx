import * as EventosModel from '../mvc/models/eventos.model';
import { attendanceLabel, confirmationLabel } from '../i18n/helpers';
import { formatCuotaMonto, resolveEventCuotaClub } from '../utils/cuota';

function SummaryStat({ label, value }) {
  return (
    <div className="event-summary-stat">
      <span className="event-summary-stat__value">{value}</span>
      <span className="event-summary-stat__label">{label}</span>
    </div>
  );
}

function groupLabel(key, needsConfirmation, t) {
  if (needsConfirmation) return confirmationLabel(key, t);
  if (key === 'pending') return t('attendancePending');
  return attendanceLabel(key, t);
}

function memberRowDetail(attendee, needsConfirmation, groupedByConfirmation, t) {
  if (!attendee.asistencia) return null;

  if (needsConfirmation && groupedByConfirmation) {
    return attendanceLabel(attendee.asistencia, t);
  }
  if (!needsConfirmation) return null;
  return attendanceLabel(attendee.asistencia, t);
}

function MemberRow({
  attendee,
  needsConfirmation,
  groupedByConfirmation,
  formatEventTimestamp,
  t,
  variant = 'screen',
}) {
  const detailText = memberRowDetail(attendee, needsConfirmation, groupedByConfirmation, t);
  const confirmedAtText = attendee.confirmadoAt && formatEventTimestamp
    ? t('eventAttendanceSummaryConfirmedAt').replace('{datetime}', formatEventTimestamp(attendee.confirmadoAt))
    : null;

  if (variant === 'print') {
    const metaParts = [confirmedAtText, detailText].filter(Boolean);
    return (
      <li className="event-summary-print-member">
        <span className="event-summary-print-member-name">{attendee.name}</span>
        {metaParts.length > 0 && (
          <span className="event-summary-print-member-meta">
            {' · '}
            {metaParts.join(' · ')}
          </span>
        )}
      </li>
    );
  }

  return (
    <li className="event-summary-attendees__item">
      <div className="event-summary-attendees__main">
        <span className="event-summary-attendees__name">{attendee.name}</span>
        {confirmedAtText && (
          <span className="event-summary-attendees__confirmed-at">{confirmedAtText}</span>
        )}
        {detailText && (
          <span className="event-summary-attendees__status">{detailText}</span>
        )}
      </div>
    </li>
  );
}

function GroupedAttendees({
  groups,
  needsConfirmation,
  formatEventTimestamp,
  t,
  variant = 'screen',
}) {
  const groupedByConfirmation = needsConfirmation;
  const listClassName = variant === 'print'
    ? 'event-summary-print-groups'
    : 'event-summary-attendees__groups';

  return (
    <div className={listClassName}>
      {groups.map(group => (
        <section
          key={group.key}
          className={variant === 'print' ? 'event-summary-print-group' : 'event-summary-attendees__group'}
        >
          <h2 className={variant === 'print' ? undefined : 'event-summary-attendees__group-title'}>
            {groupLabel(group.key, needsConfirmation, t)}
            {' '}
            ({group.members.length})
          </h2>
          <ul className={variant === 'print' ? undefined : 'event-summary-attendees__list'}>
            {group.members.map(attendee => (
              <MemberRow
                key={attendee.id}
                attendee={attendee}
                needsConfirmation={needsConfirmation}
                groupedByConfirmation={groupedByConfirmation}
                formatEventTimestamp={formatEventTimestamp}
                t={t}
                variant={variant}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function EventAttendanceSummaryContent({
  evento,
  rows,
  club,
  language = 'es',
  needsConfirmation,
  formatEventTime,
  formatEventTimestamp,
  formatPrintedAt,
  t,
  variant = 'screen',
}) {
  const { stats, attendees } = EventosModel.computeEventAttendanceSummary(rows, { needsConfirmation });
  const groups = EventosModel.groupEventAttendanceAttendees(attendees, { needsConfirmation });
  const cuotaSummary = EventosModel.computeEventCuotaSummary(rows, {
    evento,
    club: resolveEventCuotaClub(evento, club),
  });
  const cuotaCollectedLabel = cuotaSummary.applies
    ? formatCuotaMonto(cuotaSummary.totalCollected, {
      language,
      club: resolveEventCuotaClub(evento, club),
    })
    : null;

  if (stats.assigned === 0) {
    return variant === 'print'
      ? <p>{t('eventAttendanceSummaryEmpty')}</p>
      : <p className="event-summary-modal__empty">{t('eventAttendanceSummaryEmpty')}</p>;
  }

  const eventTitle = evento.nombre || t('eventUntitled');
  const eventMeta = [
    evento.fecha,
    evento.hora ? formatEventTime(evento.hora) : '',
  ].filter(Boolean).join(' · ');

  const statsBlock = (
    <div className={variant === 'print' ? 'event-summary-print-document__stats' : 'event-summary-stats'}>
      {variant === 'print' ? (
        <>
          <div className="event-summary-print-stat"><strong>{stats.assigned}</strong><span>{t('attendanceStatAssigned')}</span></div>
          {needsConfirmation && (
            <>
              <div className="event-summary-print-stat"><strong>{stats.confirmed}</strong><span>{t('confirmationConfirmed')}</span></div>
              <div className="event-summary-print-stat"><strong>{stats.pendingConfirmation}</strong><span>{t('confirmationPending')}</span></div>
              <div className="event-summary-print-stat"><strong>{stats.declined}</strong><span>{t('confirmationDeclined')}</span></div>
            </>
          )}
          <div className="event-summary-print-stat"><strong>{stats.onTime}</strong><span>{t('attendanceStatOnTime')}</span></div>
          <div className="event-summary-print-stat"><strong>{stats.late}</strong><span>{t('attendanceStatLate')}</span></div>
          <div className="event-summary-print-stat"><strong>{stats.absent}</strong><span>{t('attendanceStatMisses')}</span></div>
          <div className="event-summary-print-stat"><strong>{stats.notRecorded}</strong><span>{t('attendancePending')}</span></div>
          {cuotaSummary.applies && (
            <div className="event-summary-print-stat event-summary-print-stat--cuota">
              <strong>{cuotaCollectedLabel}</strong>
              <span>{t('eventAttendanceSummaryCuotaCollected')}</span>
            </div>
          )}
        </>
      ) : (
        <>
          <SummaryStat label={t('attendanceStatAssigned')} value={stats.assigned} />
          {needsConfirmation && (
            <>
              <SummaryStat label={t('confirmationConfirmed')} value={stats.confirmed} />
              <SummaryStat label={t('confirmationPending')} value={stats.pendingConfirmation} />
              <SummaryStat label={t('confirmationDeclined')} value={stats.declined} />
            </>
          )}
          <SummaryStat label={t('attendanceStatOnTime')} value={stats.onTime} />
          <SummaryStat label={t('attendanceStatLate')} value={stats.late} />
          <SummaryStat label={t('attendanceStatMisses')} value={stats.absent} />
          <SummaryStat label={t('attendancePending')} value={stats.notRecorded} />
          {cuotaSummary.applies && (
            <SummaryStat
              label={t('eventAttendanceSummaryCuotaCollected')}
              value={cuotaCollectedLabel}
            />
          )}
        </>
      )}
    </div>
  );

  if (variant === 'print') {
    return (
      <div className="event-summary-print-document">
        <h1>{t('eventAttendanceSummaryTitle')}</h1>
        <p className="event-summary-print-document__meta">{eventTitle}{eventMeta ? ` · ${eventMeta}` : ''}</p>
        {statsBlock}
        <GroupedAttendees
          groups={groups}
          needsConfirmation={needsConfirmation}
          formatEventTimestamp={formatEventTimestamp}
          t={t}
          variant="print"
        />
        {formatPrintedAt && (
          <p className="event-summary-print-document__footer">
            {t('printedOn')}: {formatPrintedAt}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      {statsBlock}
      <div className="event-summary-attendees">
        <h4 className="event-summary-attendees__title">{t('eventAttendanceSummaryAttendees')}</h4>
        <GroupedAttendees
          groups={groups}
          needsConfirmation={needsConfirmation}
          formatEventTimestamp={formatEventTimestamp}
          t={t}
          variant="screen"
        />
      </div>
    </>
  );
}
