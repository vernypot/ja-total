import { useLanguage } from '../../hooks/useLanguage';
import ListSearchInput from '../../components/ListSearchInput';
import BloquesCompletadosBoard from '../../components/BloquesCompletadosBoard';
import BloquesCompletadosApplyModal from '../../components/BloquesCompletadosApplyModal';
import { PageHelpLink } from '../../components/PageHelp';
import '../../styles/form.css';
import '../../styles/bloques-completados.css';

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
  getRequisitosForBlock,
  getSeccionesForBlock,
  membersById,
  memberDisplayName,
  sectionTitle,
  requisitoLabel,
  defaultValidatorName,
  actionTypes,
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

      <BloquesCompletadosApplyModal
        pending={pendingApply}
        applying={Boolean(applyingBlockId)}
        defaultValidatorName={defaultValidatorName}
        onConfirm={confirmApplyBlock}
        onCancel={cancelApplyBlock}
        t={t}
      />
    </div>
  );
}
