import { useState } from 'react';
import {
  groupRequisitosBySeccion,
  nextRequisitoNumero,
} from '../mvc/models/clases.model';
import ClaseRequisitoTagsPool, { ClaseRequisitoTagChip, DRAG_MIME } from './ClaseRequisitoTagsPool';
import ConfirmDialog from './ConfirmDialog';
import '../styles/clase-requisito-tags.css';

const UNGROUPED_SECTION_KEY = '__ungrouped__';

const btnSmall = {
  padding: '2px 8px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px',
  flexShrink: 0,
};

function SectionCollapseButton({ collapsed, onToggle, t }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={collapsed ? t('expand') : t('collapse')}
      aria-expanded={!collapsed}
      aria-label={collapsed ? t('expand') : t('collapse')}
      style={{ ...btnSmall, backgroundColor: '#eef2ff', color: '#4338ca', minWidth: '28px' }}
    >
      {collapsed ? '▶' : '▼'}
    </button>
  );
}

function sectionTitle(seccion) {
  const roman = seccion.numero_romano ? `${seccion.numero_romano}. ` : '';
  return `${roman}${seccion.nombre}`;
}

function RequisitoTagsRow({
  req,
  t,
  rowTagDraft = '',
  onRowTagDraftChange,
  onAddTag,
  onRemoveTag,
  onDropTag,
  canEdit = true,
}) {
  const [dropActive, setDropActive] = useState(false);

  function handleDragOver(e) {
    if (!canEdit) return;
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDropActive(true);
  }

  function handleDrop(e) {
    if (!canEdit) return;
    e.preventDefault();
    setDropActive(false);
    const tagId = e.dataTransfer.getData(DRAG_MIME);
    if (tagId) onDropTag?.(req.id, tagId);
  }

  if (!canEdit && !(req.tags?.length)) return null;

  return (
    <div
      className={`clase-requisito-row-tags clase-requisito-drop-target${dropActive ? ' is-drop-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setDropActive(false)}
      onDrop={handleDrop}
    >
      {(req.tags || []).map(tag => (
        <ClaseRequisitoTagChip
          key={tag.id}
          tag={tag}
          className="clase-requisito-tag-chip--on-row"
          onRemove={canEdit ? () => onRemoveTag?.(req.id, tag.id) : undefined}
          removeLabel={t('classReqTagRemoveFromReq')}
        />
      ))}
      {canEdit && (
        <span className="clase-requisito-row-tags__add">
          <input
            type="text"
            value={rowTagDraft}
            onChange={e => onRowTagDraftChange?.(req.id, e.target.value)}
            placeholder={t('classReqTagAddPlaceholder')}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddTag?.(req.id, rowTagDraft);
              }
            }}
          />
          <button type="button" onClick={() => onAddTag?.(req.id, rowTagDraft)}>
            +
          </button>
        </span>
      )}
    </div>
  );
}

function RequisitoRow({
  req,
  secciones,
  t,
  editingRequisitoId,
  requisitoDraft,
  setRequisitoDraft,
  startEditRequisito,
  cancelEditRequisito,
  saveRequisito,
  removeRequisito,
  rowTagDraft,
  onRowTagDraftChange,
  onAddTag,
  onRemoveTag,
  onDropTag,
}) {
  const isEditing = editingRequisitoId === req.id;

  if (isEditing) {
    return (
      <li style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: '8px', marginBottom: '8px' }}>
          <label style={{ fontSize: '11px' }}>
            {t('classReqNumber')}
            <input
              type="number"
              min="1"
              value={requisitoDraft.numero}
              onChange={e => setRequisitoDraft(d => ({ ...d, numero: e.target.value }))}
              className="form-input"
              style={{ margin: '4px 0 0', fontSize: '12px' }}
            />
          </label>
          <label style={{ fontSize: '11px' }}>
            {t('classReqSection')}
            <select
              value={requisitoDraft.seccion_id}
              onChange={e => setRequisitoDraft(d => ({ ...d, seccion_id: e.target.value }))}
              className="form-input"
              style={{ margin: '4px 0 0', fontSize: '12px' }}
            >
              <option value="">{t('uncategorized')}</option>
              {secciones.map(s => (
                <option key={s.id} value={s.id}>{sectionTitle(s)}</option>
              ))}
            </select>
          </label>
        </div>
        <label style={{ display: 'block', fontSize: '11px', marginBottom: '6px' }}>
          {t('requirementDescription')}
          <textarea
            value={requisitoDraft.descripcion}
            onChange={e => setRequisitoDraft(d => ({ ...d, descripcion: e.target.value }))}
            className="form-input"
            rows={2}
            style={{ margin: '4px 0 0', width: '100%', fontSize: '12px' }}
          />
        </label>
        <details style={{ marginBottom: '8px' }}>
          <summary style={{ fontSize: '11px', color: 'var(--color-text-muted)', cursor: 'pointer', userSelect: 'none' }}>
            {t('requirementOptionalText')}
          </summary>
          <textarea
            value={requisitoDraft.texto_opcional}
            onChange={e => setRequisitoDraft(d => ({ ...d, texto_opcional: e.target.value }))}
            className="form-input"
            rows={2}
            placeholder={t('requirementOptionalTextPlaceholder')}
            style={{ margin: '6px 0 0', width: '100%', fontSize: '12px' }}
          />
        </details>
        <label style={{ display: 'block', fontSize: '11px', marginBottom: '8px' }}>
          {t('classReqExpectedSessions')}
          <input
            type="number"
            min={0}
            max={10}
            value={requisitoDraft.sesiones_esperadas}
            onChange={e => setRequisitoDraft(d => ({ ...d, sesiones_esperadas: e.target.value }))}
            className="form-input"
            style={{ margin: '4px 0 0', width: '72px', fontSize: '12px' }}
          />
        </label>
        <RequisitoTagsRow
          req={req}
          t={t}
          rowTagDraft={rowTagDraft}
          onRowTagDraftChange={onRowTagDraftChange}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onDropTag={onDropTag}
        />
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="button" onClick={saveRequisito} style={{ ...btnSmall, backgroundColor: '#16a34a', color: 'white' }}>
            ✓ {t('save')}
          </button>
          <button type="button" onClick={cancelEditRequisito} style={{ ...btnSmall, backgroundColor: 'var(--color-btn-neutral)', color: 'white' }}>
            ✕ {t('cancel')}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li
      style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        {req.numero != null && <strong>{req.numero}. </strong>}
        {req.descripcion}
        {req.texto_opcional?.trim() && (
          <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
            {req.texto_opcional}
          </span>
        )}
        <span style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          {req.sesiones_esperadas ?? 3} {t('planSessionsShort')} ({t('planSessionsExpected')})
        </span>
        <RequisitoTagsRow
          req={req}
          t={t}
          rowTagDraft={rowTagDraft}
          onRowTagDraftChange={onRowTagDraftChange}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onDropTag={onDropTag}
        />
      </span>
      <span style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => startEditRequisito(req)}
          style={{ ...btnSmall, backgroundColor: '#2563eb', color: 'white' }}
        >
          ✏️
        </button>
        <button
          type="button"
          onClick={() => removeRequisito(req.id)}
          style={{ ...btnSmall, backgroundColor: '#dc2626', color: 'white' }}
        >
          ✕
        </button>
      </span>
    </li>
  );
}

export default function ClaseRequisitosEditor({
  claseId,
  requisitos = [],
  secciones = [],
  tags = [],
  tagsMissingSchema = false,
  t,
  newRequisitoForm,
  setNewRequisitoForm,
  newSeccionForm,
  setNewSeccionForm,
  editingRequisitoId,
  requisitoDraft,
  setRequisitoDraft,
  editingSeccionId,
  seccionDraft,
  setSeccionDraft,
  addRequisito,
  addSeccion,
  startEditRequisito,
  cancelEditRequisito,
  saveRequisito,
  removeRequisito,
  startEditSeccion,
  cancelEditSeccion,
  saveSeccion,
  removeSeccion,
  newPoolTagName = '',
  setNewPoolTagName,
  draggingTagId,
  setDraggingTagId,
  rowTagDrafts = {},
  setRowTagDrafts,
  createPoolTag,
  addTagToRequisito,
  assignTagFromPool,
  removeTagFromRequisito,
  deleteTagFromPool,
}) {
  const [collapsedSections, setCollapsedSections] = useState({});
  const [tagToDelete, setTagToDelete] = useState(null);
  const [deletingTag, setDeletingTag] = useState(false);

  const { grouped, ungrouped } = groupRequisitosBySeccion(requisitos, secciones, {
    includeEmptySections: true,
  });

  function isSectionCollapsed(sectionId) {
    return collapsedSections[sectionId] === true;
  }

  function toggleSectionCollapse(sectionId) {
    setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }

  const suggestNumero = newRequisitoForm.seccion_id
    ? nextRequisitoNumero(requisitos, newRequisitoForm.seccion_id)
    : '';

  const requisitoRowTagProps = {
    rowTagDrafts,
    onRowTagDraftChange: (requisitoId, value) => setRowTagDrafts?.(prev => ({ ...prev, [requisitoId]: value })),
    onAddTag: (requisitoId, name) => addTagToRequisito?.(claseId, requisitoId, name),
    onRemoveTag: (requisitoId, tagId) => removeTagFromRequisito?.(claseId, requisitoId, tagId),
    onDropTag: (requisitoId, tagId) => assignTagFromPool?.(claseId, requisitoId, tagId),
  };

  async function handleConfirmDeleteTag() {
    if (!tagToDelete || deletingTag) return;
    setDeletingTag(true);
    const ok = await deleteTagFromPool?.(claseId, tagToDelete.id);
    setDeletingTag(false);
    if (ok) setTagToDelete(null);
  }

  function renderRequisitoRow(req) {
    return (
      <RequisitoRow
        key={req.id}
        req={req}
        secciones={secciones}
        t={t}
        editingRequisitoId={editingRequisitoId}
        requisitoDraft={requisitoDraft}
        setRequisitoDraft={setRequisitoDraft}
        startEditRequisito={startEditRequisito}
        cancelEditRequisito={cancelEditRequisito}
        saveRequisito={saveRequisito}
        removeRequisito={removeRequisito}
        rowTagDraft={rowTagDrafts[req.id] || ''}
        onRowTagDraftChange={requisitoRowTagProps.onRowTagDraftChange}
        onAddTag={requisitoRowTagProps.onAddTag}
        onRemoveTag={requisitoRowTagProps.onRemoveTag}
        onDropTag={requisitoRowTagProps.onDropTag}
      />
    );
  }

  return (
    <>
      <div className="clase-requisitos-editor">
        <div className="clase-requisitos-editor__main">
      {grouped.length === 0 && ungrouped.length === 0 && (
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>{t('noRequirements')}</p>
      )}

      {grouped.map(({ seccion, requisitos: sectionReqs }) => {
        const isEditingSection = editingSeccionId === seccion.id;
        const collapsed = isSectionCollapsed(seccion.id) && !isEditingSection;
        return (
          <div key={seccion.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px' }}>
            {isEditingSection ? (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 80px 1fr 72px', gap: '8px', marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px' }}>
                    {t('classReqPart')}
                    <select
                      value={seccionDraft.parte}
                      onChange={e => setSeccionDraft(d => ({ ...d, parte: e.target.value }))}
                      className="form-input"
                      style={{ margin: '4px 0 0', fontSize: '12px' }}
                    >
                      <option value="basico">{t('classReqPartBasicShort')}</option>
                      <option value="avanzado">{t('classReqPartAdvancedShort')}</option>
                    </select>
                  </label>
                  <label style={{ fontSize: '11px' }}>
                    {t('classReqSectionRoman')}
                    <input
                      value={seccionDraft.numero_romano}
                      onChange={e => setSeccionDraft(d => ({ ...d, numero_romano: e.target.value }))}
                      className="form-input"
                      style={{ margin: '4px 0 0', fontSize: '12px' }}
                      placeholder="I"
                    />
                  </label>
                  <label style={{ fontSize: '11px' }}>
                    {t('sectionName')}
                    <input
                      value={seccionDraft.nombre}
                      onChange={e => setSeccionDraft(d => ({ ...d, nombre: e.target.value }))}
                      className="form-input"
                      style={{ margin: '4px 0 0', fontSize: '12px' }}
                    />
                  </label>
                  <label style={{ fontSize: '11px' }}>
                    {t('classReqOrder')}
                    <input
                      type="number"
                      min="1"
                      value={seccionDraft.orden}
                      onChange={e => setSeccionDraft(d => ({ ...d, orden: e.target.value }))}
                      className="form-input"
                      style={{ margin: '4px 0 0', fontSize: '12px' }}
                    />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" onClick={saveSeccion} style={{ ...btnSmall, padding: '4px 10px', backgroundColor: '#16a34a', color: 'white' }}>
                    ✓ {t('save')}
                  </button>
                  <button type="button" onClick={cancelEditSeccion} style={{ ...btnSmall, padding: '4px 10px', backgroundColor: 'var(--color-btn-neutral)', color: 'white' }}>
                    ✕ {t('cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: collapsed ? 0 : '6px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', minWidth: 0 }}>
                  <SectionCollapseButton
                    collapsed={collapsed}
                    onToggle={() => toggleSectionCollapse(seccion.id)}
                    t={t}
                  />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#4338ca', textTransform: 'uppercase' }}>
                      {seccion.parte === 'avanzado' ? t('classReqPartAdvanced') : t('classReqPartBasic')}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>
                      {sectionTitle(seccion)}
                      <span style={{ marginLeft: '8px', fontSize: '11px', color: '#9ca3af' }}>
                        ({t('classReqOrder')}: {seccion.orden ?? '—'} · {sectionReqs.length})
                      </span>
                    </div>
                  </div>
                </div>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <button type="button" onClick={() => startEditSeccion(seccion)} style={{ ...btnSmall, backgroundColor: '#2563eb', color: 'white' }}>
                    ✏️
                  </button>
                  <button type="button" onClick={() => removeSeccion(seccion.id)} style={{ ...btnSmall, backgroundColor: '#dc2626', color: 'white' }}>
                    ✕
                  </button>
                </span>
              </div>
            )}

            {!collapsed && (
              sectionReqs.length === 0 ? (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9ca3af' }}>{t('noRequirements')}</p>
              ) : (
                <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#4b5563' }}>
                  {sectionReqs.map(req => renderRequisitoRow(req))}
                </ol>
              )
            )}
          </div>
        );
      })}

      {ungrouped.length > 0 && (() => {
        const collapsed = isSectionCollapsed(UNGROUPED_SECTION_KEY);
        return (
        <div style={{ border: '1px dashed #d1d5db', borderRadius: '8px', padding: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: collapsed ? 0 : '6px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', minWidth: 0 }}>
              <SectionCollapseButton
                collapsed={collapsed}
                onToggle={() => toggleSectionCollapse(UNGROUPED_SECTION_KEY)}
                t={t}
              />
              <div style={{ fontWeight: 600, fontSize: '13px' }}>
                {t('uncategorized')}
                <span style={{ marginLeft: '8px', fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>
                  ({ungrouped.length})
                </span>
              </div>
            </div>
          </div>
          {!collapsed && (
          <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
            {ungrouped.map(req => renderRequisitoRow(req))}
          </ol>
          )}
        </div>
        );
      })()}

      <div style={{ padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
        <strong style={{ fontSize: '12px' }}>➕ {t('addRequirement')}</strong>
        <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: '8px', marginTop: '8px' }}>
          <label style={{ fontSize: '11px' }}>
            {t('classReqNumber')}
            <input
              type="number"
              min="1"
              value={newRequisitoForm.numero}
              onChange={e => setNewRequisitoForm(f => ({ ...f, numero: e.target.value }))}
              placeholder={String(suggestNumero || '')}
              className="form-input"
              style={{ margin: '4px 0 0', fontSize: '12px' }}
            />
          </label>
          <label style={{ fontSize: '11px' }}>
            {t('classReqSection')}
            <select
              value={newRequisitoForm.seccion_id}
              onChange={e => {
                const seccionId = e.target.value;
                setNewRequisitoForm(f => ({
                  ...f,
                  seccion_id: seccionId,
                  numero: seccionId ? String(nextRequisitoNumero(requisitos, seccionId)) : f.numero,
                }));
              }}
              className="form-input"
              style={{ margin: '4px 0 0', fontSize: '12px' }}
            >
              <option value="">{t('uncategorized')}</option>
              {secciones.map(s => (
                <option key={s.id} value={s.id}>{sectionTitle(s)}</option>
              ))}
            </select>
          </label>
        </div>
        <input
          value={newRequisitoForm.descripcion}
          onChange={e => setNewRequisitoForm(f => ({ ...f, descripcion: e.target.value }))}
          placeholder={t('requirementDescription')}
          className="form-input"
          style={{ margin: '8px 0 0', width: '100%', fontSize: '12px' }}
        />
        <details style={{ marginTop: '8px' }}>
          <summary style={{ fontSize: '11px', color: 'var(--color-text-muted)', cursor: 'pointer', userSelect: 'none' }}>
            {t('requirementOptionalText')}
          </summary>
          <input
            value={newRequisitoForm.texto_opcional}
            onChange={e => setNewRequisitoForm(f => ({ ...f, texto_opcional: e.target.value }))}
            placeholder={t('requirementOptionalTextPlaceholder')}
            className="form-input"
            style={{ margin: '6px 0 0', width: '100%', fontSize: '12px' }}
          />
        </details>
        <label style={{ display: 'block', fontSize: '11px', marginTop: '8px' }}>
          {t('classReqExpectedSessions')}
          <input
            type="number"
            min={0}
            max={10}
            value={newRequisitoForm.sesiones_esperadas}
            onChange={e => setNewRequisitoForm(f => ({ ...f, sesiones_esperadas: e.target.value }))}
            className="form-input"
            style={{ margin: '4px 0 0', width: '72px', fontSize: '12px' }}
          />
        </label>
        <button
          type="button"
          onClick={addRequisito}
          style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
        >
          ➕ {t('addRequirement')}
        </button>
      </div>

      <div style={{ padding: '10px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
        <strong style={{ fontSize: '12px' }}>➕ {t('addSection')}</strong>
        <div style={{ display: 'grid', gridTemplateColumns: '100px 80px 1fr 72px', gap: '8px', marginTop: '8px' }}>
          <label style={{ fontSize: '11px' }}>
            {t('classReqPart')}
            <select
              value={newSeccionForm.parte}
              onChange={e => setNewSeccionForm(f => ({ ...f, parte: e.target.value }))}
              className="form-input"
              style={{ margin: '4px 0 0', fontSize: '12px' }}
            >
              <option value="basico">{t('classReqPartBasicShort')}</option>
              <option value="avanzado">{t('classReqPartAdvancedShort')}</option>
            </select>
          </label>
          <label style={{ fontSize: '11px' }}>
            {t('classReqSectionRoman')}
            <input
              value={newSeccionForm.numero_romano}
              onChange={e => setNewSeccionForm(f => ({ ...f, numero_romano: e.target.value }))}
              className="form-input"
              style={{ margin: '4px 0 0', fontSize: '12px' }}
              placeholder="VIII"
            />
          </label>
          <label style={{ fontSize: '11px' }}>
            {t('sectionName')}
            <input
              value={newSeccionForm.nombre}
              onChange={e => setNewSeccionForm(f => ({ ...f, nombre: e.target.value }))}
              className="form-input"
              style={{ margin: '4px 0 0', fontSize: '12px' }}
            />
          </label>
          <label style={{ fontSize: '11px' }}>
            {t('classReqOrder')}
            <input
              type="number"
              min="1"
              value={newSeccionForm.orden}
              onChange={e => setNewSeccionForm(f => ({ ...f, orden: e.target.value }))}
              className="form-input"
              style={{ margin: '4px 0 0', fontSize: '12px' }}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={addSeccion}
          style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
        >
          ➕ {t('addSection')}
        </button>
      </div>
        </div>

        <aside className="clase-requisitos-editor__tags-sidebar" aria-label={t('classReqTagPoolTitle')}>
          <ClaseRequisitoTagsPool
            tags={tags}
            t={t}
            variant="sidebar"
            newTagName={newPoolTagName}
            onNewTagNameChange={setNewPoolTagName}
            onCreateTag={() => createPoolTag?.(claseId)}
            onDeleteTag={tag => setTagToDelete(tag)}
            draggingTagId={draggingTagId}
            onDragStart={tag => setDraggingTagId?.(tag.id)}
            onDragEnd={() => setDraggingTagId?.(null)}
            missingSchema={tagsMissingSchema}
          />
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(tagToDelete)}
        title={t('classReqTagDeleteConfirmTitle')}
        message={t('classReqTagDeleteConfirmMessage')}
        highlight={tagToDelete?.nombre}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        confirming={deletingTag}
        confirmingLabel={t('saving')}
        onConfirm={handleConfirmDeleteTag}
        onCancel={() => !deletingTag && setTagToDelete(null)}
      />
    </>
  );
}
