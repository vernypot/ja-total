export default function UnidadValidationStartPanel({
  unidades,
  evalSchemaAvailable,
  savingValidationStartId,
  onSaveValidationStart,
  formatValidationStartDate,
  language,
  t,
}) {
  if (!unidades.length) return null;

  return (
    <div className="card unidades-eval-card">
      <h2 className="unidades-eval-title">{t('unidadEvalValidationStartTitle')}</h2>
      <p className="unidades-eval-section-hint">{t('unidadEvalValidationStartHint')}</p>
      <div className="unidades-table-wrap">
        <table className="unidades-table unidades-eval-validation-table">
          <thead>
            <tr>
              <th>{t('unidadName')}</th>
              <th>{t('unidadEvalValidationStartCol')}</th>
              <th>{t('unidadEvalValidationStartCurrent')}</th>
            </tr>
          </thead>
          <tbody>
            {unidades.map(unidad => {
              const dateValue = unidad.evaluacion_inicio_fecha?.slice?.(0, 10) || '';
              return (
                <tr key={unidad.id}>
                  <td><strong>{unidad.nombre}</strong></td>
                  <td>
                    <input
                      type="date"
                      className="form-input unidades-eval-validation-date"
                      defaultValue={dateValue}
                      disabled={!evalSchemaAvailable || savingValidationStartId === unidad.id}
                      onBlur={e => {
                        const next = e.target.value || null;
                        const current = dateValue || null;
                        if (next !== current) {
                          onSaveValidationStart(unidad.id, next);
                        }
                      }}
                    />
                  </td>
                  <td>
                    {formatValidationStartDate(unidad.evaluacion_inicio_fecha, language)
                      || t('unidadEvalValidationStartAll')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
