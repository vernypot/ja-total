import { useMemo, useState, Fragment } from 'react';
import FormModal from './FormModal';
import * as EventosModel from '../mvc/models/eventos.model';
import {
  ATTENDANCE_EVAL_KEYS,
  formatEvalPoints,
  formatEvalScore,
  getScoreSituationLabelKey,
} from '../utils/unidadEvaluacion';
import '../styles/eventAttendance.css';

const BREAKDOWN_LABEL_KEYS = {
  confirmacion: 'unidadEvalConfirmacionLabel',
  a_tiempo: 'unidadEvalOnTimeLabel',
  tarde: 'unidadEvalLateLabel',
  ausente_injustificada: 'unidadEvalAbsentUnjustifiedLabel',
  ausente_justificada: 'unidadEvalAbsentJustifiedLabel',
};

function BreakdownSummary({ breakdown, attendanceByCategory, t }) {
  const rows = ATTENDANCE_EVAL_KEYS
    .map(key => ({
      key,
      count: breakdown?.[key] || 0,
      points: attendanceByCategory?.[key] ?? null,
    }))
    .filter(row => row.count > 0 || (row.points != null && row.points !== 0));

  if (!rows.length) {
    return <p className="eval-score-detail-empty">{t('evalScoreDetailNoBreakdown')}</p>;
  }

  return (
    <div className="eval-score-detail-summary">
      <h3>{t('evalScoreDetailSummary')}</h3>
      <table className="eval-score-detail-table">
        <thead>
          <tr>
            <th>{t('evalScoreDetailSituation')}</th>
            <th>{t('evalScoreDetailCount')}</th>
            {attendanceByCategory && <th>{t('evalScoreDetailPoints')}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.key}>
              <td>{t(BREAKDOWN_LABEL_KEYS[row.key] || row.key)}</td>
              <td>{row.count}</td>
              {attendanceByCategory && (
                <td>{row.points != null ? formatEvalPoints(row.points) : '—'}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventScoreTable({ events, t, language }) {
  if (!events?.length) {
    return <p className="eval-score-detail-empty">{t('evalScoreDetailNoEvents')}</p>;
  }

  return (
    <div className="eval-score-detail-events">
      <h3>{t('evalScoreDetailEvents')}</h3>
      <div className="eval-score-detail-table-wrap">
        <table className="eval-score-detail-table">
          <thead>
            <tr>
              <th>{t('eventDate')}</th>
              <th>{t('eventLabel')}</th>
              <th>{t('evalScoreDetailSituation')}</th>
              <th>{t('evalScoreDetailScore')}</th>
              <th>{t('evalScoreDetailCuotaBonus')}</th>
              <th>{t('evalScoreDetailTotal')}</th>
            </tr>
          </thead>
          <tbody>
            {events.map(event => (
              <tr key={event.eventId}>
                <td>
                  {event.eventDate}
                  {event.eventTime && (
                    <div className="eval-score-detail-sub">
                      {EventosModel.formatEventLocalTime(event.eventTime, language)}
                    </div>
                  )}
                </td>
                <td>{event.eventName || t('eventUntitled')}</td>
                <td>{t(getScoreSituationLabelKey(event.situationKey))}</td>
                <td>{formatEvalPoints(event.score)}</td>
                <td>{event.cuotaBonus > 0 ? `+${formatEvalPoints(event.cuotaBonus)}` : '—'}</td>
                <td><strong>{formatEvalPoints(event.totalScore)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UnitMembersSection({ members, t, language }) {
  const [expandedMemberId, setExpandedMemberId] = useState(null);

  if (!members?.length) {
    return <p className="eval-score-detail-empty">{t('evalScoreDetailNoEvents')}</p>;
  }

  return (
    <div className="eval-score-detail-members">
      <h3>{t('evalScoreDetailMembers')}</h3>
      <div className="eval-score-detail-table-wrap">
        <table className="eval-score-detail-table">
          <thead>
            <tr>
              <th>{t('members')}</th>
              <th>{t('memberEvalAccumulatedScore')}</th>
              <th>{t('unidadEvalOnTimeLabel')}</th>
              <th>{t('unidadEvalLateLabel')}</th>
              <th>{t('unidadEvalAbsentJustifiedLabel')}</th>
              <th>{t('unidadEvalAbsentUnjustifiedLabel')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {members.map(member => {
              const expanded = expandedMemberId === member.memberId;
              return (
                <Fragment key={member.memberId}>
                  <tr>
                    <td><strong>{member.memberName}</strong></td>
                    <td>{formatEvalScore(member.average)}</td>
                    <td>{member.breakdown?.a_tiempo || 0}</td>
                    <td>{member.breakdown?.tarde || 0}</td>
                    <td>{member.breakdown?.ausente_justificada || 0}</td>
                    <td>{member.breakdown?.ausente_injustificada || 0}</td>
                    <td>
                      {member.events?.length > 0 && (
                        <button
                          type="button"
                          className="home-link-btn"
                          onClick={() => setExpandedMemberId(expanded ? null : member.memberId)}
                        >
                          {expanded ? t('evalScoreDetailHideEvents') : t('evalScoreDetailShowEvents')}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded && member.events?.length > 0 && (
                    <tr className="eval-score-detail-member-events-row">
                      <td colSpan={7}>
                        <EventScoreTable events={member.events} t={t} language={language} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function EvalScoreDetailModal({
  open,
  onClose,
  title,
  mode = 'member',
  detail,
  t,
  language,
}) {
  const headerSummary = useMemo(() => {
    if (!detail?.validationActive) return null;
    if (mode === 'member') {
      return formatEvalScore(detail.average);
    }
    return null;
  }, [detail, mode]);

  return (
    <FormModal open={open} title={title} onClose={onClose} maxWidth="920px">
      {!detail?.validationActive ? (
        <p className="eval-score-detail-empty">{t('evalScoreDetailPendingValidation')}</p>
      ) : (
        <>
          {headerSummary && (
            <p className="eval-score-detail-average">
              {t('memberEvalAccumulatedScore')}: <strong>{headerSummary}</strong>
              {detail.count > 0 && (
                <span className="eval-score-detail-average-note">
                  {' '}({t('memberEvalFinishedEventsOnly').replace('{count}', String(detail.count))})
                </span>
              )}
            </p>
          )}

          <BreakdownSummary
            breakdown={detail.breakdown}
            attendanceByCategory={mode === 'unit' ? detail.attendanceByCategory : null}
            t={t}
          />

          {mode === 'member' && (
            <EventScoreTable events={detail.events} t={t} language={language} />
          )}

          {mode === 'unit' && (
            <UnitMembersSection members={detail.members} t={t} language={language} />
          )}
        </>
      )}
    </FormModal>
  );
}
