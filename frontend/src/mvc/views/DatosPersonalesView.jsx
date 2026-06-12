export default function DatosPersonalesView({ data, error, loading, calcularEdad }) {
  if (loading) return <div className="loading">Cargando datos...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <div className="text-muted">No member data found</div>;

  const nombreCompleto = [data.nombre, data.apellido1, data.apellido2].filter(Boolean).join(' ');

  return (
    <div style={{ padding: '20px' }}>
      <div style={{
        display: 'flex',
        gap: '20px',
        alignItems: 'flex-start',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px'
      }}>
        {data.foto_url && (
          <img 
            src={data.foto_url} 
            alt="foto" 
            style={{
              width: '120px',
              height: '120px',
              objectFit: 'cover',
              borderRadius: '8px',
              border: '2px solid #e5e7eb'
            }}
          />
        )}
        <div>
          <h2 style={{ margin: '0 0 10px 0' }}>{nombreCompleto}</h2>
          <p style={{ margin: '5px 0', color: '#666' }}>
            {data.fecha_nacimiento && `${calcularEdad(data.fecha_nacimiento)} • ${data.fecha_nacimiento}`}
          </p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        <div style={{ padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <strong style={{ display: 'block', marginBottom: '5px', color: '#2563eb' }}>Nombre</strong>
          <div>{data.nombre}</div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <strong style={{ display: 'block', marginBottom: '5px', color: '#2563eb' }}>Apellido 1</strong>
          <div>{data.apellido1 || '-'}</div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <strong style={{ display: 'block', marginBottom: '5px', color: '#2563eb' }}>Apellido 2</strong>
          <div>{data.apellido2 || '-'}</div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <strong style={{ display: 'block', marginBottom: '5px', color: '#2563eb' }}>Fecha de Nacimiento</strong>
          <div>{data.fecha_nacimiento || '-'}</div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <strong style={{ display: 'block', marginBottom: '5px', color: '#2563eb' }}>Género</strong>
          <div>{data.genero || '-'}</div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <strong style={{ display: 'block', marginBottom: '5px', color: '#2563eb' }}>Documento</strong>
          <div>{data.documento || '-'}</div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <strong style={{ display: 'block', marginBottom: '5px', color: '#2563eb' }}>Teléfono</strong>
          <div>{data.telefono || '-'}</div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <strong style={{ display: 'block', marginBottom: '5px', color: '#2563eb' }}>Celular</strong>
          <div>{data.celular || '-'}</div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <strong style={{ display: 'block', marginBottom: '5px', color: '#2563eb' }}>Ciudad</strong>
          <div>{data.ciudad || '-'}</div>
        </div>

        <div style={{ gridColumn: '1 / -1', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <strong style={{ display: 'block', marginBottom: '5px', color: '#2563eb' }}>Dirección</strong>
          <div>{data.direccion || '-'}</div>
        </div>
      </div>
    </div>
  );
}
