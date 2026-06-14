import { useLanguage } from '../../hooks/useLanguage';
import { estadoLabel } from '../../i18n/helpers';
import { clubDisplayName } from '../../utils/club';
import ListSearchInput from '../../components/ListSearchInput';
import ClaseRequisitosList from '../../components/ClaseRequisitosList';
import ClaseRequisitosEditor from '../../components/ClaseRequisitosEditor';
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
}) {
  const expanded = expandedClassId === clase.id;
  const requisitos = requisitosByClase[clase.id] || [];
  const secciones = seccionesByClase[clase.id] || [];

  return (
    <div style={{ padding: '15px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff' }}>
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
  );
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
  addSeccion,
  startEditSeccion,
  cancelEditSeccion,
  saveSeccion,
  removeSeccion,
}) {
  const { t } = useLanguage();
  const activeTipo = tipos.find(tipo => tipo.id === effectiveTipoId);
  const isSearching = searchQuery.trim().length > 0;

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
          <h1>📚 {t('progressiveClasses')}</h1>
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
                  {clases.map(c => (
                    <ClassRow key={c.id} clase={c} {...rowProps} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {data.map(c => (
              <ClassRow key={c.id} clase={c} {...rowProps} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
