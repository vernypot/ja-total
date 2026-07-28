function resolvePlace({ evento, eventPlace, getClubName }) {
  if (eventPlace) return eventPlace(evento);
  if (getClubName) {
    const club = getClubName(evento);
    const lugar = evento?.lugar?.trim() || '';
    if (club && lugar) return `${club} · ${lugar}`;
    return club || lugar;
  }
  return evento?.lugar?.trim() || '';
}

function activateOnKey(event, onActivate) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onActivate();
  }
}

function EventDateTrigger({ evento, expanded, onToggle, eventDayParts, compact = false, className = '' }) {
  const parts = eventDayParts(evento.fecha);
  const label = parts.month ? `${parts.day} ${parts.month}` : String(parts.day);

  return (
    <div
      className={['home-event-date-cta', className].filter(Boolean).join(' ')}
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={event => activateOnKey(event, onToggle)}
      aria-expanded={expanded}
      aria-label={label}
    >
      <strong>{parts.day}</strong>
      {!compact && parts.month ? <span>{parts.month}</span> : null}
    </div>
  );
}

function EventTitleTrigger({ title, expanded, onToggle, as: Tag = 'span' }) {
  return (
    <Tag
      className="home-event-title-cta"
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={event => activateOnKey(event, onToggle)}
      aria-expanded={expanded}
    >
      {title}
    </Tag>
  );
}

function EventDetailsPanel({
  evento,
  place,
  expanded,
  onToggle,
  t,
  formatEventDate,
  formatEventTime,
}) {
  if (!expanded) return null;

  const description = evento.descripcion?.trim();

  return (
    <div className="home-event-details">
      <dl className="home-event-details-list">
        <div className="home-event-details-row">
          <dt>{t('eventDate')}</dt>
          <dd>{formatEventDate(evento.fecha)}</dd>
        </div>
        {evento.hora && (
          <div className="home-event-details-row">
            <dt>{t('eventTime')}</dt>
            <dd>{formatEventTime(evento.hora)}</dd>
          </div>
        )}
        {place && (
          <div className="home-event-details-row">
            <dt>{t('eventPlace')}</dt>
            <dd>{place}</dd>
          </div>
        )}
      </dl>
      {description && (
        <p className="home-event-details-description">{description}</p>
      )}
      <button type="button" className="btn btn-secondary btn-sm home-event-collapse-btn" onClick={onToggle}>
        {t('homeReadLess')}
      </button>
    </div>
  );
}

export default function HomeUpcomingEventRow({
  evento,
  expanded,
  onToggle,
  variant = 'landing',
  t,
  formatEventDate,
  formatEventTime,
  eventDisplayName,
  eventDayParts,
  eventPlace,
  getClubName,
  actions = null,
  statusContent = null,
}) {
  if (!evento) return null;

  const title = eventDisplayName(evento) || t('eventUntitled');
  const place = resolvePlace({ evento, eventPlace, getClubName });

  const details = (
    <EventDetailsPanel
      evento={evento}
      place={place}
      expanded={expanded}
      onToggle={onToggle}
      t={t}
      formatEventDate={formatEventDate}
      formatEventTime={formatEventTime}
    />
  );

  if (variant === 'landing') {
    return (
      <article className={`home-landing-event-row${expanded ? ' is-expanded' : ''}`}>
        <EventDateTrigger
          evento={evento}
          expanded={expanded}
          onToggle={onToggle}
          eventDayParts={eventDayParts}
          className="home-landing-event-date"
        />
        <div className="home-landing-event-info">
          <h3>
            <EventTitleTrigger title={title} expanded={expanded} onToggle={onToggle} />
          </h3>
          {!expanded && place && <p>{place}</p>}
          {details}
        </div>
        <div className="home-landing-event-time">{formatEventTime(evento.hora)}</div>
      </article>
    );
  }

  return (
    <article className={`portal-home-event-card${expanded ? ' is-expanded' : ''}`}>
      <EventDateTrigger
        evento={evento}
        expanded={expanded}
        onToggle={onToggle}
        eventDayParts={eventDayParts}
        compact
        className="home-event-badge"
      />
      <div className="home-item-main">
        <strong>
          <EventTitleTrigger title={title} expanded={expanded} onToggle={onToggle} />
        </strong>
        {!expanded && (
          <>
            {place && <span>{place}</span>}
            <span>{formatEventDate(evento.fecha)} · {formatEventTime(evento.hora)}</span>
            {statusContent}
          </>
        )}
        {details}
        {expanded && statusContent}
      </div>
      {actions}
    </article>
  );
}

export function homeEventDayParts(dateStr, language = 'es') {
  if (!dateStr) return { day: '--', month: '' };
  const locale = language === 'en' ? 'en-US' : 'es-CO';
  const d = new Date(`${dateStr}T12:00:00`);
  return {
    day: d.getDate(),
    month: d.toLocaleDateString(locale, { month: 'short' }).replace('.', ''),
  };
}
