import { useLanguage } from '../../hooks/useLanguage';

export default function EspecialidadesView({ data, error }) {
  const { t } = useLanguage();

  return (
    <div>
      <h2>{t('specialties')}</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {data.length === 0 ? (
        <p>{t('noSpecialties')}</p>
      ) : (
        data.map(e => (
          <div key={e.id}>{e.especialidad_id}</div>
        ))
      )}
    </div>
  );
}
