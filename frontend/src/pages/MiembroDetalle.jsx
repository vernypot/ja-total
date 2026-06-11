import { useParams, Routes, Route, Link, Navigate } from 'react-router-dom';

import DatosPersonales from './miembro/tabs/DatosPersonales';
import Contactos from './Contactos';
import Especialidades from './Especialidades';
import Clases from './ClasesProgresivas';

export default function MiembroDetalle() {
  const { id } = useParams();

  return (
    <div>
      <h2>Detalle del Miembro</h2>

      <div className="tabs">
        <Link to="datos">Datos</Link>
        <Link to="contactos">Contactos</Link>
        <Link to="especialidades">Especialidades</Link>
        <Link to="clases">Clases</Link>
      </div>

      <div className="card">
        <Routes>
          <Route index element={<Navigate to="datos" />} />
          <Route path="datos" element={<DatosPersonales miembroId={id} />} />
          <Route path="contactos" element={<Contactos miembroId={id} />} />
          <Route path="especialidades" element={<Especialidades miembroId={id} />} />
          <Route path="clases" element={<Clases miembroId={id} />} />
        </Routes>
      </div>
    </div>
  );
}
