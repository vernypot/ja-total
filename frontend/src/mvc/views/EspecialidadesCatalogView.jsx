import { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { estadoLabel } from '../../i18n/helpers';
import { clubDisplayName } from '../../utils/club';
import { isEspecialidadAssignable } from '../models/especialidades.model';
import ListSearchInput from '../../components/ListSearchInput';
import ListPagination from '../../components/ListPagination';
import { PageHelpLink } from '../../components/PageHelp';
import '../../styles/form.css';

function RequisitosSection({
  expanded,
  requisitos,
  newRequisito,
  setNewRequisito,
  canManage,
  onAdd,
  onRemove,
  onToggleEstado,
  t,
}) {
  if (!expanded) return null;

  return (
    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
      <strong style={{ fontSize: '13px' }}>{t('requirements')}</strong>
      {requisitos.length === 0 ? (
        <p style={{ margin: '8px 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>{t('noRequirements')}</p>
      ) : (
        <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '13px' }}>
          {requisitos.map(r => (
            <li key={r.id} style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span style={{ opacity: r.estado === 'activo' ? 1 : 0.55 }}>
                {r.descripcion}
                {r.estado !== 'activo' && (
                  <span style={{ marginLeft: '6px', fontSize: '11px', color: '#9ca3af' }}>
                    ({estadoLabel(r.estado, t)})
                  </span>
                )}
              </span>
              {canManage && (
                <span style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => onToggleEstado(r)}
                    style={{ padding: '2px 8px', backgroundColor: r.estado === 'activo' ? '#6b7280' : '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                  >
                    {r.estado === 'activo' ? t('deactivate') : t('activate')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(r.id)}
                    style={{ padding: '2px 8px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                  >
                    ✕
                  </button>
                </span>
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
  toggleRequisitoEstado,
  hideSection = false,
}) {
  const expanded = expandedId === item.id;
  const requisitos = requisitosByEsp[item.id] || [];
  const assignable = isEspecialidadAssignable(item, requisitos);

  return (
    <div style={{ padding: '15px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>{item.nombre}</strong>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            {!hideSection && item.especialidad_secciones?.nombre && (
              <span>{t('specialtySection')}: {item.especialidad_secciones.nombre} · </span>
            )}
            {t('clubType')}: {item.tipos_club?.nombre || item.club_tipo || '—'}
          </div>
          {hasEstado && item.estado && (
            <span className={`badge badge-${item.estado}`} style={{ marginTop: '8px', display: 'inline-block' }}>
              {estadoLabel(item.estado, t)}
            </span>
          )}
          <div style={{ marginTop: '8px', fontSize: '12px', color: assignable ? '#15803d' : '#b45309' }}>
            {assignable ? t('honorAssignable') : t('honorNotAssignable')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => toggleExpand(item.id)}
            style={{ padding: '6px 12px', backgroundColor: 'var(--color-btn-neutral)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
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
        onToggleEstado={req => toggleRequisitoEstado(item.id, req)}
        t={t}
      />
    </div>
  );
}

function SpecialtySectionGroup({ group, groupKey, groupTitle, rowProps, t, collapsed, onToggle }) {
  const countLabel = t('specialtySectionCount').replace('{{count}}', String(group.especialidades.length));

  return (
    <section style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#fafafa' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 16px',
          border: 'none',
          background: 'linear-gradient(180deg, #eef2ff 0%, #e0e7ff 100%)',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span style={{ fontSize: '12px', color: '#4338ca' }}>{collapsed ? '▶' : '▼'}</span>
          <strong style={{ color: '#312e81', fontSize: '15px' }}>{groupTitle}</strong>
        </span>
        <span style={{ fontSize: '12px', color: '#4338ca', backgroundColor: '#fff', padding: '4px 10px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
          {countLabel}
        </span>
      </button>
      {!collapsed && (
        <div style={{ display: 'grid', gap: '12px', padding: '12px' }}>
          {group.especialidades.map(item => (
            <SpecialtyRow key={item.id} item={item} hideSection {...rowProps} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function EspecialidadesCatalogView({
  data,
  groupedData,
  searchQuery,
  setSearchQuery,
  tipos,
  secciones,
  seccionFilter,
  setSeccionFilter,
  activeClub,
  tipoFilter,
  setTipoFilter,
  effectiveTipoId,
  totalCount,
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
  toggleRequisitoEstado,
  hasEstado,
  clearTipoFilter,
  showAllTypes,
  setShowAllTypes,
  listPagination,
}) {
  const { t } = useLanguage();
  const [collapsedSections, setCollapsedSections] = useState({});
  const activeTipo = tipos.find(tipo => tipo.id === effectiveTipoId);
  const isSearching = searchQuery.trim().length > 0;

  function toggleSectionCollapse(groupKey) {
    setCollapsedSections(prev => ({ ...prev, [groupKey]: !(prev[groupKey] ?? true) }));
  }

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
    toggleRequisitoEstado,
  };

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>🎖️ {t('specialties')} <PageHelpLink pageId="specialties" /></h1>
          {activeClub && (
            <p style={{ margin: '4px 0 0 0', color: '#2563eb', fontSize: '14px' }}>
              {t('activeClub')}: <strong>{clubDisplayName(activeClub)}</strong>
            </p>
          )}
          <p style={{ margin: '8px 0 0 0', color: '#888', fontSize: '13px' }}>
            {t('specialtiesGroupedBySection')}
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
          {secciones.length > 0 && (
            <select
              value={seccionFilter}
              onChange={e => setSeccionFilter(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '14px' }}
            >
              <option value="">{t('allSections')}</option>
              {secciones.map(seccion => (
                <option key={seccion.id} value={seccion.id}>{seccion.nombre}</option>
              ))}
            </select>
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
              style={{ padding: '6px 12px', backgroundColor: 'var(--color-btn-neutral)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
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

        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
          {t('specialtyListCount').replace('{{count}}', String(listPagination?.totalItems ?? data.length))}
          {effectiveTipoId && !showAllTypes && (
            <span> · {t('specialtyListFilteredByClub')}</span>
          )}
        </p>

        <ListPagination {...listPagination} />

        {showForm && canManage && (
          <div style={{ padding: '15px', backgroundColor: '#f0f9ff', border: '2px solid #0891b2', borderRadius: '8px', marginBottom: '20px' }}>
            <h4 style={{ marginTop: 0 }}>{editingId ? t('editSpecialty') : t('newSpecialty')}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
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
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('specialtySection')}</label>
                <select
                  value={form.seccion_id}
                  onChange={e => setForm({ ...form, seccion_id: e.target.value })}
                  className="form-input"
                  style={{ margin: 0 }}
                >
                  <option value="">{t('selectSection')}</option>
                  {secciones.map(seccion => (
                    <option key={seccion.id} value={seccion.id}>{seccion.nombre}</option>
                  ))}
                </select>
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
              <button onClick={cancelForm} style={{ padding: '10px 20px', backgroundColor: 'var(--color-btn-neutral)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
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
          <div style={{ display: 'grid', gap: '16px' }}>
            {groupedData.map(group => {
              const groupKey = group.seccion?.id || group.tipo?.id || 'uncategorized';
              const groupTitle = group.seccion?.nombre || group.tipo?.nombre || t('uncategorized');
              const collapsed = collapsedSections[groupKey] ?? true;
              return (
                <SpecialtySectionGroup
                  key={groupKey}
                  group={group}
                  groupKey={groupKey}
                  groupTitle={groupTitle}
                  rowProps={rowProps}
                  t={t}
                  collapsed={collapsed}
                  onToggle={() => toggleSectionCollapse(groupKey)}
                />
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {data.map(item => (
              <SpecialtyRow key={item.id} item={item} {...rowProps} />
            ))}
          </div>
        )}
        {listPagination?.totalPages > 1 && <ListPagination {...listPagination} />}
      </div>
    </div>
  );
}
