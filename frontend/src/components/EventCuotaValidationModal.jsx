import { attendanceLabel } from '../i18n/helpers';
import * as EventosModel from '../mvc/models/eventos.model';
import {
  formatCuotaMonto,
  resolveEventCuotaClub,
  resolveEventCuotaMonto,
  resolveMemberEventCuotaMonto,
} from '../utils/cuota';
import '../styles/eventCuotaValidation.css';

function CuotaPaymentToggle({ paid, disabled, onToggle, t }) {
  return (
    <div className="event-cuota-payment-toggle">
      <button
        type="button"
        className={`event-cuota-payment-toggle__btn${paid ? ' is-selected is-paid' : ''}`}
        onClick={() => onToggle(true)}
        disabled={disabled}
        aria-pressed={paid}
      >
        {t('eventCuotaPaid')}
      </button>
      <button
        type="button"
        className={`event-cuota-payment-toggle__btn${!paid ? ' is-selected is-unpaid' : ''}`}
        onClick={() => onToggle(false)}
        disabled={disabled}
        aria-pressed={!paid}
      >
        {t('eventCuotaUnpaid')}
      </button>
    </div>
  );
}

export default function EventCuotaValidationModal({
  open,
  onClose,
  evento,
  club,
  rows,
  loading,
  savingPaymentId,
  onTogglePayment,
  onMarkAllPaid,
  markingAllPaid,
  t,
  language,
  memberDisplayName,
  formatEventTime,
  getAsistenciaFromRow,
}) {
  if (!open || !evento) return null;

  const currencyClub = resolveEventCuotaClub(evento, club);
  const eventCuotaAmount = resolveEventCuotaMonto(evento, club);
  const attendedRows = EventosModel.filterAttendedRowsForCuota(rows);
  const paidCount = attendedRows.filter(row => EventosModel.getCuotaPagadaFromRow(row)).length;
  const unpaidCount = attendedRows.length - paidCount;

  return (
    <div
      className="event-cuota-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="event-cuota-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-cuota-modal-title"
        onClick={event => event.stopPropagation()}
      >
        <div className="event-cuota-modal__header">
          <div>
            <h3 id="event-cuota-modal-title">{t('eventCuotaValidationTitle')}</h3>
            <p className="event-cuota-modal__subtitle">
              {evento.nombre || t('eventUntitled')}
              {evento.fecha ? ` · ${evento.fecha}` : ''}
              {evento.hora ? ` · ${formatEventTime(evento.hora)}` : ''}
            </p>
            {eventCuotaAmount != null && (
              <p className="event-cuota-modal__amount">
                {t('eventCuotaValidationAmount').replace(
                  '{{amount}}',
                  formatCuotaMonto(eventCuotaAmount, { language, club: currencyClub })
                )}
              </p>
            )}
          </div>
          <button
            type="button"
            className="event-cuota-modal__close"
            onClick={onClose}
            aria-label={t('close')}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="event-cuota-modal__loading">{t('loadingAttendance')}</p>
        ) : (
          <>
            <div className="event-cuota-modal__stats">
              <div>
                <span className="event-cuota-modal__stat-value">{attendedRows.length}</span>
                <span className="event-cuota-modal__stat-label">{t('eventCuotaAttendedCount')}</span>
              </div>
              <div>
                <span className="event-cuota-modal__stat-value event-cuota-modal__stat-value--paid">{paidCount}</span>
                <span className="event-cuota-modal__stat-label">{t('eventCuotaPaidCount')}</span>
              </div>
              <div>
                <span className="event-cuota-modal__stat-value event-cuota-modal__stat-value--unpaid">{unpaidCount}</span>
                <span className="event-cuota-modal__stat-label">{t('eventCuotaUnpaidCount')}</span>
              </div>
            </div>

            {attendedRows.length === 0 ? (
              <p className="event-cuota-modal__empty">{t('eventCuotaNoAttendees')}</p>
            ) : (
              <>
                <div className="event-cuota-modal__toolbar">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={onMarkAllPaid}
                    disabled={markingAllPaid || unpaidCount === 0}
                  >
                    {markingAllPaid ? t('saving') : t('eventCuotaMarkAllPaid')}
                  </button>
                </div>

                <div className="event-cuota-modal__list">
                  {attendedRows.map(row => {
                    const memberAmount = resolveMemberEventCuotaMonto({
                      evento,
                      club: currencyClub,
                      memberRow: row,
                    });
                    const asistencia = getAsistenciaFromRow(row);
                    const paid = EventosModel.getCuotaPagadaFromRow(row);
                    const saving = savingPaymentId === row.id;

                    return (
                      <div key={row.id} className="event-cuota-modal__row">
                        <div className="event-cuota-modal__row-main">
                          <strong>{memberDisplayName(row.miembros)}</strong>
                          <div className="event-cuota-modal__row-meta">
                            <span className={`badge badge-${asistencia}`}>
                              {attendanceLabel(asistencia, t)}
                            </span>
                            {memberAmount != null && (
                              <span className="event-cuota-modal__row-amount">
                                {formatCuotaMonto(memberAmount, { language, club: currencyClub })}
                              </span>
                            )}
                          </div>
                        </div>
                        <CuotaPaymentToggle
                          paid={paid}
                          disabled={saving || markingAllPaid}
                          onToggle={nextPaid => onTogglePayment(row.id, nextPaid)}
                          t={t}
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
