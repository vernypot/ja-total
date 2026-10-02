import { memberDisplayName } from '../utils/memberDisplayName';
import { estadoLabel } from '../i18n/helpers';

export default function NoticiaReadersPanel({
  open,
  loading,
  error,
  readers,
  t,
  formatReaderDate,
  memberDisplayNameFn = memberDisplayName,
}) {
  if (!open) return null;

  return (
    <div className="noticia-readers-panel">
      <div className="noticia-readers-panel__head">
        <h4>{t('noticiasReadersTitle')}</h4>
        <p className="noticia-field-hint">{t('noticiasReadersHint')}</p>
      </div>

      {loading && <p className="noticia-readers-panel__status">{t('loading')}</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && readers.length === 0 && (
        <p className="noticia-readers-panel__status">{t('noticiasReadersEmpty')}</p>
      )}

      {!loading && !error && readers.length > 0 && (
        <div className="noticia-readers-table-wrap">
          <table className="noticia-readers-table">
            <thead>
              <tr>
                <th>{t('clubDirectivaMember')}</th>
                <th>{t('status')}</th>
                <th>{t('noticiasReadersReadAt')}</th>
              </tr>
            </thead>
            <tbody>
              {readers.map(row => (
                <tr key={row.miembro_id}>
                  <td>{memberDisplayNameFn(row.miembros)}</td>
                  <td>{estadoLabel(row.estado || row.miembros?.estado || 'activo', t)}</td>
                  <td>{formatReaderDate(row.leido_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
