import { useLanguage } from '../../hooks/useLanguage';
import { attendanceLabel, confirmationLabel } from '../../i18n/helpers';
import * as EventosModel from '../../mvc/models/eventos.model';
import { PageHelpLink } from '../../components/PageHelp';
import MemberEventConfirmBlock from '../../components/MemberEventConfirmBlock';
import MemberEventConfirmationStatus from '../../components/MemberEventConfirmationStatus';
import '../../styles/eventAttendance.css';

function StatCard({ label, value, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: '#f3f4f6', color: '#111827' },
    success: { bg: '#dcfce7', color: '#166534' },
    warning: { bg: '#fef9c3', color: '#854d0e' },
    danger: { bg: '#fee2e2', color: '#991b1b' },
    info: { bg: '#dbeafe', color: '#1d4ed8' },
  };
  const style = tones[tone] || tones.neutral;

  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: '10px',
      backgroundColor: style.bg,
      color: style.color,
    }}>
      <div style={{ fontSize: '24px', fontWeight: '700', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '13px', marginTop: '6px', opacity: 0.9 }}>{label}</div>
    </div>
  );
}

function AttendanceBadge({ estado, t }) {
  const colors = {
    a_tiempo: { bg: '#dcfce7', color: '#166534' },
    tarde: { bg: '#fef9c3', color: '#854d0e' },
    ausente: { bg: '#fee2e2', color: '#991b1b' },
  };
  const style = colors[estado] || { bg: '#f3f4f6', color: '#4b5563' };

  return (
    <span style={{
      fontSize: '12px',
      fontWeight: 'bold',
      padding: '4px 10px',
      borderRadius: '999px',
      backgroundColor: style.bg,
      color: style.color,
      whiteSpace: 'nowrap',
    }}>
      {attendanceLabel(estado, t)}
    </span>
  );
}

function ConfirmationBadge({ estado, t }) {
  const colors = {
    confirmado: { bg: '#dcfce7', color: '#166534' },
    rechazado: { bg: '#fee2e2', color: '#991b1b' },
    pendiente: { bg: '#fef9c3', color: '#854d0e' },
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
      whiteSpace: 'nowrap',
    }}>
      {confirmationLabel(estado, t)}
    </span>
  );
}

function YesNoBadge({ value, t }) {
  const positive = value === true;
  return (
    <span style={{
      fontSize: '12px',
      fontWeight: 'bold',
      padding: '4px 10px',
      borderRadius: '999px',
      backgroundColor: positive ? '#dcfce7' : '#f3f4f6',
      color: positive ? '#166534' : '#6b7280',
      whiteSpace: 'nowrap',
    }}>
      {positive ? t('yes') : t('no')}
    </span>
  );
}

export default function MiembroAsistenciaView({
  rows,
  stats,
  error,
  loading,
  getEventoFromRow,
  getAsistenciaFromRow,
  getConfirmacionFromRow,
  getCheckedInAtFromRow,
  eventRequiresConfirmation,
  getTipoEventoNombre,
  isEventInFuture,
  memberAttendedEvent,
  getEventChurchTimezone,
  canMemberConfirmEvent,
  updateConfirmation,
  savingConfirmationId = null,
}) {
  const { t, language } = useLanguage();

  if (loading) {
    return <p>{t('loadingAttendance')}</p>;
  }

  return (
    <div>
      <h3>{t('tabAttendance')} <PageHelpLink pageId="memberAttendance" compact /></h3>
      {error && <div className="alert alert-error">{error}</div>}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <StatCard label={t('attendanceStatAssigned')} value={stats.assigned} tone="info" />
        <StatCard label={t('attendanceStatAttended')} value={stats.attended} tone="success" />
        <StatCard label={t('attendanceStatOnTime')} value={stats.onTime} tone="success" />
        <StatCard label={t('attendanceStatMisses')} value={stats.misses} tone="danger" />
        <StatCard label={t('attendanceStatLate')} value={stats.late} tone="warning" />
        <StatCard label={t('attendanceStatFailedConfirmations')} value={stats.failedConfirmations} tone="danger" />
      </div>

      {stats.attendanceRate != null && (
        <p style={{ fontSize: '14px', color: '#4b5563', margin: '0 0 20px' }}>
          {t('attendanceRateSummary')
            .replace('{rate}', String(stats.attendanceRate))
            .replace('{past}', String(stats.pastAssigned))}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-muted">{t('noMemberAttendance')}</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>{t('eventLabel')}</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>{t('eventDate')}</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>{t('attendanceConfirmation')}</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>{t('attendanceStatAttended')}</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>{t('attendanceOnTime')}</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>{t('attendanceStatusColumn')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const evento = getEventoFromRow(row);
                const asistencia = getAsistenciaFromRow(row);
                const confirmacion = getConfirmacionFromRow(row);
                const checkedInAt = getCheckedInAtFromRow(row);
                const needsConfirmation = eventRequiresConfirmation(evento);
                const timezone = getEventChurchTimezone?.(evento);
                const isFuture = timezone
                  ? isEventInFuture(evento, new Date(), timezone)
                  : isEventInFuture(evento);
                const canConfirm = canMemberConfirmEvent?.(row);
                const attended = memberAttendedEvent(row);
                const onTime = asistencia === 'a_tiempo';
                const tipoNombre = getTipoEventoNombre(evento);
                const clubName = evento?.clubes?.nombre;

                return (
                  <tr key={row.id || row.evento_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600 }}>{evento?.nombre || t('eventUntitled')}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        {evento?.lugar}
                        {tipoNombre && <> · {tipoNombre}</>}
                        {clubName && <> · {clubName}</>}
                      </div>
                      {isFuture && (
                        <span style={{
                          display: 'inline-block',
                          marginTop: '6px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          backgroundColor: '#dbeafe',
                          color: '#1d4ed8',
                        }}>
                          {t('upcomingEvent')}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      <div>{evento?.fecha}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        {EventosModel.formatEventLocalTime(evento?.hora, language)}
                      </div>
                      {checkedInAt && (
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                          {t('checkedInAt')}: {(() => {
                            const stamp = new Date(checkedInAt);
                            return Number.isNaN(stamp.getTime()) ? String(checkedInAt) : stamp.toLocaleString();
                          })()}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'top' }}>
                      {canConfirm && updateConfirmation ? (
                        <MemberEventConfirmBlock
                          row={row}
                          updateConfirmation={updateConfirmation}
                          savingConfirmationId={savingConfirmationId}
                          t={t}
                        />
                      ) : confirmacion !== 'pendiente' ? (
                        <MemberEventConfirmationStatus
                          row={row}
                          updateConfirmation={updateConfirmation}
                          savingConfirmationId={savingConfirmationId}
                          t={t}
                          variant="inline"
                        />
                      ) : needsConfirmation ? (
                        <ConfirmationBadge estado={confirmacion} t={t} />
                      ) : (
                        <span style={{ color: '#9ca3af' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'top' }}>
                      {isFuture ? (
                        <span style={{ color: '#9ca3af' }}>—</span>
                      ) : (
                        <YesNoBadge value={attended} t={t} />
                      )}
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'top' }}>
                      {isFuture ? (
                        <span style={{ color: '#9ca3af' }}>—</span>
                      ) : (
                        <YesNoBadge value={onTime} t={t} />
                      )}
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'top' }}>
                      <AttendanceBadge estado={asistencia} t={t} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
