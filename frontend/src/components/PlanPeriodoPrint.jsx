function formatPrintDate(dateKey, language = 'es') {
  if (!dateKey) return '';
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatPrintedAt(language = 'es') {
  return new Date().toLocaleString(language === 'en' ? 'en-US' : 'es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RequisitoLine({ req, t }) {
  return (
    <li>
      {req.numero != null && <strong>{req.numero}. </strong>}
      {req.descripcion}
      {req.sesiones != null && (
        <span className="plan-periodo-req-sessions">
          {' '}({req.sesiones} {t('planSessionsShort')})
        </span>
      )}
      {req.clase && <span className="plan-periodo-req-clase">{req.clase}</span>}
    </li>
  );
}

function TimelineEntry({ item, t }) {
  const isMeeting = item.kind === 'meeting';
  const displayTitle = item.title || (isMeeting
    ? `${t('planMeeting')} ${item.meetingNumero}`
    : t('events'));

  return (
    <article className={`plan-periodo-entry plan-periodo-entry--${item.kind}`}>
      <div className="plan-periodo-entry-head">
        {item.time && <span className="plan-periodo-entry-time">{item.time}</span>}
        <span className="plan-periodo-entry-kind">
          {isMeeting ? t('planPrintMeeting') : t('planPrintEvent')}
        </span>
      </div>
      <h3 className="plan-periodo-entry-title">{displayTitle}</h3>
      {item.subtitle && <p className="plan-periodo-entry-subtitle">{item.subtitle}</p>}
      {item.description && (
        <p className="plan-periodo-entry-description">{item.description}</p>
      )}
      {isMeeting && (
        item.requisitos.length > 0 ? (
          <ol className="plan-periodo-reqs">
            {item.requisitos.map((req, index) => (
              <RequisitoLine key={`${req.descripcion}-${index}`} req={req} t={t} />
            ))}
          </ol>
        ) : (
          <p className="plan-periodo-no-reqs">{t('planPrintEmptyReqs')}</p>
        )
      )}
    </article>
  );
}

export default function PlanPeriodoPrint({
  plan,
  clubName = '',
  groupedTimeline = [],
  sessionsSummary = null,
  t,
  language = 'es',
}) {
  const printedAt = formatPrintedAt(language);
  const hasItems = groupedTimeline.some(group => group.items.length > 0);

  return (
    <div className="plan-periodo-document">
      <header className="plan-periodo-header">
        <h1 className="plan-periodo-title">{plan?.nombre}</h1>
        {clubName && <p className="plan-periodo-meta">{clubName}</p>}
        <p className="plan-periodo-meta">
          {t('planPrintPeriod')}: {plan?.fecha_inicio} → {plan?.fecha_fin}
        </p>
        {plan?.notas?.trim() && (
          <p className="plan-periodo-meta">{plan.notas.trim()}</p>
        )}
      </header>

      {!hasItems ? (
        <p className="plan-periodo-empty">{t('planPrintNoDates')}</p>
      ) : (
        groupedTimeline.map(group => (
          <section key={group.date} className="plan-periodo-day">
            <h2 className="plan-periodo-day-date">{formatPrintDate(group.date, language)}</h2>
            {group.items.map((item, index) => (
              <TimelineEntry key={`${item.kind}-${item.title}-${index}`} item={item} t={t} />
            ))}
          </section>
        ))
      )}

      {sessionsSummary && (
        <section className="plan-periodo-sessions-summary">
          <h2 className="plan-periodo-sessions-summary-title">{t('planSessionsSummary')}</h2>
          <p className="plan-periodo-sessions-summary-total">
            <strong>{sessionsSummary.totalSesiones}</strong> {t('planSessionsShort')}
            {sessionsSummary.totalReqs > 0 && (
              <> · {t('planSessionsAcrossReqs').replace('{count}', String(sessionsSummary.totalReqs))}</>
            )}
          </p>
          {sessionsSummary.byMeeting.filter(m => m.reqCount > 0).length > 0 && (
            <ul className="plan-periodo-sessions-summary-list">
              {sessionsSummary.byMeeting.filter(m => m.reqCount > 0).map(meeting => (
                <li key={meeting.reunionId}>
                  {meeting.titulo || `${t('planMeeting')} ${meeting.numero}`}
                  {meeting.fecha ? ` (${meeting.fecha})` : ''}
                  {' — '}
                  {meeting.sesiones} {t('planSessionsShort')}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <footer className="plan-periodo-footer">
        {t('printedOn')}: {printedAt}
      </footer>
    </div>
  );
}
