import { useLanguage } from '../../hooks/useLanguage';
import { clubDisplayName } from '../../utils/club';
import ReglamentoEditor from '../../components/ReglamentoEditor';
import ReglamentoTree from '../../components/ReglamentoTree';
import { PageHelpLink } from '../../components/PageHelp';
import '../../styles/reglamento.css';

export default function ReglamentoView({
  canManage,
  isMemberView,
  clubs,
  clubId,
  setClubId,
  tree,
  loading,
  error,
  message,
  schemaAvailable,
  saving,
  saveNodo,
  deleteNodo,
}) {
  const { t } = useLanguage();

  return (
    <div className="container reglamento-page">
      <div className="page-header">
        <div>
          <h1>{t('reglamentoTitle')} <PageHelpLink pageId="reglamento" /></h1>
          <p className="reglamento-page__intro">
            {isMemberView ? t('reglamentoMemberIntro') : t('reglamentoStaffIntro')}
          </p>
        </div>
      </div>

      {clubs.length > 1 && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
            {t('selectClub')}
          </label>
          <select
            value={clubId}
            onChange={e => setClubId(e.target.value)}
            className="form-input"
            style={{ maxWidth: '400px' }}
          >
            <option value="">{t('selectClub')}</option>
            {clubs.map(club => (
              <option key={club.id} value={club.id}>{clubDisplayName(club)}</option>
            ))}
          </select>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {!clubId ? (
        <p className="text-muted">{t('reglamentoSelectClub')}</p>
      ) : loading ? (
        <div className="loading">{t('loading')}</div>
      ) : (
        <>
          {!schemaAvailable && canManage && (
            <div className="alert alert-error">{t('reglamentoSchemaHint')}</div>
          )}

          <div className="card reglamento-read-card">
            <h2>{t('reglamentoReadTitle')}</h2>
            <ReglamentoTree tree={tree} t={t} />
          </div>

          {canManage && (
            <ReglamentoEditor
              tree={tree}
              saving={saving}
              onSave={saveNodo}
              onDelete={deleteNodo}
              t={t}
            />
          )}
        </>
      )}
    </div>
  );
}
