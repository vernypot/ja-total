import { groupRequisitosBySeccion } from '../mvc/models/clases.model';

function sectionTitle(seccion) {
  const roman = seccion.numero_romano ? `${seccion.numero_romano}. ` : '';
  return `${roman}${seccion.nombre}`;
}

function RequisitoText({ req, t }) {
  return (
    <span>
      {req.numero != null && <strong>{req.numero}. </strong>}
        {req.descripcion}
        {req.texto_opcional?.trim() && (
          <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
            {req.texto_opcional}
          </span>
        )}
    </span>
  );
}

export default function ClaseRequisitosList({
  requisitos = [],
  secciones = [],
  t,
  canManage = false,
  onRemove,
  compact = false,
}) {
  const { grouped, ungrouped } = groupRequisitosBySeccion(requisitos, secciones);

  if (!grouped.length && !ungrouped.length) {
    return (
      <p style={{ margin: '8px 0', fontSize: compact ? '12px' : '13px', color: 'var(--color-text-muted)' }}>
        {t('noRequirements')}
      </p>
    );
  }

  let lastParte = null;
  const fontSize = compact ? '12px' : '13px';

  return (
    <div style={{ display: 'grid', gap: compact ? '10px' : '14px', marginTop: compact ? '6px' : '8px' }}>
      {grouped.map(({ seccion, requisitos: sectionReqs }) => {
        const showParte = seccion.parte && seccion.parte !== lastParte;
        lastParte = seccion.parte;
        return (
          <div key={seccion.id}>
            {showParte && (
              <div style={{
                fontSize: compact ? '11px' : '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: '#4338ca',
                marginBottom: '6px',
              }}>
                {seccion.parte === 'avanzado' ? t('classReqPartAdvanced') : t('classReqPartBasic')}
              </div>
            )}
            <div style={{ fontWeight: 600, fontSize: compact ? '12px' : '13px', color: '#374151', marginBottom: '4px' }}>
              {sectionTitle(seccion)}
            </div>
            <ol style={{ margin: 0, paddingLeft: '20px', fontSize, color: '#4b5563' }}>
              {sectionReqs.map(req => (
                <li key={req.id} style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <RequisitoText req={req} t={t} />
                  {canManage && onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(req.id)}
                      style={{ padding: '2px 8px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', flexShrink: 0 }}
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </div>
        );
      })}

      {ungrouped.length > 0 && (
        <ol style={{ margin: 0, paddingLeft: '20px', fontSize, color: '#4b5563' }}>
          {ungrouped.map(req => (
            <li key={req.id} style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <RequisitoText req={req} t={t} />
              {canManage && onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(req.id)}
                  style={{ padding: '2px 8px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', flexShrink: 0 }}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
