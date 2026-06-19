import { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { estadoLabel } from '../../i18n/helpers';
import { clubDisplayName } from '../../utils/club';
import * as ClasesModel from '../models/clases.model';
import ListSearchInput from '../../components/ListSearchInput';
import ClaseRequisitosList from '../../components/ClaseRequisitosList';
import ClaseRequisitosEditor from '../../components/ClaseRequisitosEditor';
import { PageHelpLink } from '../../components/PageHelp';
import '../../styles/form.css';

function RequisitosSection({
  expanded,
  requisitos,
  secciones,
  canManage,
  t,
  claseId,
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
}) {
  if (!expanded) return null;

  return (
    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
      <strong style={{ fontSize: '13px' }}>{t('requirements')}</strong>
      {canManage ? (
        <ClaseRequisitosEditor
          requisitos={requisitos}
          secciones={secciones}
          t={t}
          newRequisitoForm={newRequisitoForm}
          setNewRequisitoForm={setNewRequisitoForm}
          newSeccionForm={newSeccionForm}
          setNewSeccionForm={setNewSeccionForm}
          editingRequisitoId={editingRequisitoId}
          requisitoDraft={requisitoDraft}
          setRequisitoDraft={setRequisitoDraft}
          editingSeccionId={editingSeccionId}
          seccionDraft={seccionDraft}
          setSeccionDraft={setSeccionDraft}
          addRequisito={() => addRequisito(claseId)}
          addSeccion={() => addSeccion(claseId)}
          startEditRequisito={startEditRequisito}
          cancelEditRequisito={cancelEditRequisito}
          saveRequisito={() => saveRequisito(claseId)}
          removeRequisito={id => removeRequisito(claseId, id)}
          startEditSeccion={startEditSeccion}
          cancelEditSeccion={cancelEditSeccion}
          saveSeccion={() => saveSeccion(claseId)}
          removeSeccion={id => removeSeccion(claseId, id)}
        />
      ) : (
        <ClaseRequisitosList requisitos={requisitos} secciones={secciones} t={t} />
      )}
    </div>
  );
}

function ClassRow({
  clase,
  canManage,
  canReorder,
  isDragging,
  isDropTarget,
  isFirst,
  isLast,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onMoveUp,
  onMoveDown,
  t,
  startEdit,
  toggleEstado,
  expandedClassId,
  requisitosByClase,
  seccionesByClase,
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
  toggleExpandClass,
  addRequisito,
  removeRequisito,
  startEditRequisito,
  cancelEditRequisito,
  saveRequisito,
  saveRequisitoOptionalText,
  addSeccion,
  startEditSeccion,
  cancelEditSeccion,
  saveSeccion,
  removeSeccion,
}) {
  const expanded = expandedClassId === clase.id;
  const requisitos = requisitosByClase[clase.id] || [];
  const secciones = seccionesByClase[clase.id] || [];

  return (
    <div
      onDragOver={canReorder ? e => { e.preventDefault(); onDragOver?.(); } : undefined}
      onDragLeave={canReorder ? onDragLeave : undefined}
      onDrop={canReorder ? e => { e.preventDefault(); onDrop?.(); } : undefined}
      style={{
        padding: '15px',
        border: isDropTarget ? '2px solid #2563eb' : '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: isDragging ? '#f3f4f6' : '#fff',
        opacity: isDragging ? 0.6 : 1,
      }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {canReorder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', paddingTop: '2px' }}>
            <span
              draggable
              onDragStart={e => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', clase.id);
                onDragStart?.();
              }}
              onDragEnd={onDragEnd}
              title={t('dragToReorder')}
              style={{ cursor: 'grab', color: '#9ca3af', fontSize: '16px', lineHeight: 1, userSelect: 'none' }}
              aria-label={t('dragToReorder')}
            >
              ⠿
            </span>
            <button
              type="button"
              disabled={isFirst}
              onClick={onMoveUp}
              title={t('moveUp')}
              style={{ padding: '2px 6px', fontSize: '11px', cursor: isFirst ? 'not-allowed' : 'pointer', opacity: isFirst ? 0.4 : 1 }}
            >
              ↑
            </button>
            <button
              type="button"
              disabled={isLast}
              onClick={onMoveDown}
              title={t('moveDown')}
              style={{ padding: '2px 6px', fontSize: '11px', cursor: isLast ? 'not-allowed' : 'pointer', opacity: isLast ? 0.4 : 1 }}
            >
              ↓
            </button>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>{clase.nombre}</strong>
          <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '4px' }}>
            {t('clubType')}: {clase.tipos_club?.nombre || clase.club_tipo || '—'}
          </div>
          <span className={`badge badge-${clase.estado}`} style={{ marginTop: '8px', display: 'inline-block' }}>
            {estadoLabel(clase.estado, t)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => toggleExpandClass(clase.id)}
            style={{ padding: '6px 12px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            {expanded ? `▲ ${t('hideRequirements')}` : `▼ ${t('requirements')}`}
          </button>
          {canManage && (
            <>
              <button type="button" onClick={() => startEdit(clase)} style={{ padding: '6px 12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                ✏️ {t('edit')}
              </button>
              <button type="button" onClick={() => toggleEstado(clase)} style={{ padding: '6px 12px', backgroundColor: clase.estado === 'activo' ? '#dc2626' : '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                {clase.estado === 'activo' ? `❌ ${t('deactivate')}` : `✓ ${t('activate')}`}
              </button>
            </>
          )}
        </div>
      </div>
      <RequisitosSection
        expanded={expanded}
        requisitos={requisitos}
        secciones={secciones}
        canManage={canManage}
        claseId={clase.id}
        newRequisitoForm={newRequisitoForm}
        setNewRequisitoForm={setNewRequisitoForm}
        newSeccionForm={newSeccionForm}
        setNewSeccionForm={setNewSeccionForm}
        editingRequisitoId={editingRequisitoId}
        requisitoDraft={requisitoDraft}
        setRequisitoDraft={setRequisitoDraft}
        editingSeccionId={editingSeccionId}
        seccionDraft={seccionDraft}
        setSeccionDraft={setSeccionDraft}
        addRequisito={addRequisito}
        addSeccion={addSeccion}
        startEditRequisito={startEditRequisito}
        cancelEditRequisito={cancelEditRequisito}
        saveRequisito={saveRequisito}
        removeRequisito={removeRequisito}
        startEditSeccion={startEditSeccion}
        cancelEditSeccion={cancelEditSeccion}
        saveSeccion={saveSeccion}
        removeSeccion={removeSeccion}
        t={t}
      />
        </div>
      </div>
    </div>
  );
}

function ClaseList({ clases, canReorder, onMoveClase, onDropClase, rowProps }) {
  const [draggingId, setDraggingId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const sorted = ClasesModel.sortClasesByOrden(clases);

  return sorted.map((clase, index) => (
    <ClassRow
      key={clase.id}
      clase={clase}
      canReorder={canReorder}
      isDragging={draggingId === clase.id}
      isDropTarget={dropTargetId === clase.id && draggingId !== clase.id}
      isFirst={index === 0}
      isLast={index === sorted.length - 1}
      onDragStart={() => setDraggingId(clase.id)}
      onDragEnd={() => { setDraggingId(null); setDropTargetId(null); }}
      onDragOver={() => setDropTargetId(clase.id)}
      onDragLeave={() => setDropTargetId(prev => (prev === clase.id ? null : prev))}
      onDrop={() => {
        onDropClase(sorted, draggingId, clase.id);
        setDraggingId(null);
        setDropTargetId(null);
      }}
      onMoveUp={() => onMoveClase(sorted, clase.id, 'up')}
      onMoveDown={() => onMoveClase(sorted, clase.id, 'down')}
      {...rowProps}
    />
  ));
}

export default function ClasesProgresivasView({
  data,
  groupedData,
  searchQuery,
  setSearchQuery,
  tipos,
  clubsData,
  activeIglesiaData,
  activeClub,
  tipoFilter,
  setTipoFilter,
  effectiveTipoId,
  form,
  setForm,
  showInactive,
  setShowInactive,
  error,
  showForm,
  editingId,
  canManage,
  reordering,
  reorderClases,
  moveClase,
  dropClaseOn,
  save,
  startEdit,
  toggleEstado,
  cancelForm,
  toggleForm,
  selectClubFilter,
  clearTipoFilter,
  showAllTypes,
  expandedClassId,
  requisitosByClase,
  seccionesByClase,
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
  toggleExpandClass,
  addRequisito,
  removeRequisito,
  startEditRequisito,
  cancelEditRequisito,
  saveRequisito,
  saveRequisitoOptionalText,
  addSeccion,
  startEditSeccion,
  cancelEditSeccion,
  saveSeccion,
  removeSeccion,
}) {
  const { t } = useLanguage();
  const activeTipo = tipos.find(tipo => tipo.id === effectiveTipoId);
  const isSearching = searchQuery.trim().length > 0;
  const canReorder = canManage && !isSearching && !reordering;

  const rowProps = {
    canManage,
    t,
    startEdit,
    toggleEstado,
    expandedClassId,
    requisitosByClase,
    seccionesByClase,
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
    toggleExpandClass,
    addRequisito,
    removeRequisito,
    startEditRequisito,
    cancelEditRequisito,
    saveRequisito,
    addSeccion,
    startEditSeccion,
    cancelEditSeccion,
    saveSeccion,
    removeSeccion,
  };

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>📚 {t('progressiveClasses')} <PageHelpLink pageId="progressiveClasses" /></h1>
          {activeIglesiaData && (
            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
              {t('churchLabel')}: <strong>{activeIglesiaData.nombre}</strong>
            </p>
          )}
          {activeClub && (
            <p style={{ margin: '4px 0 0 0', color: '#2563eb', fontSize: '14px' }}>
              {t('activeClub')}: <strong>{clubDisplayName(activeClub)}</strong>
            </p>
          )}
          <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: '13px' }}>
            {t('classesLinkedByType')}
          </p>
        </div>
        {canManage && (
          <button
            onClick={toggleForm}
            style={{
              padding: '10px 15px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            {showForm ? `✕ ${t('cancel')}` : `➕ ${t('newClass')}`}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
              {t('showInactiveClasses')}
            </label>
            <select
              value={tipoFilter}
              onChange={e => {
                setShowAllTypes(true);
                setTipoFilter(e.target.value);
              }}
              style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '14px' }}
            >
              <option value="">{showAllTypes ? t('allClubTypes') : t('classesForActiveClubType')}</option>
              {tipos.map(tipo => (
                <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
              ))}
            </select>
            {clubsData.length > 0 && (
              <select
                value={activeClub?.id || ''}
                onChange={e => selectClubFilter(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '14px' }}
              >
                <option value="">{t('selectClub')}</option>
                {clubsData.map(club => (
                  <option key={club.id} value={club.id}>{clubDisplayName(club)}</option>
                ))}
              </select>
            )}
            {effectiveTipoId && (
              <button
                onClick={clearTipoFilter}
                style={{ padding: '6px 12px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                ✕ {t('showAllTypes')}
              </button>
            )}
            <ListSearchInput value={searchQuery} onChange={setSearchQuery} />
          </div>
        </div>

        {effectiveTipoId && activeTipo && (
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#374151' }}>
            {t('classesForClubType')}: <strong>{activeTipo.nombre}</strong>
          </p>
        )}

        {showForm && canManage && (
          <div style={{ padding: '15px', backgroundColor: '#f0f9ff', border: '2px solid #0891b2', borderRadius: '8px', marginBottom: '20px' }}>
            <h4 style={{ marginTop: 0 }}>{editingId ? t('editClass') : t('newClass')}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('name')} *</label>
                <input
                  placeholder={t('className')}
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  className="form-input"
                  style={{ margin: 0 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('clubTypeRequired')} *</label>
                <select
                  value={form.tipo_id}
                  onChange={e => setForm({ ...form, tipo_id: e.target.value })}
                  className="form-input"
                  style={{ margin: 0 }}
                >
                  <option value="">{t('selectClubType')}</option>
                  {tipos.map(tipo => (
                    <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={save} style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
                ✓ {t('save')}
              </button>
              <button onClick={cancelForm} style={{ padding: '10px 20px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
                ✕ {t('cancel')}
              </button>
            </div>
          </div>
        )}

        <h4>{t('classList')}</h4>
        {canReorder && data.length > 1 && (
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6b7280' }}>
            {t('dragToReorderClassesHint')}
          </p>
        )}
        {data.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>
            {isSearching ? t('noSearchResults') : t('noClasses')}
          </p>
        ) : groupedData ? (
          <div style={{ display: 'grid', gap: '20px' }}>
            {groupedData.map(({ tipo, clases }) => (
              <div key={tipo.id}>
                <h5 style={{ margin: '0 0 10px 0', color: '#3730a3' }}>{tipo.nombre}</h5>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <ClaseList
                    clases={clases}
                    canReorder={canReorder}
                    onMoveClase={moveClase}
                    onDropClase={dropClaseOn}
                    rowProps={rowProps}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            <ClaseList
              clases={data}
              canReorder={canReorder}
              onMoveClase={moveClase}
              onDropClase={dropClaseOn}
              rowProps={rowProps}
            />
          </div>
        )}
      </div>
    </div>
  );
}
