import { useLanguage } from '../../hooks/useLanguage';
import { formatEventTime } from '../../utils/calendar';
import { PageHelpLink } from '../../components/PageHelp';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function EventPill({ event, t }) {
  const time = formatEventTime(event.hora);
  const typeLabel = event.tipos_evento?.nombre;
  return (
    <div
      title={[event.nombre, time, event.lugar, typeLabel].filter(Boolean).join(' · ')}
      style={{
        fontSize: '10px',
        lineHeight: 1.3,
        padding: '3px 5px',
        marginBottom: '3px',
        borderRadius: '4px',
        backgroundColor: '#dbeafe',
        color: '#1e3a8a',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {time && <strong>{time} </strong>}
      {event.nombre || t('events')}
    </div>
  );
}

export default function CalendarioClubView({
  clubs,
  clubId,
  activeClubData,
  eventsByDate,
  calendarCells,
  year,
  monthIndex,
  loading,
  error,
  iglesiaScopeReady,
  selectClub,
  goToPreviousMonth,
  goToNextMonth,
  goToToday,
  toDateKey,
  clubDisplayName,
}) {
  const { t, language } = useLanguage();

  if (!iglesiaScopeReady) {
    return <p>{t('loading')}</p>;
  }

  const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString(
    language === 'en' ? 'en-US' : 'es-ES',
    { month: 'long', year: 'numeric' }
  );
  const todayKey = toDateKey(new Date());

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
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
            flexWrap: 'wrap',
          }}>
            <h2 style={{ margin: 0, fontSize: '18px', textTransform: 'capitalize' }}>{monthLabel}</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={goToPreviousMonth}
                style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#fff', color: '#374151', cursor: 'pointer' }}
              >
                ←
              </button>
              <button
                type="button"
                onClick={goToToday}
                style={{ padding: '6px 10px', border: '1px solid #2563eb', borderRadius: '4px', backgroundColor: '#fff', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}
              >
                {t('today')}
              </button>
              <button
                type="button"
                onClick={goToNextMonth}
                style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#fff', color: '#374151', cursor: 'pointer' }}
              >
                →
              </button>
            </div>
          </div>

          {loading ? (
            <p>{t('loading')}</p>
          ) : (
            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: '#fff',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                backgroundColor: '#f9fafb',
                borderBottom: '1px solid #e5e7eb',
              }}>
                {WEEKDAY_KEYS.map(key => (
                  <div
                    key={key}
                    style={{
                      padding: '8px 6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--color-text-muted)',
                      textAlign: 'center',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t(`weekday${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
                {calendarCells.map((date, index) => {
                  if (!date) {
                    return (
                      <div
                        key={`empty-${index}`}
                        style={{ minHeight: '96px', borderRight: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}
                      />
                    );
                  }

                  const dateKey = toDateKey(date);
                  const dayEvents = eventsByDate[dateKey] || [];
                  const isToday = dateKey === todayKey;

                  return (
                    <div
                      key={dateKey}
                      style={{
                        minHeight: '96px',
                        padding: '6px',
                        borderRight: '1px solid #f3f4f6',
                        borderBottom: '1px solid #f3f4f6',
                        backgroundColor: isToday ? '#eff6ff' : '#fff',
                      }}
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
                        <EventPill key={event.id} event={event} t={t} />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
