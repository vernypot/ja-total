import * as EventosModel from '../mvc/models/eventos.model';
import {
  formatCuotaMonto,
  resolveEventCuotaClub,
  resolveMemberEventCuotaMonto,
} from '../utils/cuota';

export function MemberEventCuotaBadge({ paid, t, className = '' }) {
  return (
    <span
      className={`member-event-cuota-badge member-event-cuota-badge--${paid ? 'paid' : 'unpaid'} ${className}`.trim()}
    >
      {t(paid ? 'eventCuotaPaid' : 'eventCuotaUnpaid')}
    </span>
  );
}

export default function MemberEventCuotaSummary({ row, evento, language, t, variant = 'inline' }) {
  if (!evento?.cuota_aplica) return null;

  const club = resolveEventCuotaClub(evento, evento.clubes);
  const amount = resolveMemberEventCuotaMonto({ evento, club, memberRow: row });
  const paid = EventosModel.getCuotaPagadaFromRow(row);

  if (variant === 'badge-only') {
    return <MemberEventCuotaBadge paid={paid} t={t} />;
  }

  return (
    <div className={`member-event-cuota-summary member-event-cuota-summary--${variant}`}>
      <span className="member-event-cuota-summary__label">{t('memberEventCuotaLabel')}</span>
      {amount != null && (
        <span className="member-event-cuota-summary__amount">
          {formatCuotaMonto(amount, { language, club })}
        </span>
      )}
      <MemberEventCuotaBadge paid={paid} t={t} />
    </div>
  );
}
