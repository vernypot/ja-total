import { useLanguage } from '../../hooks/useLanguage';
import { estadoLabel } from '../../i18n/helpers';
import { clubDisplayName } from '../../utils/club';
import ListSearchInput from '../../components/ListSearchInput';
import '../../styles/form.css';

function RequisitosSection({
  expanded,
  requisitos,
  newRequisito,
  setNewRequisito,
  canManage,
  onAdd,
  onRemove,
  t,
}) {
  if (!expanded) return null;

  return (
    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
      <strong style={{ fontSize: '13px' }}>{t('requirements')}</strong>
      {requisitos.length === 0 ? (
        <p style={{ margin: '8px 0', fontSize: '13px', color: '#6b7280' }}>{t('noRequirements')}</p>
      ) : (
        <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '13px' }}>
          {requisitos.map(r => (
            <li key={r.id} style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span>{r.descripcion}</span>
              {canManage && (
                <button
                  type="button"
                  onClick={() => onRemove(r.id)}
                  style={{ padding: '2px 8px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <input
            value={newRequisito}
            onChange={e => setNewRequisito(e.target.value)}
            placeholder={t('requirementDescription')}
            className="form-input"
            style={{ margin: 0, flex: 1, fontSize: '13px' }}
            onKeyDown={e => e.key === 'Enter' && onAdd()}
          />
          <button
            type="button"
            onClick={onAdd}
            style={{ padding: '6px 12px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            ➕ {t('addRequirement')}
          </button>
        </div>
      )}
    </div>
  );
}

function SpecialtyRow({
  item,
  canManage,
  hasEstado,
  t,
  startEdit,
  toggleEstado,
  expandedId,
  requisitosByEsp,
  newRequisito,
  setNewRequisito,
  toggleExpand,
  addRequisito,
  removeRequisito,
}) {
  const expanded = expandedId === item.id;
  const requisitos = requisitosByEsp[item.id] || [];

  return (
    <div style={{ padding: '15px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>{item.nombre}</strong>
          <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '4px' }}>
            {t('clubType')}: {item.tipos_club?.nombre || item.club_tipo || '—'}
          </div>
          {hasEstado && item.estado && (
            <span className={`badge badge-${item.estado}`} style={{ marginTop: '8px', display: 'inline-block' }}>
              {estadoLabel(item.estado, t)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => toggleExpand(item.id)}
            style={{ padding: '6px 12px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            {expanded ? `▲ ${t('hideRequirements')}` : `▼ ${t('requirements')}`}
          </button>
          {canManage && (
            <>
              <button type="button" onClick={() => startEdit(item)} style={{ padding: '6px 12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                ✏️ {t('edit')}
              </button>
              {hasEstado && (
                <button type="button" onClick={() => toggleEstado(item)} style={{ padding: '6px 12px', backgroundColor: item.estado === 'activo' ? '#dc2626' : '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                  {item.estado === 'activo' ? `❌ ${t('deactivate')}` : `✓ ${t('activate')}`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <RequisitosSection
        expanded={expanded}
        requisitos={requisitos}
        newRequisito={newRequisito}
        setNewRequisito={setNewRequisito}
        canManage={canManage}
        onAdd={() => addRequisito(item.id)}
        onRemove={id => removeRequisito(item.id, id)}
        t={t}
      />
    </div>
  );
}

export default function EspecialidadesCatalogView({
  data,
  groupedData,
  searchQuery,
  setSearchQuery,
  tipos,
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
  expandedId,
  requisitosByEsp,
  newRequisito,
  setNewRequisito,
  toggleExpand,
  addRequisito,
  removeRequisito,
  hasEstado,
  clearTipoFilter,
  showAllTypes,
  setShowAllTypes,
}) {
  const { t } = useLanguage();
  const activeTipo = tipos.find(tipo => tipo.id === effectiveTipoId);
  const isSearching = searchQuery.trim().length > 0;

  const rowProps = {
    canManage,
    hasEstado,
    t,
    startEdit,
    toggleEstado,
    expandedId,
    requisitosByEsp,
    newRequisito,
    setNewRequisito,
    toggleExpand,
    addRequisito,
    removeRequisito,
  };

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>🎖️ {t('specialties')}</h1>
          {activeClub && (
            <p style={{ margin: '4px 0 0 0', color: '#2563eb', fontSize: '14px' }}>
              {t('activeClub')}: <strong>{clubDisplayName(activeClub)}</strong>
            </p>
          )}
          <p style={{ margin: '8px 0 0 0', color: '#888', fontSize: '13px' }}>
            {t('specialtiesLinkedByType')}
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
            {showForm ? `✕ ${t('cancel')}` : `➕ ${t('newSpecialty')}`}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {hasEstado && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
              {t('showInactiveSpecialties')}
            </label>
          )}
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

        {effectiveTipoId && activeTipo && (
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#374151' }}>
            {t('specialtiesForClubType')}: <strong>{activeTipo.nombre}</strong>
          </p>
        )}

        {showForm && canManage && (
          <div style={{ padding: '15px', backgroundColor: '#f0f9ff', border: '2px solid #0891b2', borderRadius: '8px', marginBottom: '20px' }}>
            <h4 style={{ marginTop: 0 }}>{editingId ? t('editSpecialty') : t('newSpecialty')}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('name')} *</label>
                <input
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

        <h4>{t('specialtyList')}</h4>
        {data.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>
            {isSearching ? t('noSearchResults') : t('noSpecialties')}
          </p>
        ) : groupedData ? (
          <div style={{ display: 'grid', gap: '20px' }}>
            {groupedData.map(({ tipo, especialidades }) => (
              <div key={tipo.id}>
                <h5 style={{ margin: '0 0 10px 0', color: '#3730a3' }}>{tipo.nombre}</h5>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {especialidades.map(item => (
                    <SpecialtyRow key={item.id} item={item} {...rowProps} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {data.map(item => (
              <SpecialtyRow key={item.id} item={item} {...rowProps} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
