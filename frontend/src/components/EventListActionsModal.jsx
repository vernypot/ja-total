import MemberEventConfirmationStatus from './MemberEventConfirmationStatus';
import * as EventosModel from '../mvc/models/eventos.model';

function MenuButton({ label, onClick, tone = 'default', disabled = false }) {
  return (
    <button
      type="button"
      className={`event-overflow-menu-item event-overflow-menu-item--${tone}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

export function EventListOverflowTrigger({ onClick, t }) {
  return (
    <button
      type="button"
      className="event-overflow-menu-trigger"
      onClick={onClick}
      aria-label={t('eventMoreActions')}
      aria-haspopup="dialog"
    >
      <span aria-hidden="true">⋮</span>
    </button>
  );
}

export default function EventListActionsModal({
  open,
  onClose,
  evento,
  t,
  canManage,
  isActive,
  isExcluded,
  isFuture,
  needsConfirmation,
  isEditing,
  expanded,
  editingAttendees,
  selfRow,
  updateSelfConfirmation,
  savingSelfConfirmationId,
  onEdit,
  onManageAttendance,
  onUpdateAttendees,
  onExclude,
  onRestore,
  onCancelEvent,
  onDeactivate,
  onShowAttendanceList,
  onShowSummary,
}) {
  if (!open || !evento) return null;

  const showSelfConfirmInModal = Boolean(
    updateSelfConfirmation
    && selfRow
    && !isExcluded
    && EventosModel.eventRequiresConfirmation(evento)
    && EventosModel.memberEventConfirmationResponded(selfRow)
  );

  function run(action) {
    onClose();
    action();
  }

  const items = [];

  if (canManage) {
    items.push({
      key: 'edit',
      label: isEditing ? t('cancel') : t('edit'),
      onClick: () => run(onEdit),
    });

    items.push({
      key: 'attendance',
      label: expanded ? t('hideAttendanceList') : t('manageAttendance'),
      onClick: () => run(onManageAttendance),
    });

    if (isFuture && needsConfirmation && isActive) {
      items.push({
        key: 'attendees',
        label: editingAttendees ? t('cancel') : t('updateAttendees'),
        onClick: () => run(onUpdateAttendees),
      });
    }

    if (isExcluded) {
      items.push({
        key: 'restore',
        label: t('eventRestoreToAttendanceAction'),
        tone: 'success',
        onClick: () => run(onRestore),
      });
    } else {
      items.push({
        key: 'exclude',
        label: t('eventExcludeFromAttendanceAction'),
        tone: 'warning',
        onClick: () => run(onExclude),
      });
    }

    if (isActive) {
      items.push({
        key: 'cancel',
        label: t('cancelEvent'),
        tone: 'warning',
        onClick: () => run(onCancelEvent),
      });
      items.push({
        key: 'deactivate',
        label: t('deactivate'),
        tone: 'danger',
        onClick: () => run(onDeactivate),
      });
    }
  } else if (onShowAttendanceList) {
    items.push({
      key: 'attendance-view',
      label: expanded ? t('hideAttendanceList') : t('showAttendanceList'),
      onClick: () => run(onShowAttendanceList),
    });
  }

  if (onShowSummary && !isExcluded) {
    items.push({
      key: 'summary',
      label: t('eventAttendanceSummaryAction'),
      onClick: () => run(onShowSummary),
    });
  }

  return (
    <div
      className="event-overflow-menu-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="event-overflow-menu"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-overflow-menu-title"
        onClick={event => event.stopPropagation()}
      >
        <div className="event-overflow-menu__header">
          <div className="event-overflow-menu__title-wrap">
            <h3 id="event-overflow-menu-title">{evento.nombre || t('eventUntitled')}</h3>
            <p className="event-overflow-menu__subtitle">{t('eventMoreActions')}</p>
          </div>
          <button
            type="button"
            className="event-overflow-menu__close"
            onClick={onClose}
            aria-label={t('close')}
          >
            ✕
          </button>
        </div>

        {items.length > 0 && (
          <div className="event-overflow-menu__actions">
            {items.map(item => (
              <MenuButton
                key={item.key}
                label={item.label}
                tone={item.tone}
                disabled={item.disabled}
                onClick={item.onClick}
              />
            ))}
          </div>
        )}

        {showSelfConfirmInModal && (
          <div className="event-overflow-menu__section">
            <h4 className="event-overflow-menu__section-title">{t('adminSelfEventConfirmTitle')}</h4>
            <p className="event-overflow-menu__section-hint">{t('adminSelfEventConfirmHint')}</p>
            <MemberEventConfirmationStatus
              row={selfRow}
              updateConfirmation={updateSelfConfirmation}
              savingConfirmationId={savingSelfConfirmationId}
              t={t}
              variant="inline"
            />
          </div>
        )}
      </div>
    </div>
  );
}
