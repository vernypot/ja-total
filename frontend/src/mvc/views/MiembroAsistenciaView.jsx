import { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { PageHelpLink } from '../../components/PageHelp';
import EvalScoreDetailModal from '../../components/EvalScoreDetailModal';
import { formatEvalScore } from '../../utils/unidadEvaluacion';
import MiembroEventosView from './MiembroEventosView';
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

function AttendanceStatsSection({ stats, evalScore, evalScoreDetail, t, language }) {
  const [detailOpen, setDetailOpen] = useState(false);

  if (!stats) return null;

  const evalScoreLabel = evalScore?.validationActive
    ? formatEvalScore(evalScore.average)
    : '—';

  const showDetailCta = Boolean(evalScoreDetail);

  return (
    <>
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
        <StatCard label={t('memberEvalAccumulatedScore')} value={evalScoreLabel} tone="info" />
      </div>

      {showDetailCta && (
        <div className="eval-score-detail-cta">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setDetailOpen(true)}
          >
            {t('evalScoreDetailCta')}
          </button>
        </div>
      )}

      {evalScore?.validationActive && evalScore.count > 0 && (
        <p style={{ fontSize: '14px', color: '#4b5563', margin: '0 0 12px' }}>
          {t('memberEvalFinishedEventsOnly').replace('{count}', String(evalScore.count))}
        </p>
      )}

      {stats.attendanceRate != null && (
        <p style={{ fontSize: '14px', color: '#4b5563', margin: '0 0 20px' }}>
          {t('attendanceRateSummary')
            .replace('{rate}', String(stats.attendanceRate))
            .replace('{past}', String(stats.pastAssigned))}
        </p>
      )}

      <EvalScoreDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={t('evalScoreDetailMemberTitle')}
        mode="member"
        detail={evalScoreDetail}
        t={t}
        language={language}
      />
    </>
  );
}

export default function MiembroAsistenciaView(props) {
  const { stats, evalScore, evalScoreDetail, loading, error } = props;
  const { t, language } = useLanguage();

  if (loading) {
    return <p>{t('loadingAttendance')}</p>;
  }

  return (
    <div>
      <h3>{t('tabAttendance')} <PageHelpLink pageId="memberAttendance" compact /></h3>
      {error && <div className="alert alert-error">{error}</div>}

      <MiembroEventosView
        {...props}
        embedded
        renderBeforeList={(
          <AttendanceStatsSection
            stats={stats}
            evalScore={evalScore}
            evalScoreDetail={evalScoreDetail}
            t={t}
            language={language}
          />
        )}
      />
    </div>
  );
}
