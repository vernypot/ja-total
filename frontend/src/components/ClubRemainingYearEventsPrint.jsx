import { formatPrintEventDayDate } from '../utils/clubRemainingYearEvents';
import * as EventosModel from '../mvc/models/eventos.model';

function formatPrintTimestamp(iso, language = 'es') {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(language === 'en' ? 'en-US' : 'es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ClubRemainingYearEventsPrint({
  clubName = '',
  tipoNombre = '',
  clubLogoUrl = '',
  tipoLogoUrl = '',
  year,
  groupedMonths = [],
  agendaUpdatedAt = null,
  printedAt = null,
  t,
  language = 'es',
}) {
  const hasEvents = groupedMonths.some(group => group.events.length > 0);
  const hasLogos = Boolean(clubLogoUrl || tipoLogoUrl);

  return (
    <div className="club-events-year-document">
      <header className="club-events-year-header">
        <div className="club-events-year-header-top">
          {hasLogos && (
            <div className="club-events-year-logos">
              {tipoLogoUrl && (
                <img
                  src={tipoLogoUrl}
                  alt=""
                  className="club-events-year-logo club-events-year-logo--tipo"
                />
              )}
              {clubLogoUrl && (
                <img
                  src={clubLogoUrl}
                  alt=""
                  className="club-events-year-logo club-events-year-logo--club"
                />
              )}
            </div>
          )}
          <div className="club-events-year-header-text">
            <h1 className="club-events-year-title">
              {t('clubEventsPrintTitle').replace('{year}', String(year))}
            </h1>
            {clubName && <p className="club-events-year-meta">{clubName}</p>}
            {tipoNombre && <p className="club-events-year-meta club-events-year-tipo">{tipoNombre}</p>}
          </div>
        </div>
        <div className="club-events-year-dates">
          {agendaUpdatedAt && (
            <p className="club-events-year-date-line">
              {t('clubEventsPrintAgendaUpdated')}: {formatPrintTimestamp(agendaUpdatedAt, language)}
            </p>
          )}
          <p className="club-events-year-date-line">
            {t('printedOn')}: {formatPrintTimestamp(printedAt || new Date().toISOString(), language)}
          </p>
        </div>
        <p className="club-events-year-meta club-events-year-subtitle">{t('clubEventsPrintSubtitle')}</p>
      </header>

      {!hasEvents ? (
        <p className="club-events-year-empty">{t('clubEventsPrintEmpty')}</p>
      ) : (
        groupedMonths.map(group => (
          <section key={group.monthKey} className="club-events-year-month">
            <h2 className="club-events-year-month-title">{group.label}</h2>
            <table className="club-events-year-table">
              <thead>
                <tr>
                  <th className="club-events-year-col-date">{t('clubEventsPrintDate')}</th>
                  <th className="club-events-year-col-time">{t('clubEventsPrintTime')}</th>
                  <th className="club-events-year-col-event">{t('clubEventsPrintEvent')}</th>
                  <th className="club-events-year-col-place">{t('clubEventsPrintPlace')}</th>
                  <th className="club-events-year-col-type">{t('clubEventsPrintType')}</th>
                </tr>
              </thead>
              <tbody>
                {group.events.map(evento => (
                  <tr key={evento.id}>
                    <td className="club-events-year-date-cell">
                      {formatPrintEventDayDate(evento.fecha, language)}
                    </td>
                    <td>{EventosModel.formatEventLocalTime(evento.hora, language) || '—'}</td>
                    <td>
                      <span className="club-events-year-event-name">
                        {evento.nombre || t('eventUntitled')}
                      </span>
                    </td>
                    <td>{evento.lugar || '—'}</td>
                    <td>{EventosModel.getTipoEventoNombre(evento) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}
    </div>
  );
}
