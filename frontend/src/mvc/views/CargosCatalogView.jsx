import { useLanguage } from '../../hooks/useLanguage';
import { estadoLabel } from '../../i18n/helpers';
import ListSearchInput from '../../components/ListSearchInput';
import { PageHelpLink } from '../../components/PageHelp';
import FormField from '../../components/FormField';
import '../../styles/form.css';

function CargoTreeNode({
  node,
  depth,
  expandedIds,
  canManage,
  t,
  toggleExpanded,
  startCreate,
  startEdit,
  toggleEstado,
  getCargoPath,
}) {
  const hasChildren = node.children?.length > 0;
  const expanded = expandedIds.has(node.id);
  const path = getCargoPath(node.id).map(c => c.nombre).join(' › ');

  return (
    <div style={{ marginLeft: depth ? `${depth * 16}px` : 0 }}>
      <div
        style={{
          padding: '12px 15px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          backgroundColor: '#fff',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpanded(node.id)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontSize: '12px' }}
                  aria-label={expanded ? t('collapse') : t('expand')}
                >
                  {expanded ? '▼' : '▶'}
                </button>
              ) : (
                <span style={{ width: '12px', display: 'inline-block' }} />
              )}
              <strong>{node.nombre}</strong>
              {node.codigo && (
                <span style={{ fontSize: '12px', color: '#6b7280' }}>({node.codigo})</span>
              )}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '4px', marginLeft: '20px' }}>
              {depth > 0 && <span>{t('cargoPath')}: {path} · </span>}
              {t('clubType')}: {node.tipos_club?.nombre || t('allClubTypes')}
              {node.descripcion && <div style={{ marginTop: '4px' }}>{node.descripcion}</div>}
            </div>
            {node.estado && node.estado !== 'activo' && (
              <span className={`badge badge-${node.estado}`} style={{ marginTop: '8px', marginLeft: '20px', display: 'inline-block' }}>
                {estadoLabel(node.estado, t)}
              </span>
            )}
          </div>
          {canManage && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => startCreate(node.id)}
                style={{ padding: '6px 12px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                ➕ {t('addChildCargo')}
              </button>
              <button
                type="button"
                onClick={() => startEdit(node)}
                style={{ padding: '6px 12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                ✏️ {t('edit')}
              </button>
              <button
                type="button"
                onClick={() => toggleEstado(node)}
                style={{ padding: '6px 12px', backgroundColor: node.estado === 'activo' ? '#dc2626' : '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                {node.estado === 'activo' ? `❌ ${t('deactivate')}` : `✓ ${t('activate')}`}
              </button>
            </div>
          )}
        </div>
      </div>
      {hasChildren && expanded && node.children.map(child => (
        <CargoTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          expandedIds={expandedIds}
          canManage={canManage}
          t={t}
          toggleExpanded={toggleExpanded}
          startCreate={startCreate}
          startEdit={startEdit}
          toggleEstado={toggleEstado}
          getCargoPath={getCargoPath}
        />
      ))}
    </div>
  );
}

export default function CargosCatalogView({
  tree,
  filteredData,
  tipos,
  form,
  setForm,
  tipoFilter,
  setTipoFilter,
  showAllTypes,
  setShowAllTypes,
  showInactive,
  setShowInactive,
  error,
  fieldErrors,
  showForm,
  editingId,
  expandedIds,
  searchQuery,
  setSearchQuery,
  canManage,
  parentOptions,
  resetForm,
  startCreate,
  startEdit,
  saveCargo,
  toggleEstado,
  toggleExpanded,
  getCargoPath,
}) {
  const { t } = useLanguage();

  return (
    <div className="container">
      <div className="page-header">
        <h1>🎖️ {t('cargos')} <PageHelpLink pageId="cargos" /></h1>
        {canManage && (
          <button type="button" className="btn btn-primary" onClick={() => startCreate()}>
            ➕ {t('addCargo')}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
        <ListSearchInput value={searchQuery} onChange={setSearchQuery} placeholder={t('search')} />
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
          <input type="checkbox" checked={showAllTypes} onChange={e => setShowAllTypes(e.target.checked)} />
          {t('showAllTypes')}
        </label>
        {showAllTypes && (
          <select
            value={tipoFilter}
            onChange={e => setTipoFilter(e.target.value)}
            className="form-input"
            style={{ margin: 0, width: 'auto', minWidth: '180px' }}
          >
            <option value="">{t('allClubTypes')}</option>
            {tipos.map(tipo => (
              <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
            ))}
          </select>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          {t('showInactive')}
        </label>
      </div>

      {showForm && canManage && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3>{editingId ? t('editCargo') : t('addCargo')}</h3>
          <div className="form-grid">
            <FormField label={t('name')} htmlFor="cargo-nombre" error={fieldErrors.nombre} required>
              <input
                id="cargo-nombre"
                className="form-input"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              />
            </FormField>
            <FormField label={t('parentCargo')} htmlFor="cargo-parent">
              <select
                id="cargo-parent"
                className="form-input"
                value={form.parent_id}
                onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}
              >
                <option value="">{t('rootCargo')}</option>
                {parentOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label={t('cargoCode')} htmlFor="cargo-codigo">
              <input
                id="cargo-codigo"
                className="form-input"
                value={form.codigo}
                onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
              />
            </FormField>
            <FormField label={t('clubType')} htmlFor="cargo-tipo">
              <select
                id="cargo-tipo"
                className="form-input"
                value={form.tipo_id}
                onChange={e => setForm(f => ({ ...f, tipo_id: e.target.value }))}
              >
                <option value="">{t('allClubTypes')}</option>
                {tipos.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                ))}
              </select>
            </FormField>
            <FormField label={t('order')} htmlFor="cargo-orden">
              <input
                id="cargo-orden"
                type="number"
                className="form-input"
                value={form.orden}
                onChange={e => setForm(f => ({ ...f, orden: e.target.value }))}
              />
            </FormField>
            <FormField label={t('description')} htmlFor="cargo-descripcion" className="form-grid-full">
              <textarea
                id="cargo-descripcion"
                className="form-input"
                rows={3}
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              />
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button type="button" className="btn btn-primary" onClick={saveCargo}>
              {t('save')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {filteredData.length === 0 ? (
        <p className="text-muted">{t('noCargos')}</p>
      ) : (
        <div>
          {tree.map(node => (
            <CargoTreeNode
              key={node.id}
              node={node}
              depth={0}
              expandedIds={expandedIds}
              canManage={canManage}
              t={t}
              toggleExpanded={toggleExpanded}
              startCreate={startCreate}
              startEdit={startEdit}
              toggleEstado={toggleEstado}
              getCargoPath={getCargoPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}
