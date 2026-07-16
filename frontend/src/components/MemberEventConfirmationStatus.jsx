import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { confirmationLabel } from '../i18n/helpers';
import { ConfirmationBadge } from './EventAttendanceControls';
import * as EventosModel from '../mvc/models/eventos.model';

export default function MemberEventConfirmationStatus({
  row,
  updateConfirmation,
  savingConfirmationId = null,
  t,
  className = '',
  variant = 'banner',
  showLabel = true,
}) {
  const { askConfirm, confirmDialog } = useConfirmDialog({
    cancelLabel: t('cancel'),
    confirmingLabel: t('saving'),
  });

  if (!EventosModel.memberEventConfirmationResponded(row)) return null;

  const evento = EventosModel.getEventoFromRow(row);
  const confirmacion = EventosModel.getConfirmacionFromRow(row);
  const assignmentId = EventosModel.getEventoMiembroRowId(row);
  const eventoId = EventosModel.getEventoIdFromRow(row);
  const saveKey = EventosModel.memberConfirmationSaveKey(row);
  const saving = savingConfirmationId != null && savingConfirmationId === saveKey;
  const canCancel = EventosModel.canMemberCancelEventConfirmation(row) && Boolean(updateConfirmation);

  function persist(estado) {
    return updateConfirmation(
      assignmentId,
      estado,
      assignmentId ? null : eventoId
    );
  }

  function handleCancel() {
    askConfirm({
      title: t('confirmCancelConfirmationTitle'),
      message: t('confirmCancelConfirmationMessage'),
      highlight: evento?.nombre || t('eventUntitled'),
      confirmLabel: t('memberCancelConfirmation'),
      onConfirm: async () => { await persist('pendiente'); },
    });
  }

  const cancelButton = canCancel ? (
    <button
      type="button"
      className="member-event-confirm-cancel"
      disabled={saving}
      onClick={handleCancel}
    >
      {saving ? t('saving') : t('memberCancelConfirmation')}
    </button>
  ) : null;

  if (variant === 'inline') {
    return (
      <div className={className}>
        <div className="member-event-confirm-status-inline">
          <ConfirmationBadge estado={confirmacion} t={t} />
          {cancelButton}
        </div>
        {confirmDialog}
      </div>
    );
  }

  if (variant === 'home') {
    return (
      <div className={`portal-home-event-actions member-event-confirm-status-home${className ? ` ${className}` : ''}`}>
        <span className="portal-home-event-status">{confirmationLabel(confirmacion, t)}</span>
        {cancelButton}
        {confirmDialog}
      </div>
    );
  }

  return (
    <div className={`member-event-confirm-banner member-event-confirm-banner--resolved${className ? ` ${className}` : ''}`}>
      <div className="member-event-confirm-banner__head">
        {showLabel && (
          <span className="member-event-confirm-banner__label">{t('attendanceConfirmation')}</span>
        )}
        <ConfirmationBadge estado={confirmacion} t={t} />
      </div>
      {cancelButton}
      {confirmDialog}
    </div>
  );
}
