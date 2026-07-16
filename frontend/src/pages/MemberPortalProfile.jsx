import { Routes, Route, Navigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';

import DatosPersonalesView from '../mvc/views/DatosPersonalesView';
import DatosMedicosView from '../mvc/views/DatosMedicosView';
import ContactosView from '../mvc/views/ContactosView';
import MiembroEspecialidadesView from '../mvc/views/MiembroEspecialidadesView';
import MiembroCargosView from '../mvc/views/MiembroCargosView';
import MiembroClasesView from '../mvc/views/MiembroClasesView';
import MiembroEventosView from '../mvc/views/MiembroEventosView';
import MiembroAsistenciaView from '../mvc/views/MiembroAsistenciaView';
import PortalProfileTabs from '../components/portal/PortalProfileTabs';

import {
  useMemberPortalDatosPersonalesController,
  useMemberPortalDatosMedicosController,
  useMemberPortalContactosController,
  useMemberPortalEspecialidadesController,
  useMemberPortalCargosController,
  useMemberPortalClasesController,
  useMemberPortalAsistenciaController,
} from '../mvc/controllers/useMemberPortalProfileTabControllers';
import { useMemberPortalEventosController } from '../mvc/controllers/useMemberPortalEventosController';

const PROFILE_TABS = [
  { path: 'datos', labelKey: 'tabData' },
  { path: 'datos-medicos', labelKey: 'tabMedicalData' },
  { path: 'contactos', labelKey: 'tabContacts' },
  { path: 'especialidades', labelKey: 'tabSpecialties' },
  { path: 'cargos', labelKey: 'tabCargos' },
  { path: 'clases', labelKey: 'tabClasses' },
  { path: 'eventos', labelKey: 'tabEvents' },
  { path: 'asistencia', labelKey: 'tabAttendance' },
];

function PortalDatosPersonales() {
  return <DatosPersonalesView {...useMemberPortalDatosPersonalesController()} />;
}

function PortalDatosMedicos() {
  return <DatosMedicosView {...useMemberPortalDatosMedicosController()} />;
}

function PortalContactos() {
  return <ContactosView {...useMemberPortalContactosController()} />;
}

function PortalEspecialidades() {
  return <MiembroEspecialidadesView {...useMemberPortalEspecialidadesController()} />;
}

function PortalCargos() {
  return <MiembroCargosView {...useMemberPortalCargosController()} />;
}

function PortalClases() {
  return <MiembroClasesView {...useMemberPortalClasesController()} />;
}

function PortalEventos() {
  return <MiembroEventosView {...useMemberPortalEventosController()} />;
}

function PortalAsistencia() {
  return <MiembroAsistenciaView {...useMemberPortalAsistenciaController()} />;
}

export default function MemberPortalProfile() {
  const { t } = useLanguage();

  return (
    <div className="portal-page">
      <div className="portal-page-header portal-page-header--hide-mobile">
        <h1>{t('portalProfileTitle')}</h1>
        <p>{t('portalProfileSubtitle')}</p>
      </div>

      <PortalProfileTabs tabs={PROFILE_TABS} />

      <div className="card portal-profile-card">
        <Routes>
          <Route index element={<Navigate to="datos" replace />} />
          <Route path="datos" element={<PortalDatosPersonales />} />
          <Route path="datos-medicos" element={<PortalDatosMedicos />} />
          <Route path="contactos" element={<PortalContactos />} />
          <Route path="especialidades" element={<PortalEspecialidades />} />
          <Route path="cargos" element={<PortalCargos />} />
          <Route path="clases" element={<PortalClases />} />
          <Route path="eventos" element={<PortalEventos />} />
          <Route path="asistencia" element={<PortalAsistencia />} />
          <Route path="carnet" element={<Navigate to="datos" replace />} />
        </Routes>
      </div>
    </div>
  );
}
