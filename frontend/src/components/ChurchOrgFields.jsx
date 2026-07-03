import FormField from './FormField';

export function ChurchOrgPath({ label, className = '' }) {
  if (!label) return null;
  return (
    <div className={`church-org-path ${className}`.trim()} style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
      🌎 {label}
    </div>
  );
}

export default function ChurchOrgFields({
  t,
  mode = 'edit',
  churchForm,
  setChurchFormField,
  divisiones = [],
  uniones = [],
  campos = [],
  zonas = [],
  fieldErrors = {},
  hierarchyLabel = '',
}) {
  if (mode === 'display') {
    return hierarchyLabel ? <ChurchOrgPath label={hierarchyLabel} /> : null;
  }

  return (
    <div
      className="church-org-fields"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '12px' }}
    >
      <FormField label={t('division')} htmlFor="iglesia-division" required>
        <select
          id="iglesia-division"
          value={churchForm.division_id}
          onChange={e => setChurchFormField('division_id', e.target.value)}
          className="form-input"
          style={{ margin: 0 }}
        >
          <option value="">{t('selectDivision')}</option>
          {divisiones.map(d => (
            <option key={d.id} value={d.id}>{d.codigo} — {d.nombre}</option>
          ))}
        </select>
      </FormField>
      <FormField label={t('union')} htmlFor="iglesia-union" required>
        <select
          id="iglesia-union"
          value={churchForm.union_id}
          onChange={e => setChurchFormField('union_id', e.target.value)}
          className="form-input"
          style={{ margin: 0 }}
          disabled={!churchForm.division_id}
        >
          <option value="">{t('selectUnion')}</option>
          {uniones.map(u => (
            <option key={u.id} value={u.id}>{u.nombre}</option>
          ))}
        </select>
      </FormField>
      <FormField label={t('localField')} htmlFor="iglesia-campo" required>
        <select
          id="iglesia-campo"
          value={churchForm.campo_id}
          onChange={e => setChurchFormField('campo_id', e.target.value)}
          className="form-input"
          style={{ margin: 0 }}
          disabled={!churchForm.union_id}
        >
          <option value="">{t('selectLocalField')}</option>
          {campos.map(c => (
            <option key={c.id} value={c.id}>
              {c.tipo_campo === 'asociacion' ? t('association') : t('mission')}: {c.nombre}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label={t('zone')} htmlFor="iglesia-zona" error={fieldErrors.zona_id} required>
        <select
          id="iglesia-zona"
          value={churchForm.zona_id}
          onChange={e => setChurchFormField('zona_id', e.target.value)}
          className="form-input"
          style={{ margin: 0 }}
          disabled={!churchForm.campo_id}
          aria-invalid={Boolean(fieldErrors.zona_id)}
        >
          <option value="">{t('selectZone')}</option>
          {zonas.map(z => (
            <option key={z.id} value={z.id}>{z.nombre}</option>
          ))}
        </select>
      </FormField>
    </div>
  );
}

export function ChurchOrgFilters({
  t,
  filters,
  setFilter,
  divisiones,
  uniones,
  campos,
  zonas,
  onClear,
}) {
  return (
    <div
      className="church-org-filters"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '10px',
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
      }}
    >
      <label style={{ fontSize: '13px' }}>
        <span style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>{t('division')}</span>
        <select
          value={filters.division_id}
          onChange={e => setFilter('division_id', e.target.value)}
          className="form-input"
          style={{ margin: 0 }}
        >
          <option value="">{t('allDivisions')}</option>
          {divisiones.map(d => (
            <option key={d.id} value={d.id}>{d.codigo} — {d.nombre}</option>
          ))}
        </select>
      </label>
      <label style={{ fontSize: '13px' }}>
        <span style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>{t('union')}</span>
        <select
          value={filters.union_id}
          onChange={e => setFilter('union_id', e.target.value)}
          className="form-input"
          style={{ margin: 0 }}
          disabled={!filters.division_id}
        >
          <option value="">{t('allUnions')}</option>
          {uniones.map(u => (
            <option key={u.id} value={u.id}>{u.nombre}</option>
          ))}
        </select>
      </label>
      <label style={{ fontSize: '13px' }}>
        <span style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>{t('localField')}</span>
        <select
          value={filters.campo_id}
          onChange={e => setFilter('campo_id', e.target.value)}
          className="form-input"
          style={{ margin: 0 }}
          disabled={!filters.union_id}
        >
          <option value="">{t('allLocalFields')}</option>
          {campos.map(c => (
            <option key={c.id} value={c.id}>
              {c.tipo_campo === 'asociacion' ? t('association') : t('mission')}: {c.nombre}
            </option>
          ))}
        </select>
      </label>
      <label style={{ fontSize: '13px' }}>
        <span style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>{t('zone')}</span>
        <select
          value={filters.zona_id}
          onChange={e => setFilter('zona_id', e.target.value)}
          className="form-input"
          style={{ margin: 0 }}
          disabled={!filters.campo_id}
        >
          <option value="">{t('allZones')}</option>
          {zonas.map(z => (
            <option key={z.id} value={z.id}>{z.nombre}</option>
          ))}
        </select>
      </label>
      {(filters.division_id || filters.union_id || filters.campo_id || filters.zona_id) && (
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button type="button" onClick={onClear} className="btn btn-sm btn-secondary" style={{ width: '100%' }}>
            {t('clearFilters')}
          </button>
        </div>
      )}
    </div>
  );
}
