import { useState } from 'react';

const DRAG_MEMBER = 'application/x-bloques-miembro';

function MemberChip({ member, memberDisplayName, onDragStart, draggable, onRemove, t }) {
  const name = memberDisplayName(member);
  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? (e) => {
        e.dataTransfer.setData(DRAG_MEMBER, member.id);
        e.dataTransfer.effectAllowed = 'move';
      } : undefined}
      className={`bloques-chip${draggable ? ' bloques-chip--draggable' : ''}`}
      title={name}
    >
      <span className="bloques-chip__label">{name}</span>
      {onRemove && (
        <button
          type="button"
          className="bloques-chip__remove"
          onClick={() => onRemove(member.id)}
          aria-label={t('remove')}
        >
          ×
        </button>
      )}
    </div>
  );
}

function DropZone({ children, onDrop, emptyLabel, t }) {
  const [over, setOver] = useState(false);

  return (
    <div
      className={`bloques-dropzone${over ? ' bloques-dropzone--over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const memberId = e.dataTransfer.getData(DRAG_MEMBER);
        if (memberId) onDrop(memberId);
      }}
    >
      {children}
      {!children && (
        <span className="bloques-dropzone__hint">{emptyLabel || t('completedBlocksDropHint')}</span>
      )}
    </div>
  );
}

function ActionTypeSelect({ value, onChange, t, actionTypes }) {
  const labels = {
    requisito: t('completedBlocksActionRequisito'),
    seccion: t('completedBlocksActionSeccion'),
    especialidad: t('completedBlocksActionEspecialidad'),
    investidura: t('completedBlocksActionInvestidura'),
    asignar_clase: t('completedBlocksActionAsignarClase'),
  };

  return (
    <select
      className="form-input bloques-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {actionTypes.map(type => (
        <option key={type} value={type}>{labels[type]}</option>
      ))}
    </select>
  );
}

function BlockCard({
  block,
  index,
  canManage,
  scopedClases,
  scopedEspecialidades,
  getRequisitosForBlock,
  getSeccionesForBlock,
  membersById,
  memberDisplayName,
  updateBlock,
  removeBlock,
  addMemberToBlock,
  removeMemberFromBlock,
  requestApplyBlock,
  applyingBlockId,
  validatingApplyBlockId,
  sectionTitle,
  requisitoLabel,
  actionTypes,
  t,
  canRemove,
}) {
  const requisitos = getRequisitosForBlock(block);
  const secciones = getSeccionesForBlock(block);
  const isApplying = applyingBlockId === block.id;
  const isValidating = validatingApplyBlockId === block.id;

  return (
    <div className="bloques-block-card">
      <div className="bloques-block-card__header">
        <h3 className="bloques-block-card__title">
          {t('completedBlocksBlockLabel')} {index + 1}
        </h3>
        {canRemove && canManage && (
          <button
            type="button"
            className="btn btn-sm"
            style={{ color: '#b91c1c', border: '1px solid #fecaca', background: '#fff' }}
            onClick={() => removeBlock(block.id)}
          >
            {t('remove')}
          </button>
        )}
      </div>

      <label className="bloques-field">
        <span className="bloques-field__label">{t('completedBlocksActionType')}</span>
        <ActionTypeSelect
          value={block.actionType}
          actionTypes={actionTypes}
          onChange={(actionType) => updateBlock(block.id, {
            actionType,
            requisitoId: '',
            seccionId: '',
            especialidadId: '',
          })}
          t={t}
        />
      </label>

      {block.actionType === 'especialidad' ? (
        <label className="bloques-field">
          <span className="bloques-field__label">{t('specialties')}</span>
          <select
            className="form-input bloques-select"
            value={block.especialidadId}
            onChange={(e) => updateBlock(block.id, { especialidadId: e.target.value })}
          >
            <option value="">{t('completedBlocksSelectEspecialidad')}</option>
            {scopedEspecialidades.map(esp => (
              <option key={esp.id} value={esp.id}>{esp.nombre}</option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <label className="bloques-field">
            <span className="bloques-field__label">{t('progressiveClasses')}</span>
            <select
              className="form-input bloques-select"
              value={block.claseId}
              onChange={(e) => updateBlock(block.id, {
                claseId: e.target.value,
                requisitoId: '',
                seccionId: '',
              })}
            >
              <option value="">{t('completedBlocksSelectClase')}</option>
              {scopedClases.map(clase => (
                <option key={clase.id} value={clase.id}>{clase.nombre}</option>
              ))}
            </select>
          </label>

          {block.actionType === 'requisito' && block.claseId && (
            <label className="bloques-field">
              <span className="bloques-field__label">{t('completedBlocksRequisito')}</span>
              <select
                className="form-input bloques-select"
                value={block.requisitoId}
                onChange={(e) => updateBlock(block.id, { requisitoId: e.target.value })}
              >
                <option value="">{t('completedBlocksSelectRequisito')}</option>
                {requisitos.map(req => (
                  <option key={req.id} value={req.id}>{requisitoLabel(req)}</option>
                ))}
              </select>
            </label>
          )}

          {block.actionType === 'seccion' && block.claseId && (
            <label className="bloques-field">
              <span className="bloques-field__label">{t('completedBlocksSeccion')}</span>
              <select
                className="form-input bloques-select"
                value={block.seccionId}
                onChange={(e) => updateBlock(block.id, { seccionId: e.target.value })}
              >
                <option value="">{t('completedBlocksSelectSeccion')}</option>
                {secciones.map(seccion => (
                  <option key={seccion.id} value={seccion.id}>{sectionTitle(seccion)}</option>
                ))}
              </select>
            </label>
          )}
        </>
      )}

      <div className="bloques-field">
        <span className="bloques-field__label">
          {t('completedBlocksMembersInBlock')} ({block.memberIds.length})
        </span>
        <DropZone
          onDrop={(memberId) => addMemberToBlock(block.id, memberId)}
          emptyLabel={t('completedBlocksDropHint')}
          t={t}
        >
          {block.memberIds.length > 0 && (
            <div className="bloques-chip-list">
              {block.memberIds.map(memberId => {
                const member = membersById[memberId];
                if (!member) return null;
                return (
                  <MemberChip
                    key={memberId}
                    member={member}
                    memberDisplayName={memberDisplayName}
                    draggable={false}
                    onRemove={canManage ? (id) => removeMemberFromBlock(block.id, id) : null}
                    t={t}
                  />
                );
              })}
            </div>
          )}
        </DropZone>
      </div>

      {canManage && (
        <button
          type="button"
          className="btn btn-primary bloques-apply-btn"
          disabled={!block.memberIds.length || isApplying || isValidating}
          onClick={() => requestApplyBlock(block)}
        >
          {isValidating ? t('loading') : isApplying ? t('loading') : t('completedBlocksApply')}
        </button>
      )}
    </div>
  );
}

export default function BloquesCompletadosBoard({
  canManage,
  poolMembers,
  blocks,
  addBlock,
  removeBlock,
  updateBlock,
  addMemberToBlock,
  removeMemberFromBlock,
  requestApplyBlock,
  applyingBlockId,
  validatingApplyBlockId,
  scopedClases,
  scopedEspecialidades,
  getRequisitosForBlock,
  getSeccionesForBlock,
  membersById,
  memberDisplayName,
  sectionTitle,
  requisitoLabel,
  actionTypes,
  t,
}) {
  return (
    <div className="bloques-board">
      <section className="bloques-pool">
        <div className="bloques-pool__header">
          <h2 className="bloques-section-title">{t('completedBlocksMemberPool')}</h2>
          <p className="bloques-section-hint">{t('completedBlocksPoolHint')}</p>
        </div>
        <div className="bloques-chip-list bloques-pool__list">
          {poolMembers.length === 0 ? (
            <p className="bloques-empty">{t('completedBlocksNoPoolMembers')}</p>
          ) : (
            poolMembers.map(member => (
              <MemberChip
                key={member.id}
                member={member}
                memberDisplayName={memberDisplayName}
                draggable={canManage}
                t={t}
              />
            ))
          )}
        </div>
      </section>

      <section className="bloques-blocks">
        <div className="bloques-blocks__header">
          <div>
            <h2 className="bloques-section-title">{t('completedBlocksBlocksTitle')}</h2>
            <p className="bloques-section-hint">{t('completedBlocksBlocksHint')}</p>
          </div>
          {canManage && (
            <button type="button" className="btn btn-sm btn-success" onClick={addBlock}>
              + {t('completedBlocksAddBlock')}
            </button>
          )}
        </div>

        <div className="bloques-blocks__grid">
          {blocks.map((block, index) => (
            <BlockCard
              key={block.id}
              block={block}
              index={index}
              canManage={canManage}
              scopedClases={scopedClases}
              scopedEspecialidades={scopedEspecialidades}
              getRequisitosForBlock={getRequisitosForBlock}
              getSeccionesForBlock={getSeccionesForBlock}
              membersById={membersById}
              memberDisplayName={memberDisplayName}
              updateBlock={updateBlock}
              removeBlock={removeBlock}
              addMemberToBlock={addMemberToBlock}
              removeMemberFromBlock={removeMemberFromBlock}
              requestApplyBlock={requestApplyBlock}
              applyingBlockId={applyingBlockId}
              validatingApplyBlockId={validatingApplyBlockId}
              sectionTitle={sectionTitle}
              requisitoLabel={requisitoLabel}
              actionTypes={actionTypes}
              t={t}
              canRemove={blocks.length > 1}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
