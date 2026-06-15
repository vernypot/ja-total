import { useParams, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';

import DatosPersonales from './miembro/tabs/DatosPersonales';
import DatosMedicos from './miembro/tabs/DatosMedicos';
import Contactos from './Contactos';
import Especialidades from './Especialidades';
import Clases from './Clases';
import MiembroEventos from './miembro/tabs/Eventos';
import Asistencia from './miembro/tabs/Asistencia';
import Carnet from './miembro/tabs/Carnet';

export default function MiembroDetalle() {
  const { id } = useParams();
  const { t } = useLanguage();
  const isNew = id === 'new';

  return (
    <div>
      <h2 className="no-print">{isNew ? t('newMember') : t('memberDetail')}</h2>

      <div className="tabs no-print">
        <Link to="datos">{t('tabData')}</Link>
        {!isNew && (
          <>
            <Link to="datos-medicos">{t('tabMedicalData')}</Link>
            <Link to="contactos">{t('tabContacts')}</Link>
            <Link to="especialidades">{t('tabSpecialties')}</Link>
            <Link to="clases">{t('tabClasses')}</Link>
            <Link to="eventos">{t('tabEvents')}</Link>
            <Link to="asistencia">{t('tabAttendance')}</Link>
            <Link to="carnet">{t('tabCarnet')}</Link>
          </>
        )}
      </div>

      <div className="card">
        <Routes>
          <Route index element={<Navigate to="datos" />} />
          <Route path="datos" element={<DatosPersonales miembroId={id} />} />
          <Route path="datos-medicos" element={<DatosMedicos miembroId={id} />} />
          <Route path="contactos" element={<Contactos miembroId={id} />} />
          <Route path="especialidades" element={<Especialidades miembroId={id} />} />
          <Route path="clases" element={<Clases miembroId={id} />} />
          <Route path="eventos" element={<MiembroEventos miembroId={id} />} />
          <Route path="asistencia" element={<Asistencia miembroId={id} />} />
          <Route path="carnet" element={<Carnet miembroId={id} />} />
        </Routes>
      </div>
    </div>
  );
}
