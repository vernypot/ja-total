import { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { estadoLabel } from '../../i18n/helpers';
import { clubDisplayName } from '../../utils/club';
import ListSearchInput from '../../components/ListSearchInput';
import { PageHelpLink } from '../../components/PageHelp';
import '../../styles/form.css';

const headerBtnStyle = {
  padding: '10px 15px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 'bold',
};

function MemberListItem({
  member,
  clubsData,
  canManage,
  assigningKey,
  toggleClubAssignment,
  toggleEstado,
  navigateToMiembro,
  t,
}) {
  const [clubsExpanded, setClubsExpanded] = useState(false);
  const nombreCompleto = [member.nombre, member.apellido1, member.apellido2].filter(Boolean).join(' ');
  const assignedCount = clubsData.filter(club => member.clubIds.includes(club.id)).length;
  const showClubToggle = clubsData.length > 0;

  return (
    <div style={{ padding: '15px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff', transition: 'all 0.2s' }} className="hover-shadow">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <strong>{nombreCompleto}</strong>
          <span className={`badge badge-${member.estado}`} style={{ marginLeft: '10px' }}>{estadoLabel(member.estado, t)}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => navigateToMiembro(member.id)} className="btn btn-sm btn-edit">
            📋 {t('details')}
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => toggleEstado(member)}
              className={`btn btn-sm ${member.estado === 'activo' ? 'btn-danger' : 'btn-success'}`}
            >
              {member.estado === 'activo' ? `❌ ${t('deactivate')}` : `✓ ${t('activate')}`}
            </button>
          )}
          {showClubToggle && (
            <button
              type="button"
              onClick={() => setClubsExpanded(prev => !prev)}
              aria-expanded={clubsExpanded}
              className="btn btn-sm"
              style={{
                backgroundColor: clubsExpanded ? '#e5e7eb' : '#f9fafb',
                color: '#374151',
                border: '1px solid #d1d5db',
              }}
            >
              {clubsExpanded ? '▲' : '▼'} {t('memberClubs')} ({assignedCount}/{clubsData.length})
            </button>
          )}
        </div>
      </div>

      {showClubToggle && clubsExpanded && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px',
            border: '1px solid #f3f4f6',
            borderRadius: '6px',
            backgroundColor: '#fafafa',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px' }}>
            {clubsData.map(club => {
              const isAssigned = member.clubIds.includes(club.id);
              const isAssigning = assigningKey === `${member.id}-${club.id}`;

              return (
                <label
                  key={club.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.875rem',
                    cursor: canManage && !isAssigning ? 'pointer' : 'default',
                    opacity: isAssigning ? 0.6 : 1,
                    padding: '4px 8px',
                    borderRadius: '6px',
                    backgroundColor: isAssigned ? '#eff6ff' : '#fff',
                    border: isAssigned ? '1px solid #93c5fd' : '1px solid #e5e7eb',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isAssigned}
                    disabled={!canManage || isAssigning}
                    onChange={e => toggleClubAssignment(member, club.id, e.target.checked)}
                  />
                  <span>{clubDisplayName(club)}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MiembrosView({
  data,
  searchQuery,
  setSearchQuery,
  clubsData,
  showInactive,
  setShowInactive,
  activeIglesiaData,
  iglesiaScopeReady = true,
  clubId,
  activeClub,
  canManage,
  toggleEstado,
  navigateToMiembro,
  navigateToNewMiembro,
  filterByClub,
  toggleClubAssignment,
  assigningKey,
  assignmentError,
  showBulkUpload,
  setShowBulkUpload,
  fileInputRef,
  selectedFile,
  handleFileSelect,
  handleDownloadTemplate,
  handleValidateFile,
  handleImportMembers,
  clearBulkUpload,
  validationResults,
  bulkMessage,
  bulkError,
  isValidating,
  isImporting,
}) {
  const { t } = useLanguage();
  const isSearching = searchQuery.trim().length > 0;
  const selectedClub = clubId ? clubsData.find(c => c.id === clubId) : null;
  const canImport = validationResults && validationResults.invalidCount === 0 && validationResults.validCount > 0;

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>👥 {t('members')} <PageHelpLink pageId="members" /></h1>
          {activeIglesiaData && (
            <p style={{ margin: '8px 0 0 0', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              {t('churchLabel')}: <strong>{activeIglesiaData.nombre}</strong>
            </p>
          )}
          {selectedClub && (
            <p style={{ margin: '4px 0 0 0', color: '#2563eb', fontSize: '14px' }}>
              {t('activeClub')}: <strong>{clubDisplayName(selectedClub)}</strong>
            </p>
          )}
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowBulkUpload(!showBulkUpload)}
              style={{ ...headerBtnStyle, backgroundColor: '#0891b2', color: 'white' }}
            >
              📤 {t('bulkUpload')}
            </button>
            <button
              onClick={navigateToNewMiembro}
              style={{ ...headerBtnStyle, backgroundColor: '#2563eb', color: 'white' }}
            >
              ➕ {t('newMember')}
            </button>
          </div>
        )}
      </div>

      {!iglesiaScopeReady && (
        <div className="alert alert-error">{t('noActiveIglesiaAssignment')}</div>
      )}

      {canManage && showBulkUpload && (
        <div className="card" style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#f0f9ff', border: '2px solid #0891b2' }}>
          <h3 style={{ marginTop: 0 }}>📋 {t('bulkUploadTitle')}</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginTop: 0 }}>{t('bulkUploadHint')}</p>
          {!clubId && (
            <p style={{ color: '#b45309', fontSize: '13px' }}>⚠️ {t('bulkSelectClubFirst')}</p>
          )}
          {clubsData.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '14px' }}>
                {t('clubs')} *
              </label>
              <select
                value={clubId || ''}
                onChange={e => filterByClub(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '14px', minWidth: '240px' }}
              >
                <option value="">{t('selectClub')}</option>
                {clubsData.map(c => (
                  <option key={c.id} value={c.id}>{clubDisplayName(c)}</option>
                ))}
              </select>
            </div>
          )}
          {selectedClub && (
            <p style={{ fontSize: '14px', marginTop: 0 }}>
              {t('bulkAssignedClub')}: <strong>{selectedClub.nombre}</strong>
            </p>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
            <button
              onClick={() => handleDownloadTemplate(t)}
              disabled={!clubId}
              style={{
                ...headerBtnStyle,
                backgroundColor: '#16a34a',
                color: 'white',
                opacity: !clubId ? 0.6 : 1,
                cursor: !clubId ? 'not-allowed' : 'pointer',
              }}
            >
              ⬇️ {t('downloadTemplate')}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '15px' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              style={{ fontSize: '14px' }}
            />
            <button
              onClick={() => handleValidateFile(t)}
              disabled={!selectedFile || !clubId || isValidating || clubsData.length === 0}
              style={{
                ...headerBtnStyle,
                backgroundColor: '#2563eb',
                color: 'white',
                opacity: !selectedFile || !clubId || isValidating || clubsData.length === 0 ? 0.6 : 1,
                cursor: !selectedFile || !clubId || isValidating || clubsData.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {isValidating ? `⏳ ${t('loading')}` : `🔍 ${t('validateFile')}`}
            </button>
            {selectedFile && (
              <button
                onClick={clearBulkUpload}
                style={{ ...headerBtnStyle, backgroundColor: 'var(--color-btn-neutral)', color: 'white' }}
              >
                ✕ {t('bulkClear')}
              </button>
            )}
          </div>

          {bulkError && <div className="alert alert-error">{bulkError}</div>}
          {bulkMessage && <div className="alert alert-success">{bulkMessage}</div>}

          {validationResults && (
            <div>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>
                  ✓ {t('bulkValidRows').replace('{count}', validationResults.validCount)}
                </span>
                {validationResults.invalidCount > 0 && (
                  <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                    ✕ {t('bulkInvalidRows').replace('{count}', validationResults.invalidCount)}
                  </span>
                )}
              </div>

              <div style={{ overflowX: 'auto', marginBottom: '15px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                      {[t('bulkRow'), t('name'), t('clubs'), t('bulkValidationStatus'), t('bulkErrors')].map(h => (
                        <th key={h} style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {validationResults.results.map(row => (
                      <tr key={row.rowNumber} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: row.valid ? '#f0fdf4' : '#fef2f2' }}>
                        <td style={{ padding: '10px' }}>{row.rowNumber}</td>
                        <td style={{ padding: '10px' }}>
                          {[row.member.nombre, row.member.apellido1, row.member.apellido2].filter(Boolean).join(' ')}
                          {row.member.contact && (
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                              {t('contactName')}: {row.member.contact.nombre}
                              {row.member.contact.telefono ? ` • ${row.member.contact.telefono}` : ''}
                              {row.member.contact.relacion ? ` (${row.member.contact.relacion})` : ''}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px' }}>{row.member.club_nombre}</td>
                        <td style={{ padding: '10px' }}>
                          <span className={`badge ${row.valid ? 'badge-activo' : 'badge-inactivo'}`}>
                            {row.valid ? t('bulkValid') : t('bulkInvalid')}
                          </span>
                        </td>
                        <td style={{ padding: '10px', color: '#dc2626' }}>
                          {row.errors.join('; ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {validationResults.invalidCount > 0 ? (
                <p style={{ color: '#dc2626', fontWeight: 'bold' }}>{t('bulkFixErrors')}</p>
              ) : (
                <button
                  onClick={() => handleImportMembers(t)}
                  disabled={!canImport || isImporting}
                  style={{
                    ...headerBtnStyle,
                    backgroundColor: '#16a34a',
                    color: 'white',
                    opacity: !canImport || isImporting ? 0.6 : 1,
                    cursor: !canImport || isImporting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isImporting ? `⏳ ${t('bulkImporting')}` : `✓ ${t('importMembers')} (${validationResults.validCount})`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
              {t('showInactive')}
            </label>
            {clubsData.length > 0 && (
              <select value={clubId || ''} onChange={e => filterByClub(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '14px' }}>
                <option value="">{t('allClubs')}</option>
                {clubsData.map(c => (
                  <option key={c.id} value={c.id}>{clubDisplayName(c)}</option>
                ))}
              </select>
            )}
          </div>
          <ListSearchInput value={searchQuery} onChange={setSearchQuery} />
          <p style={{ margin: 0, fontSize: '12px', color: '#888', width: '100%' }}>{t('filterByClubHint')}</p>
        </div>

        {assignmentError && <div className="alert alert-error" style={{ marginBottom: '15px' }}>{assignmentError}</div>}

        {data.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>
            {isSearching ? t('noSearchResults') : t('noMembers')}
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {data.map(m => (
              <MemberListItem
                key={m.id}
                member={m}
                clubsData={clubsData}
                canManage={canManage}
                assigningKey={assigningKey}
                toggleClubAssignment={toggleClubAssignment}
                toggleEstado={toggleEstado}
                navigateToMiembro={navigateToMiembro}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
