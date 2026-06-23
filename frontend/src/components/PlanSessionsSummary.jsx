import { summarizePlanSessions } from '../mvc/models/planificacion.model';

function meetingLabel(meeting, t) {
  const base = meeting.titulo || `${t('planMeeting')} ${meeting.numero}`;
  return meeting.fecha ? `${base} (${meeting.fecha})` : base;
}

export default function PlanSessionsSummary({
  reuniones = [],
  assignmentsByMeeting = {},
  t,
  compact = false,
}) {
  const { totalSesiones, totalReqs, byMeeting } = summarizePlanSessions(
    assignmentsByMeeting,
    reuniones
  );
  const meetingsWithAssignments = byMeeting.filter(m => m.reqCount > 0);

  if (compact) {
    return (
      <p style={{ margin: 0, fontSize: '13px', color: '#374151' }}>
        <strong>{t('planSessionsSummary')}:</strong>{' '}
        {totalSesiones} {t('planSessionsShort')}
        {totalReqs > 0 && (
          <> · {totalReqs} {totalReqs === 1 ? t('planReqSingular') : t('planReqPlural')}</>
        )}
      </p>
    );
  }

  return (
    <section
      style={{
        marginTop: '16px',
        padding: '12px 14px',
        borderRadius: '8px',
        border: '1px solid #dbeafe',
        backgroundColor: '#f0f9ff',
      }}
    >
      <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700, color: '#1e3a8a' }}>
        {t('planSessionsSummary')}
      </h4>
      <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#374151', lineHeight: 1.45 }}>
        <strong>{totalSesiones}</strong> {t('planSessionsShort')}
        {totalReqs > 0 && (
          <>
            {' '}{t('planSessionsAcrossReqs').replace('{count}', String(totalReqs))}
          </>
        )}
        {totalReqs === 0 && (
          <> · {t('planSessionsNoneAssigned')}</>
        )}
      </p>
      {meetingsWithAssignments.length > 0 && (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'grid',
            gap: '6px',
          }}
        >
          {meetingsWithAssignments.map(meeting => (
            <li
              key={meeting.reunionId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                fontSize: '12px',
                color: '#4b5563',
                padding: '6px 8px',
                backgroundColor: '#fff',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
              }}
            >
              <span>{meetingLabel(meeting, t)}</span>
              <span style={{ fontWeight: 600, color: '#1d4ed8', whiteSpace: 'nowrap' }}>
                {meeting.sesiones} {t('planSessionsShort')}
                {' · '}
                {meeting.reqCount}{' '}
                {meeting.reqCount === 1 ? t('planReqSingular') : t('planReqPlural')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
