import { Navigate } from 'react-router-dom';

export default function MiembroEventos({ miembroId }) {
  return <Navigate to={`/dashboard/miembro/${miembroId}/asistencia`} replace />;
}
