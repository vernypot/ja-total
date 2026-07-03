import { useLanguage } from '../../hooks/useLanguage';
import { estadoLabel } from '../../i18n/helpers';
import ListSearchInput from '../../components/ListSearchInput';
import { PageHelpLink } from '../../components/PageHelp';
import FormField from '../../components/FormField';
import { campoTipoLabel } from '../models/estructuraOrganizacional.model';
import '../../styles/form.css';

export default function EstructuraOrganizacionalView({
  level,
  items,
  breadcrumb,
  levelTitle,
  levelHint,
  childLabel,
  showInactive,
  setShowInactive,
  showForm,
  editingId,
  form,
  setForm,
  searchQuery,
  setSearchQuery,
  loading,
  error,
  fieldErrors = {},
  hasTable,
  openCreateForm,
  closeForm,
  startEdit,
  save,
  toggleEstado,
  drillDown,
  goUp,
  canDrillDown,
  canGoUp,
}) {
  const { t } = useLanguage();

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>🌎 {t('orgStructure')} <PageHelpLink pageId="orgStructure" /></h1>
          <p style={{ margin: '8px 0 0 0', color: 'var(--color-text-secondary)', fontSize: '13px' }}>{t('orgStructureSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => (showForm ? closeForm() : openCreateForm())}
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
          {showForm ? `✕ ${t('cancel')}` : `➕ ${t('orgStructureNew')}`}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {!hasTable && (
        <div className="alert alert-error">{t('orgStructureSchemaMissing')}</div>
      )}

      <div className="card">
        <nav aria-label={t('orgStructure')} style={{ marginBottom: '16px', fontSize: '13px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          {breadcrumb.map((crumb, index) => (
            <span key={`${crumb.level}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {index > 0 && <span style={{ color: '#9ca3af' }}>›</span>}
              <button
                type="button"
                onClick={crumb.onClick}
                style={{
                  border: 'none',
                  background: index === breadcrumb.length - 1 ? '#eff6ff' : 'transparent',
                  color: index === breadcrumb.length - 1 ? '#1d4ed8' : '#2563eb',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontWeight: index === breadcrumb.length - 1 ? 700 : 500,
                }}
              >
                {crumb.label}
              </button>
            </span>
          ))}
        </nav>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>{levelTitle}</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>{levelHint}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {canGoUp && (
              <button type="button" onClick={goUp} className="btn btn-sm btn-secondary">
                ← {t('back')}
              </button>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
              {t('showInactive')}
            </label>
            <ListSearchInput value={searchQuery} onChange={setSearchQuery} />
          </div>
        </div>

        {showForm && (
          <div style={{ padding: '15px', backgroundColor: '#f0f9ff', border: '2px solid #0891b2', borderRadius: '8px', marginBottom: '20px' }}>
            <h4 style={{ marginTop: 0 }}>{editingId ? t('edit') : t('orgStructureNew')} — {levelTitle}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
              <FormField label={t('code')} htmlFor="org-codigo" error={fieldErrors.codigo}>
                <input
                  id="org-codigo"
                  value={form.codigo}
                  onChange={e => setForm({ ...form, codigo: e.target.value })}
                  className="form-input"
                  style={{ margin: 0 }}
                  placeholder={level === 'division' ? 'DIA' : ''}
                />
              </FormField>
              <FormField label={t('name')} htmlFor="org-nombre" error={fieldErrors.nombre} required>
                <input
                  id="org-nombre"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  className="form-input"
                  style={{ margin: 0 }}
                  aria-invalid={Boolean(fieldErrors.nombre)}
                />
              </FormField>
              {level === 'campo' && (
                <FormField label={t('localFieldType')} htmlFor="org-tipo" error={fieldErrors.tipo_campo} required>
                  <select
                    id="org-tipo"
                    value={form.tipo_campo}
                    onChange={e => setForm({ ...form, tipo_campo: e.target.value })}
                    className="form-input"
                    style={{ margin: 0 }}
                  >
                    <option value="mision">{t('mission')}</option>
                    <option value="asociacion">{t('association')}</option>
                  </select>
                </FormField>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={save} style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                ✓ {t('save')}
              </button>
              <button type="button" onClick={closeForm} style={{ padding: '10px 20px', backgroundColor: 'var(--color-btn-neutral)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                ✕ {t('cancel')}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading">{t('loadingData')}</div>
        ) : items.length === 0 ? (
          <p className="text-muted">{t('orgStructureEmpty')}</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {items.map(item => (
              <div
                key={item.id}
                style={{
                  padding: '15px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong>{item.nombre}</strong>
                  {item.codigo && (
                    <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      [{item.codigo}]
                    </span>
                  )}
                  {item.tipo_campo && (
                    <span style={{ marginLeft: '8px', fontSize: '12px', color: '#0891b2' }}>
                      {item.tipo_campo === 'asociacion' ? t('association') : t('mission')}
                    </span>
                  )}
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>
                    {item.estado && (
                      <span className={`badge badge-${item.estado}`}>
                        {estadoLabel(item.estado, t)}
                      </span>
                    )}
                    {level === 'campo' && item.tipo_campo && (
                      <span style={{ marginLeft: '8px' }}>{campoTipoLabel(item.tipo_campo)}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {canDrillDown && (
                    <button
                      type="button"
                      onClick={() => drillDown(item)}
                      style={{ padding: '6px 12px', backgroundColor: '#0891b2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      → {childLabel}
                    </button>
                  )}
                  <button type="button" onClick={() => startEdit(item)} style={{ padding: '6px 12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                    ✏️ {t('edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleEstado(item)}
                    style={{ padding: '6px 12px', backgroundColor: item.estado === 'activo' ? '#dc2626' : '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    {item.estado === 'activo' ? `❌ ${t('deactivate')}` : `✓ ${t('activate')}`}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
