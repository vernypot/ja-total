import { attendanceLabel, confirmationLabel } from '../i18n/helpers';
import '../styles/eventAttendance.css';

export function EventActionButton({ children, onClick, tone = 'primary', disabled = false }) {
  return (
    <button
      type="button"
      className={`event-action-btn event-action-btn--${tone}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function EventStatusToggleButton({ estado, selected, label, onClick, className = '' }) {
  return (
    <button
      type="button"
      className={[
        'event-status-toggle',
        className,
        selected ? 'is-selected' : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}

export function ConfirmationControls({ eventoMiembroId, eventoId, current, canManage, onSet, t }) {
  if (!canManage) {
    return <ConfirmationBadge estado={current} t={t} />;
  }

  return (
    <div className="event-status-toggle-group">
      {['pendiente', 'confirmado', 'rechazado'].map(estado => (
        <EventStatusToggleButton
          key={estado}
          estado={estado}
          selected={current === estado}
          label={confirmationLabel(estado, t)}
          className={`event-status-toggle--${estado}`}
          onClick={() => onSet(eventoMiembroId, estado, eventoId)}
        />
      ))}
    </div>
  );
}

export function AttendanceControls({ eventoMiembroId, eventoId, current, canManage, onSet, t }) {
  if (!canManage) {
    return <AttendanceBadge estado={current} t={t} />;
  }

  return (
    <div className="event-status-toggle-group">
      {['a_tiempo', 'tarde', 'ausente'].map(estado => (
        <EventStatusToggleButton
          key={estado}
          estado={estado}
          selected={current === estado}
          label={attendanceLabel(estado, t)}
          className={`event-status-toggle--${estado === 'a_tiempo' ? 'confirmado' : estado}`}
          onClick={() => onSet(eventoMiembroId, estado, eventoId)}
        />
      ))}
    </div>
  );
}

export function ConfirmationBadge({ estado, t }) {
  const colors = {
    confirmado: { bg: 'var(--success-light)', color: 'var(--color-text-primary)', border: 'var(--success)' },
    rechazado: { bg: 'var(--danger-light)', color: 'var(--color-text-primary)', border: 'var(--danger)' },
    pendiente: { bg: 'var(--warning-light)', color: 'var(--color-text-primary)', border: 'var(--warning)' },
  };
  const style = colors[estado] || colors.pendiente;

  return (
    <span style={{
      fontSize: '12px',
      fontWeight: 'bold',
      padding: '4px 10px',
      borderRadius: '999px',
      backgroundColor: style.bg,
      color: style.color,
      border: `1px solid ${style.border}`,
    }}>
      {confirmationLabel(estado, t)}
    </span>
  );
}

export function AttendanceBadge({ estado, t }) {
  const colors = {
    a_tiempo: { bg: 'var(--success-light)', color: 'var(--color-text-primary)', border: 'var(--success)' },
    tarde: { bg: 'var(--warning-light)', color: 'var(--color-text-primary)', border: 'var(--warning)' },
    ausente: { bg: 'var(--danger-light)', color: 'var(--color-text-primary)', border: 'var(--danger)' },
  };
  const style = colors[estado] || { bg: 'var(--gray-100)', color: 'var(--color-text-muted)', border: 'var(--gray-300)' };

  return (
    <span style={{
      fontSize: '12px',
      fontWeight: 'bold',
      padding: '4px 10px',
      borderRadius: '999px',
      backgroundColor: style.bg,
      color: style.color,
      border: `1px solid ${style.border}`,
    }}>
      {attendanceLabel(estado, t)}
    </span>
  );
}
