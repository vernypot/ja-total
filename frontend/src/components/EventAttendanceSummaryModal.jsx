import EventAttendanceSummaryContent from './EventAttendanceSummaryContent';
import { printEventAttendanceSummary } from '../utils/printEventAttendanceSummary';
import '../styles/eventAttendance.css';

export default function EventAttendanceSummaryModal({
  open,
  onClose,
  evento,
  rows,
  loading,
  needsConfirmation,
  formatEventTime,
  formatEventTimestamp,
  formatPrintedAt,
  t,
}) {
  if (!open || !evento) return null;

  return (
    <>
      <div
        className="event-summary-modal-overlay"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="event-summary-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-summary-modal-title"
          onClick={event => event.stopPropagation()}
        >
          <div className="event-summary-modal__header">
            <div>
              <h3 id="event-summary-modal-title">{t('eventAttendanceSummaryTitle')}</h3>
              <p className="event-summary-modal__subtitle">
                {evento.nombre || t('eventUntitled')}
                {evento.fecha ? ` · ${evento.fecha}` : ''}
                {evento.hora ? ` · ${formatEventTime(evento.hora)}` : ''}
              </p>
            </div>
            <div className="event-summary-modal__header-actions">
              {!loading && rows.length > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm event-summary-modal__print-btn"
                  onClick={printEventAttendanceSummary}
                >
                  🖨 {t('eventAttendanceSummaryPrint')}
                </button>
              )}
              <button
                type="button"
                className="event-summary-modal__close"
                onClick={onClose}
                aria-label={t('close')}
              >
                ✕
              </button>
            </div>
          </div>

          {loading ? (
            <p className="event-summary-modal__loading">{t('loadingAttendance')}</p>
          ) : (
            <EventAttendanceSummaryContent
              evento={evento}
              rows={rows}
              needsConfirmation={needsConfirmation}
              formatEventTime={formatEventTime}
              formatEventTimestamp={formatEventTimestamp}
              t={t}
            />
          )}
        </div>
      </div>

      {!loading && rows.length > 0 && (
        <div className="event-summary-print-source" aria-hidden="true">
          <EventAttendanceSummaryContent
            evento={evento}
            rows={rows}
            needsConfirmation={needsConfirmation}
            formatEventTime={formatEventTime}
            formatEventTimestamp={formatEventTimestamp}
            formatPrintedAt={formatPrintedAt}
            t={t}
            variant="print"
          />
        </div>
      )}
    </>
  );
}
