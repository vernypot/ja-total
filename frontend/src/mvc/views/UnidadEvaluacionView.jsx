import { Link } from 'react-router-dom';
import BackLink from '../../components/BackLink';
import UnidadEvalMaintenancePanel from '../../components/UnidadEvalMaintenancePanel';
import { PageHelpLink } from '../../components/PageHelp';
import { clubDisplayName } from '../../utils/club';
import '../../styles/form.css';
import '../../styles/unidades.css';

export default function UnidadEvaluacionView({
  canManage,
  clubId,
  club,
  clubs,
  setClubId,
  unidades,
  evalConfig,
  evalItems,
  evalCantidades,
  evalSchemaAvailable,
  loading,
  error,
  message,
  savingEval,
  savingItemId,
  savingCantidadKey,
  saveEvalConfig,
  saveEvalItem,
  removeEvalItem,
  setEvalItemCantidad,
  iglesiaScopeReady,
  t,
}) {
  if (!canManage) {
    return (
      <div style={{ padding: '20px' }}>
        <p>{t('unauthorized')}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <BackLink to={clubId ? `/dashboard/unidades?club=${clubId}` : '/dashboard/unidades'}>
        {t('unidades')}
      </BackLink>

      <div className="unidades-header">
        <div>
          <h1>{t('unidadEvalMaintenanceTitle')} <PageHelpLink pageId="unidades" /></h1>
          {club && (
            <p className="unidades-club-label">
              {clubDisplayName(club)}
            </p>
          )}
        </div>
      </div>

      <p className="unidades-intro">{t('unidadEvalMaintenanceIntro')}</p>

      {clubs.length > 1 && (
        <label className="unidades-field" style={{ maxWidth: '320px', marginBottom: '16px' }}>
          <span className="unidades-field__label">{t('club')}</span>
          <select
            className="form-input"
            value={clubId}
            onChange={e => setClubId(e.target.value)}
          >
            <option value="">{t('selectClub')}</option>
            {clubs.map(item => (
              <option key={item.id} value={item.id}>{clubDisplayName(item)}</option>
            ))}
          </select>
        </label>
      )}

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!iglesiaScopeReady ? (
        <p className="text-muted">{t('noActiveIglesiaAssignment')}</p>
      ) : !clubId ? (
        <p className="text-muted">{t('selectClubForUnidadEvalMaintenance')}</p>
      ) : loading && !unidades.length && !evalItems.length ? (
        <p className="text-muted">{t('loading')}</p>
      ) : (
        <UnidadEvalMaintenancePanel
          unidades={unidades}
          evalConfig={evalConfig}
          evalItems={evalItems}
          evalCantidades={evalCantidades}
          evalSchemaAvailable={evalSchemaAvailable}
          savingEval={savingEval}
          savingItemId={savingItemId}
          savingCantidadKey={savingCantidadKey}
          onSaveConfig={saveEvalConfig}
          onSaveItem={saveEvalItem}
          onRemoveItem={removeEvalItem}
          onSetCantidad={setEvalItemCantidad}
          t={t}
        />
      )}

      <p style={{ marginTop: '16px' }}>
        <Link className="home-link-btn" to={clubId ? `/dashboard/unidades?club=${clubId}` : '/dashboard/unidades'}>
          {t('unidadEvalBackToUnidades')}
        </Link>
      </p>
    </div>
  );
}
