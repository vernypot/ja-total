import { clubDisplayName } from '../utils/club';
import '../styles/club-list-actions.css';

function MenuButton({ label, onClick, tone = 'default', disabled = false }) {
  return (
    <button
      type="button"
      className={`club-actions-menu-item club-actions-menu-item--${tone}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

export function ClubListOverflowTrigger({ onClick, t }) {
  return (
    <button
      type="button"
      className="club-actions-menu-trigger"
      onClick={onClick}
      aria-label={t('clubMoreActions')}
      aria-haspopup="dialog"
    >
      <span aria-hidden="true">⋮</span>
    </button>
  );
}

export default function ClubListActionsModal({
  open,
  club,
  onClose,
  t,
  canManage,
  onEdit,
  onDetalles,
  onMiembros,
  onUnidades,
  onDirectiva,
  onEventos,
  onToggleEstado,
}) {
  if (!open || !club) return null;

  function run(action) {
    onClose();
    action();
  }

  const items = [
    {
      key: 'details',
      label: `ℹ️ ${t('details')}`,
      onClick: () => run(() => onDetalles(club)),
    },
    ...(canManage ? [{
      key: 'edit',
      label: `✏️ ${t('editClub')}`,
      onClick: () => run(() => onEdit(club)),
    }] : []),
    {
      key: 'members',
      label: `👥 ${t('membersBtn')}`,
      onClick: () => run(() => onMiembros(club.id)),
    },
    {
      key: 'units',
      label: `🧩 ${t('unidadBtn')}`,
      onClick: () => run(() => onUnidades(club.id)),
    },
    {
      key: 'board',
      label: `🎖️ ${t('directivaBtn')}`,
      onClick: () => run(() => onDirectiva(club.id)),
    },
    {
      key: 'events',
      label: `📅 ${t('eventsBtn')}`,
      onClick: () => run(() => onEventos(club.id)),
    },
    ...(canManage ? [{
      key: 'estado',
      label: club.estado === 'activo' ? `❌ ${t('deactivate')}` : `✓ ${t('activate')}`,
      tone: club.estado === 'activo' ? 'danger' : 'success',
      onClick: () => run(() => onToggleEstado(club)),
    }] : []),
  ];

  return (
    <div
      className="club-actions-menu-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="club-actions-menu"
        role="dialog"
        aria-modal="true"
        aria-labelledby="club-actions-menu-title"
        onClick={event => event.stopPropagation()}
      >
        <div className="club-actions-menu__header">
          <div className="club-actions-menu__title-wrap">
            <h3 id="club-actions-menu-title">{clubDisplayName(club)}</h3>
            <p className="club-actions-menu__subtitle">{t('clubMoreActions')}</p>
          </div>
          <button
            type="button"
            className="club-actions-menu__close"
            onClick={onClose}
            aria-label={t('close')}
          >
            ✕
          </button>
        </div>

        <div className="club-actions-menu__actions">
          {items.map(item => (
            <MenuButton
              key={item.key}
              label={item.label}
              tone={item.tone}
              onClick={item.onClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
