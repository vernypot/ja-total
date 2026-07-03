import { Link } from 'react-router-dom';
import CarnetLetterBatch from '../../components/CarnetLetterBatch';
import { PageHelpLink } from '../../components/PageHelp';
import * as CarnetModel from '../../mvc/models/carnet.model';
import '../../styles/carnet.css';

const headerBtnStyle = {
  padding: '10px 20px',
  backgroundColor: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 'bold',
};

export default function ClubCarnetsPrintView({
  t,
  activeClub,
  club,
  clubs,
  clubId,
  members,
  tokens,
  loading,
  error,
  expirationLabel,
  selectClub,
  printAll,
  goToClubs,
  clubDisplayName,
  effectiveIglesiaId,
}) {
  const readyCount = members.length;
  const letterPageCount = CarnetModel.chunkMembersForLetterPages(members).length;
  const totalPrintPages = letterPageCount * 2;

  return (
    <div className="container carnet-screen">
      <div className="carnet-toolbar no-print">
        <div className="page-header" style={{ marginBottom: '16px' }}>
          <div>
            <h1 style={{ margin: 0 }}>
              🪪 {t('printClubCarnetsTitle')} <PageHelpLink pageId="clubCarnetsPrint" compact />
            </h1>
            {club && (
              <p style={{ margin: '8px 0 0', color: '#2563eb', fontSize: '14px' }}>
                {t('activeClub')}: <strong>{clubDisplayName(club)}</strong>
              </p>
            )}
          </div>
        </div>

        {!effectiveIglesiaId && (
          <div className="alert alert-warning">{t('homeSelectChurch')}</div>
        )}

        {effectiveIglesiaId && !clubId && (
          <div className="alert alert-warning">
            {t('clubCarnetsNoClub')}{' '}
            <button type="button" className="home-link-btn" onClick={goToClubs}>
              {t('clubs')}
            </button>
          </div>
        )}

        {effectiveIglesiaId && clubs.length > 1 && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px', maxWidth: '360px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{t('selectClub')}</span>
            <select
              value={clubId}
              onChange={e => selectClub(e.target.value)}
              className="form-input"
            >
              <option value="">{t('selectClub')}</option>
              {clubs.map(c => (
                <option key={c.id} value={c.id}>{clubDisplayName(c)}</option>
              ))}
            </select>
          </label>
        )}

        {loading && <p>{t('loadingCarnet')}</p>}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && clubId && readyCount === 0 && (
          <div className="alert alert-warning">{t('clubCarnetsNoMembers')}</div>
        )}

        {!loading && !error && readyCount > 0 && (
          <>
            <p className="text-muted" style={{ fontSize: '14px', marginBottom: '12px' }}>
              {t('clubCarnetsCount').replace('{count}', String(readyCount))}
              {' · '}
              {t('clubCarnetsLetterPages').replace('{count}', String(totalPrintPages))}
            </p>
            <button
              type="button"
              onClick={printAll}
              style={headerBtnStyle}
            >
              🖨 {t('printAllCarnets')}
            </button>
            <p className="text-muted" style={{ fontSize: '13px', marginTop: '10px' }}>
              {t('clubCarnetsLetterPrintHint')}
            </p>
            <p className="text-muted" style={{ fontSize: '13px' }}>
              {t('clubCarnetsPrintHint')}
            </p>
          </>
        )}

        {!activeClub && effectiveIglesiaId && (
          <p style={{ marginTop: '12px', fontSize: '13px' }}>
            <Link to="/dashboard/clubes">{t('clubs')}</Link>
          </p>
        )}
      </div>

      {!loading && !error && readyCount > 0 && club && (
        <div className="carnet-print-area carnet-print-area--batch-letter">
          <CarnetLetterBatch
            members={members}
            club={club}
            tokens={tokens}
            expirationLabel={expirationLabel}
            t={t}
          />
        </div>
      )}
    </div>
  );
}
