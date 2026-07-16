import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { MemberConfirmationControls } from './EventAttendanceControls';
import * as EventosModel from '../mvc/models/eventos.model';

export default function MemberEventConfirmBlock({
  row,
  updateConfirmation,
  savingConfirmationId = null,
  t,
  className = '',
}) {
  const { askConfirm, confirmDialog } = useConfirmDialog({
    cancelLabel: t('cancel'),
    confirmingLabel: t('saving'),
  });

  if (!EventosModel.canMemberConfirmEvent(row)) return null;

  const evento = EventosModel.getEventoFromRow(row);
  const confirmacion = EventosModel.getConfirmacionFromRow(row);
  const assignmentId = EventosModel.getEventoMiembroRowId(row);
  const eventoId = EventosModel.getEventoIdFromRow(row);
  const saveKey = EventosModel.memberConfirmationSaveKey(row);
  const saving = savingConfirmationId != null && savingConfirmationId === saveKey;

  function persist(estado) {
    return updateConfirmation(
      assignmentId,
      estado,
      assignmentId ? null : eventoId
    );
  }

  function handleDecline() {
    askConfirm({
      title: t('confirmDeclineAttendanceTitle'),
      message: t('confirmDeclineAttendanceMessage'),
      highlight: evento?.nombre || t('eventUntitled'),
      confirmLabel: t('approvalRequestReject'),
      onConfirm: async () => { await persist('rechazado'); },
    });
  }

  return (
    <div className={className}>
      <MemberConfirmationControls
        current={confirmacion}
        saving={saving}
        prominent
        onSet={estado => persist(estado)}
        onDecline={handleDecline}
        t={t}
      />
      {confirmDialog}
    </div>
  );
}
