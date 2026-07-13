import { useLanguage } from '../../hooks/useLanguage';
import { attendanceLabel, confirmationLabel } from '../../i18n/helpers';
import { formatCalendarPeriodLabel, formatEventTime } from '../../utils/calendar';
import { PageHelpLink } from '../../components/PageHelp';
import '../../styles/calendario.css';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const VIEW_MODES = [
  { id: 'month', labelKey: 'calendarViewMonth' },
  { id: 'week', labelKey: 'calendarViewWeek' },
  { id: 'day', labelKey: 'calendarViewDay' },
];

function EventPill({ event, t, selected, onClick }) {
  const time = formatEventTime(event.hora);
  return (
    <button
      type="button"
      className={`calendario-event-pill${selected ? ' calendario-event-pill--selected' : ''}`}
      title={[event.nombre, time, event.lugar, event.tipos_evento?.nombre].filter(Boolean).join(' · ')}
      onClick={onClick}
    >
      {time && <strong>{time} </strong>}
      {event.nombre || t('events')}
    </button>
  );
}

function EventStatusBadge({ estado, t }) {
  if (!estado || estado === 'activo') return null;

  const styles = {
    cancelado: { bg: '#fee2e2', color: '#991b1b', label: t('eventStatusCancelled') },
    inactivo: { bg: '#f3f4f6', color: '#4b5563', label: t('eventStatusInactive') },
  };
  const style = styles[estado] || styles.inactivo;

  return (
    <span style={{
      fontSize: '11px',
      fontWeight: 'bold',
      padding: '2px 8px',
      borderRadius: '999px',
      backgroundColor: style.bg,
      color: style.color,
    }}>
      {style.label}
    </span>
  );
}

function CalendarWeekdayHeader({ t }) {
  return (
    <div className="calendario-weekday-header">
      {WEEKDAY_KEYS.map(key => (
        <div key={key} className="calendario-weekday-header-cell">
          {t(`weekday${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
        </div>
      ))}
    </div>
  );
}

function CalendarDayCell({
  date,
  dateKey,
  dayEvents,
  isToday,
  isSelected,
  isWeekView,
  t,
  selectedEventId,
  onSelectDate,
  onSelectEvent,
}) {
  return (
    <div
      className={[
        'calendario-grid-day',
        isWeekView ? 'calendario-grid-day--week' : '',
        isToday ? 'calendario-grid-day--today' : '',
        isSelected ? 'calendario-grid-day--selected' : '',
      ].filter(Boolean).join(' ')}
      onClick={() => onSelectDate(dateKey)}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectDate(dateKey);
        }
      }}
      aria-label={t('calendarSelectDateAria').replace('{date}', String(date.getDate()))}
      aria-pressed={isSelected}
    >
      <div style={{
        fontSize: '12px',
        fontWeight: isToday ? 700 : 600,
        color: isToday ? '#1d4ed8' : '#374151',
        marginBottom: '4px',
      }}>
        {date.getDate()}
      </div>
      {dayEvents.map(event => (
        <EventPill
          key={event.id}
          event={event}
          t={t}
          selected={selectedEventId === event.id}
          onClick={e => {
            e.stopPropagation();
            onSelectEvent(event.id, dateKey);
          }}
        />
      ))}
    </div>
  );
}

function DayActivitiesPanel({
  selectedDateKey,
  selectedDayEvents,
  selectedEventId,
  showPlaceholder,
  isDayView,
  t,
  language,
  getTipoEventoNombre,
  onSelectEvent,
}) {
  const selectedDateLabel = selectedDateKey
    ? new Date(`${selectedDateKey}T12:00:00`).toLocaleDateString(
      language === 'en' ? 'en-US' : 'es-ES',
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    )
    : '';

  return (
    <div className={`calendario-day-panel${isDayView ? ' calendario-day-view' : ''}`}>
      <div className="calendario-day-panel-header">
        <h3>
          {selectedDateKey
            ? t('calendarDayActivities').replace('{date}', selectedDateLabel)
            : t('calendarSelectDate')}
        </h3>
      </div>
      <div className="calendario-day-panel-body">
        {showPlaceholder ? (
          <p className="text-muted" style={{ margin: 0 }}>{t('calendarSelectDateHint')}</p>
        ) : selectedDayEvents.length === 0 ? (
          <p className="text-muted" style={{ margin: 0 }}>{t('calendarNoActivities')}</p>
        ) : (
          <ul className="calendario-day-event-list">
            {selectedDayEvents.map(event => {
              const tipoNombre = getTipoEventoNombre(event);
              const isSelected = selectedEventId === event.id;
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    className={`calendario-day-event-item${isSelected ? ' calendario-day-event-item--selected' : ''}`}
                    onClick={() => onSelectEvent(event.id, selectedDateKey)}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <strong>{event.nombre || t('eventUntitled')}</strong>
                      <div className="calendario-day-event-meta">
                        {formatEventTime(event.hora) && `${formatEventTime(event.hora)} · `}
                        {event.lugar}
                        {tipoNombre && ` · ${tipoNombre}`}
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600, flexShrink: 0 }}>
                      {t('calendarViewEventDetails')} →
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function EventDetailModal({
  event,
  assignments,
  loading,
  t,
  language,
  onClose,
  onManage,
  isEventInFuture,
  eventRequiresConfirmation,
  getTipoEventoNombre,
  getAsistenciaFromRow,
  getConfirmacionFromRow,
  memberDisplayName,
}) {
  if (!event) return null;

  const tipoNombre = getTipoEventoNombre(event);
  const needsConfirmation = eventRequiresConfirmation(event);
  const isFuture = isEventInFuture(event);
  const dateLabel = event.fecha
    ? new Date(`${event.fecha}T12:00:00`).toLocaleDateString(
      language === 'en' ? 'en-US' : 'es-ES',
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    )
    : event.fecha;

  return (
    <div className="calendario-event-detail-overlay" onClick={onClose} role="presentation">
      <div
        className="calendario-event-detail-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendario-event-detail-title"
      >
        <div className="calendario-event-detail-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h2 id="calendario-event-detail-title">{event.nombre || t('eventUntitled')}</h2>
              <EventStatusBadge estado={event.estado} t={t} />
              {isFuture && (!event.estado || event.estado === 'activo') && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  backgroundColor: '#dbeafe',
                  color: '#1d4ed8',
                }}>
                  {t('upcomingEvent')}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
          >
            ✕
          </button>
        </div>

        <div className="calendario-event-detail-body">
          <div className="calendario-event-detail-grid">
            <div className="calendario-event-detail-row">
              <span className="calendario-event-detail-label">{t('eventDate')}</span>
              <span>{dateLabel}</span>
            </div>
            <div className="calendario-event-detail-row">
              <span className="calendario-event-detail-label">{t('eventTime')}</span>
              <span>{formatEventTime(event.hora) || '—'}</span>
            </div>
            <div className="calendario-event-detail-row">
              <span className="calendario-event-detail-label">{t('eventPlace')}</span>
              <span>{event.lugar || '—'}</span>
            </div>
            {tipoNombre && (
              <div className="calendario-event-detail-row">
                <span className="calendario-event-detail-label">{t('eventType')}</span>
                <span>{tipoNombre}</span>
              </div>
            )}
            <div className="calendario-event-detail-row">
              <span className="calendario-event-detail-label">{t('eventRequiresConfirmation')}</span>
              <span>{needsConfirmation ? t('yes') : t('no')}</span>
            </div>
          </div>

          {needsConfirmation && (
            <div className="calendario-event-detail-members">
              <h4>{t('calendarAssignedMembers')}</h4>
              {loading ? (
                <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>{t('loading')}</p>
              ) : assignments.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>{t('noMembersAssignedToEvent')}</p>
              ) : (
                assignments.map(row => (
                  <div key={row.id} className="calendario-event-detail-member">
                    <span>{memberDisplayName(row.miembros)}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        {t('attendanceConfirmation')}: {confirmationLabel(getConfirmacionFromRow(row), t)}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        {t('attendanceList')}: {attendanceLabel(getAsistenciaFromRow(row), t)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {!needsConfirmation && (
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '14px' }}>
              {t('eventNoMemberAssignments')}
            </p>
          )}

          <div className="calendario-event-detail-actions">
            <button
              type="button"
              onClick={onManage}
              style={{
                padding: '8px 14px',
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {t('calendarManageEvent')}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                backgroundColor: 'var(--color-btn-neutral)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CalendarioClubView({
  clubs,
  clubId,
  activeClubData,
  viewMode,
  focusDate,
  eventsByDate,
  calendarCells,
  weekDays,
  loading,
  error,
  iglesiaScopeReady,
  selectClub,
  setCalendarViewMode,
  goToPrevious,
  goToNext,
  goToToday,
  toDateKey,
  clubDisplayName,
  selectedDateKey,
  selectedDayEvents,
  selectedEvent,
  selectedEventAssignments,
  loadingEventDetail,
  selectDate,
  selectEvent,
  closeEventDetail,
  openEventInEventsPage,
  isEventInFuture,
  eventRequiresConfirmation,
  getTipoEventoNombre,
  getAsistenciaFromRow,
  getConfirmacionFromRow,
  memberDisplayName,
}) {
  const { t, language } = useLanguage();

  if (!iglesiaScopeReady) {
    return <p>{t('loading')}</p>;
  }

  const periodLabel = formatCalendarPeriodLabel(viewMode, focusDate, language);
  const todayKey = toDateKey(new Date());
  const isDayView = viewMode === 'day';
  const isWeekView = viewMode === 'week';
  const isMonthView = viewMode === 'month';
  const showDayPanelPlaceholder = isMonthView && !selectedDateKey;

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>🗓️ {t('clubCalendar')} <PageHelpLink pageId="calendar" /></h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '14px' }}>{t('clubCalendarHint')}</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: '14px', fontWeight: 600 }}>
          {t('clubs')}:
          <select
            value={clubId}
            onChange={e => selectClub(e.target.value)}
            style={{ marginLeft: '8px', padding: '6px 10px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
          >
            <option value="">{t('selectClub')}</option>
            {clubs.map(c => (
              <option key={c.id} value={c.id}>{clubDisplayName(c)}</option>
            ))}
          </select>
        </label>
        {activeClubData && (
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {activeClubData.tipos_club?.nombre || activeClubData.club_tipo || ''}
          </span>
        )}
      </div>

      {!clubId ? (
        <p className="text-muted">{t('selectClubForCalendar')}</p>
      ) : (
        <>
          <div className="calendario-toolbar">
            <h2 className="calendario-toolbar-title">{periodLabel}</h2>
            <div className="calendario-toolbar-actions">
              <div className="calendario-view-toggle" role="group" aria-label={t('clubCalendar')}>
                {VIEW_MODES.map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    className={viewMode === mode.id ? 'is-active' : ''}
                    onClick={() => setCalendarViewMode(mode.id)}
                    aria-pressed={viewMode === mode.id}
                  >
                    {t(mode.labelKey)}
                  </button>
                ))}
              </div>
              <button type="button" className="calendario-nav-btn" onClick={goToPrevious}>
                ←
              </button>
              <button type="button" className="calendario-nav-btn calendario-nav-btn--today" onClick={goToToday}>
                {t('today')}
              </button>
              <button type="button" className="calendario-nav-btn" onClick={goToNext}>
                →
              </button>
            </div>
          </div>

          {loading ? (
            <p>{t('loading')}</p>
          ) : (
            <>
              {(isMonthView || isWeekView) && (
                <div className="calendario-grid">
                  <CalendarWeekdayHeader t={t} />
                  <div className={`calendario-grid-body${isMonthView ? ' calendario-grid-body--month' : ''}`}>
                    {isMonthView && calendarCells.map((date, index) => {
                      if (!date) {
                        return (
                          <div
                            key={`empty-${index}`}
                            style={{ minHeight: '96px', borderRight: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}
                          />
                        );
                      }

                      const dateKey = toDateKey(date);
                      return (
                        <CalendarDayCell
                          key={dateKey}
                          date={date}
                          dateKey={dateKey}
                          dayEvents={eventsByDate[dateKey] || []}
                          isToday={dateKey === todayKey}
                          isSelected={dateKey === selectedDateKey}
                          isWeekView={false}
                          t={t}
                          selectedEventId={selectedEvent?.id}
                          onSelectDate={selectDate}
                          onSelectEvent={selectEvent}
                        />
                      );
                    })}

                    {isWeekView && weekDays.map(date => {
                      const dateKey = toDateKey(date);
                      return (
                        <CalendarDayCell
                          key={dateKey}
                          date={date}
                          dateKey={dateKey}
                          dayEvents={eventsByDate[dateKey] || []}
                          isToday={dateKey === todayKey}
                          isSelected={dateKey === selectedDateKey}
                          isWeekView
                          t={t}
                          selectedEventId={selectedEvent?.id}
                          onSelectDate={selectDate}
                          onSelectEvent={selectEvent}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {(isMonthView || isWeekView || isDayView) && (
                <DayActivitiesPanel
                  selectedDateKey={selectedDateKey}
                  selectedDayEvents={selectedDayEvents}
                  selectedEventId={selectedEvent?.id}
                  showPlaceholder={showDayPanelPlaceholder}
                  isDayView={isDayView}
                  t={t}
                  language={language}
                  getTipoEventoNombre={getTipoEventoNombre}
                  onSelectEvent={selectEvent}
                />
              )}
            </>
          )}
        </>
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          assignments={selectedEventAssignments}
          loading={loadingEventDetail}
          t={t}
          language={language}
          onClose={closeEventDetail}
          onManage={openEventInEventsPage}
          isEventInFuture={isEventInFuture}
          eventRequiresConfirmation={eventRequiresConfirmation}
          getTipoEventoNombre={getTipoEventoNombre}
          getAsistenciaFromRow={getAsistenciaFromRow}
          getConfirmacionFromRow={getConfirmacionFromRow}
          memberDisplayName={memberDisplayName}
        />
      )}
    </div>
  );
}
