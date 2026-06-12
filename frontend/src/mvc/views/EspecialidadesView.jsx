export default function EspecialidadesView({ data, error }) {
  return (
    <div>
      <h2>Especialidades</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {data.length === 0 ? (
        <p>No hay especialidades registradas</p>
      ) : (
        data.map(e => (
          <div key={e.id}>{e.especialidad_id}</div>
        ))
      )}
    </div>
  );
}
