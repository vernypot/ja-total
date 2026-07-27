import MemberEventConfirmBlock from './MemberEventConfirmBlock';
import MemberEventConfirmationStatus from './MemberEventConfirmationStatus';
import * as EventosModel from '../mvc/models/eventos.model';

export default function LinkedMemberEventConfirmSection({
  evento,
  selfRow,
  updateConfirmation,
  savingConfirmationId = null,
  t,
  className = '',
}) {
  if (!selfRow || !evento || !EventosModel.eventRequiresConfirmation(evento)) return null;

  const canConfirm = EventosModel.canMemberConfirmEvent(selfRow);
  const responded = EventosModel.memberEventConfirmationResponded(selfRow);

  if (!canConfirm && !responded) return null;

  return (
    <section className={`linked-member-event-confirm ${className}`.trim()}>
      <div className="linked-member-event-confirm__head">
        <h4>{t('adminSelfEventConfirmTitle')}</h4>
        <p>{t('adminSelfEventConfirmHint')}</p>
      </div>
      {canConfirm ? (
        <MemberEventConfirmBlock
          row={selfRow}
          updateConfirmation={updateConfirmation}
          savingConfirmationId={savingConfirmationId}
          t={t}
        />
      ) : (
        <MemberEventConfirmationStatus
          row={selfRow}
          updateConfirmation={updateConfirmation}
          savingConfirmationId={savingConfirmationId}
          t={t}
        />
      )}
    </section>
  );
}
