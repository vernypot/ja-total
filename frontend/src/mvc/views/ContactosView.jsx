export default function ContactosView({ data, error }) {
  return (
    <div>
      <h2>Contactos</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {data.length === 0 ? (
        <p>No hay contactos registrados</p>
      ) : (
        data.map(contacto => (
          <div key={contacto.id}>
            {contacto.tipo}: {contacto.valor}
          </div>
        ))
      )}
    </div>
  );
}
