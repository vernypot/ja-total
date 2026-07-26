import { useLanguage } from '../../hooks/useLanguage';
import ListSearchInput from '../../components/ListSearchInput';
import ListPagination from '../../components/ListPagination';
import BloquesCompletadosBoard from '../../components/BloquesCompletadosBoard';
import BloquesCompletadosApplyModal from '../../components/BloquesCompletadosApplyModal';
import CarnetLetterBatch from '../../components/CarnetLetterBatch';
import { PageHelpLink } from '../../components/PageHelp';
import '../../styles/form.css';
import '../../styles/bloques-completados.css';
import '../../styles/carnet.css';

export default function BloquesCompletadosView({
  canManage,
  loading,
  error,
  searchQuery,
  setSearchQuery,
  poolMembers,
  blocks,
  addBlock,
  removeBlock,
  updateBlock,
  addMemberToBlock,
  removeMemberFromBlock,
  requestApplyBlock,
  cancelApplyBlock,
  confirmApplyBlock,
  pendingApply,
  applyingBlockId,
  validatingApplyBlockId,
  applyMessage,
  applyError,
  scopedClases,
  scopedEspecialidades,
  assignableEspecialidades = [],
  getRequisitosForBlock,
  getSeccionesForBlock,
  membersById,
  memberDisplayName,
  sectionTitle,
  requisitoLabel,
  defaultValidatorName,
  actionTypes,
  listPagination,
  bulkCarnetMembers = [],
  bulkCarnetTokens = {},
  bulkCarnetClub = null,
  bulkCarnetExpirationLabel = '',
  bulkCarnetLoading = false,
}) {
  const { t } = useLanguage();

  if (!canManage) {
    return (
      <div className="form-container">
        <p>{t('accessDenied')}</p>
      </div>
    );
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{t('completedBlocks')} <PageHelpLink pageId="bulkActions" /></h1>
      </div>

      <p className="bloques-intro">{t('completedBlocksIntro')}</p>

      <div style={{ marginBottom: '16px', maxWidth: '400px' }}>
        <ListSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <ListPagination {...listPagination} />

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {applyError && (
        <div className="alert alert-error" style={{ marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
          {applyError}
        </div>
      )}

      {applyMessage && (
        <div className="alert alert-success" style={{ marginBottom: '12px' }}>
          {applyMessage}
        </div>
      )}

      {loading ? (
        <p>{t('loading')}</p>
      ) : (
        <BloquesCompletadosBoard
          canManage={canManage}
          poolMembers={poolMembers}
          blocks={blocks}
          addBlock={addBlock}
          removeBlock={removeBlock}
          updateBlock={updateBlock}
          addMemberToBlock={addMemberToBlock}
          removeMemberFromBlock={removeMemberFromBlock}
          requestApplyBlock={requestApplyBlock}
          applyingBlockId={applyingBlockId}
          validatingApplyBlockId={validatingApplyBlockId}
          scopedClases={scopedClases}
          scopedEspecialidades={scopedEspecialidades}
          assignableEspecialidades={assignableEspecialidades}
          getRequisitosForBlock={getRequisitosForBlock}
          getSeccionesForBlock={getSeccionesForBlock}
          membersById={membersById}
          memberDisplayName={memberDisplayName}
          sectionTitle={sectionTitle}
          requisitoLabel={requisitoLabel}
          actionTypes={actionTypes}
          t={t}
        />
      )}

      {listPagination?.totalPages > 1 && <ListPagination {...listPagination} />}

      <BloquesCompletadosApplyModal
        pending={pendingApply}
        applying={Boolean(applyingBlockId) || bulkCarnetLoading}
        defaultValidatorName={defaultValidatorName}
        onConfirm={confirmApplyBlock}
        onCancel={cancelApplyBlock}
        t={t}
      />

      {bulkCarnetMembers.length > 0 && bulkCarnetClub && (
        <div className="carnet-print-area carnet-print-area--batch-letter">
          <CarnetLetterBatch
            members={bulkCarnetMembers}
            club={bulkCarnetClub}
            tokens={bulkCarnetTokens}
            expirationLabel={bulkCarnetExpirationLabel}
            t={t}
          />
        </div>
      )}
    </div>
  );
}
