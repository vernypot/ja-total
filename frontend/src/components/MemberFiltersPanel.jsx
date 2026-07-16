import { useLanguage } from '../hooks/useLanguage';
import {
  MIEMBRO_CLASE_PROGRESO_ESTADOS,
  miembroClaseProgresoEstadoLabel,
} from '../constants/miembroClaseProgresoEstado';

export default function MemberFiltersPanel({
  filters,
  onChange,
  onClear,
  clases = [],
  requisitos = [],
  especialidades = [],
  eventos = [],
  loading = false,
  activeCount = 0,
  showInactive = false,
  onShowInactiveChange,
  hideBoardMembers = false,
  onHideBoardMembersChange,
}) {
  const { t } = useLanguage();
  const showRequisitoFilter = Boolean(filters.claseId);
  const showClaseEstadoFilter = Boolean(filters.claseId);

  return (
    <div className="member-filters">
      <div className="member-filters__header">
        <div>
          <h3 className="member-filters__title">{t('memberFiltersTitle')}</h3>
          <p className="member-filters__hint">{t('memberFiltersHint')}</p>
        </div>
        {activeCount > 0 && (
          <button type="button" className="btn btn-sm" onClick={onClear} disabled={loading}>
            {t('memberFiltersClear')}
          </button>
        )}
      </div>

      <div className="member-filters__options">
        <label className="filter-checkbox-label">
          <input
            type="checkbox"
            className="filter-checkbox"
            checked={showInactive}
            onChange={e => onShowInactiveChange?.(e.target.checked)}
          />
          {t('showInactive')}
        </label>
        <label className="filter-checkbox-label">
          <input
            type="checkbox"
            className="filter-checkbox"
            checked={hideBoardMembers}
            onChange={e => onHideBoardMembersChange?.(e.target.checked)}
          />
          {t('hideBoardMembers')}
        </label>
      </div>

      <div className="member-filters__grid">
        <label className="member-filters__field">
          <span>{t('memberFilterClase')}</span>
          <select
            className="form-input"
            value={filters.claseId}
            onChange={e => onChange({
              claseId: e.target.value,
              requisitoId: '',
              claseEstadoProgreso: '',
            })}
          >
            <option value="">{t('memberFilterAny')}</option>
            {clases.map(clase => (
              <option key={clase.id} value={clase.id}>{clase.nombre}</option>
            ))}
          </select>
        </label>

        {showClaseEstadoFilter && (
          <label className="member-filters__field">
            <span>{t('memberFilterClaseEstado')}</span>
            <select
              className="form-input"
              value={filters.claseEstadoProgreso || ''}
              onChange={e => onChange({ claseEstadoProgreso: e.target.value })}
            >
              <option value="">{t('memberFilterAny')}</option>
              {MIEMBRO_CLASE_PROGRESO_ESTADOS.map(estado => (
                <option key={estado} value={estado}>
                  {miembroClaseProgresoEstadoLabel(estado, t)}
                </option>
              ))}
            </select>
          </label>
        )}

        {showRequisitoFilter && (
          <label className="member-filters__field">
            <span>{t('memberFilterRequisito')}</span>
            <select
              className="form-input"
              value={filters.requisitoId}
              onChange={e => onChange({ requisitoId: e.target.value })}
            >
              <option value="">{t('memberFilterClaseAssignedOnly')}</option>
              {requisitos.map(req => (
                <option key={req.id} value={req.id}>
                  {req.numero != null ? `${req.numero}. ` : ''}{req.descripcion}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="member-filters__field">
          <span>{t('memberFilterMinAge')}</span>
          <input
            type="number"
            min={0}
            max={120}
            className="form-input"
            value={filters.minAge}
            onChange={e => onChange({ minAge: e.target.value })}
            placeholder={t('memberFilterAny')}
          />
        </label>

        <label className="member-filters__field">
          <span>{t('memberFilterMaxAge')}</span>
          <input
            type="number"
            min={0}
            max={120}
            className="form-input"
            value={filters.maxAge}
            onChange={e => onChange({ maxAge: e.target.value })}
            placeholder={t('memberFilterAny')}
          />
        </label>

        <label className="member-filters__field">
          <span>{t('memberFilterEspecialidad')}</span>
          <select
            className="form-input"
            value={filters.especialidadId}
            onChange={e => onChange({ especialidadId: e.target.value })}
          >
            <option value="">{t('memberFilterAny')}</option>
            {especialidades.map(esp => (
              <option key={esp.id} value={esp.id}>{esp.nombre}</option>
            ))}
          </select>
        </label>

        <label className="member-filters__field">
          <span>{t('memberFilterEvento')}</span>
          <select
            className="form-input"
            value={filters.eventoId}
            onChange={e => onChange({ eventoId: e.target.value })}
          >
            <option value="">{t('memberFilterAny')}</option>
            {eventos.map(evento => (
              <option key={evento.id} value={evento.id}>
                {evento.nombre}{evento.fecha ? ` (${evento.fecha})` : ''}
                {evento.clubNombre ? ` — ${evento.clubNombre}` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && (
        <p className="member-filters__status">{t('memberFiltersLoading')}</p>
      )}

      {activeCount > 0 && !loading && (
        <p className="member-filters__status">
          {t('memberFiltersActive').replace('{count}', String(activeCount))}
        </p>
      )}
    </div>
  );
}
