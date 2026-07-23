import { useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { getPortalProfileDefaultTab } from '../utils/dashboardRoutes';

import DatosPersonalesView from '../mvc/views/DatosPersonalesView';
import ContactosView from '../mvc/views/ContactosView';
import MiembroEspecialidadesView from '../mvc/views/MiembroEspecialidadesView';
import MiembroClasesView from '../mvc/views/MiembroClasesView';
import MiembroEventosView from '../mvc/views/MiembroEventosView';
import MiembroAsistenciaView from '../mvc/views/MiembroAsistenciaView';
import PortalRegistroView from '../mvc/views/PortalRegistroView';
import PortalProfileTabs from '../components/portal/PortalProfileTabs';
import MemberPortalHome from './MemberPortalHome';

import {
  useMemberPortalDatosPersonalesController,
  useMemberPortalDatosMedicosController,
  useMemberPortalContactosController,
  useMemberPortalEspecialidadesController,
  useMemberPortalCargosController,
  useMemberPortalClasesController,
  useMemberPortalAsistenciaController,
  useMemberPortalDistincionesController,
} from '../mvc/controllers/useMemberPortalProfileTabControllers';
import { useMemberPortalEventosController } from '../mvc/controllers/useMemberPortalEventosController';

const MOBILE_HOME_TAB = { path: 'inicio', labelKey: 'portalNavHome' };

const PROFILE_TABS = [
  { path: 'eventos', labelKey: 'tabEvents' },
  { path: 'asistencia', labelKey: 'tabAttendance' },
  { path: 'clases', labelKey: 'tabProgressiveClasses' },
  { path: 'especialidades', labelKey: 'tabSpecialties' },
  { path: 'registro', labelKey: 'tabRegistro' },
  { path: 'datos', labelKey: 'tabData' },
  { path: 'contactos', labelKey: 'tabContacts' },
];

function ProfileIndexRedirect() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  return <Navigate to={getPortalProfileDefaultTab(isMobile)} replace />;
}

function PortalDatosPersonales() {
  return <DatosPersonalesView {...useMemberPortalDatosPersonalesController()} />;
}

function PortalContactos() {
  return <ContactosView {...useMemberPortalContactosController()} />;
}

function PortalEspecialidades() {
  return <MiembroEspecialidadesView {...useMemberPortalEspecialidadesController()} />;
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

function PortalInicio() {
  return <MemberPortalHome embedded />;
}

function PortalRegistro() {
  return (
    <PortalRegistroView
      medicalProps={useMemberPortalDatosMedicosController()}
      distincionesProps={useMemberPortalDistincionesController()}
      cargosProps={useMemberPortalCargosController()}
    />
  );
}

export default function MemberPortalProfile() {
  const { t } = useLanguage();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const profileTabs = useMemo(
    () => (isMobile ? [MOBILE_HOME_TAB, ...PROFILE_TABS] : PROFILE_TABS),
    [isMobile]
  );
  const defaultTab = getPortalProfileDefaultTab(isMobile);

  return (
    <div className="portal-page portal-page--profile">
      <div className="portal-page-header portal-page-header--hide-mobile">
        <h1>{t('portalProfileTitle')}</h1>
        <p>{t('portalProfileSubtitle')}</p>
      </div>

      <PortalProfileTabs tabs={profileTabs} defaultTab={defaultTab} />

      <div className="card portal-profile-card">
        <Routes>
          <Route index element={<ProfileIndexRedirect />} />
          {isMobile ? (
            <Route path="inicio" element={<PortalInicio />} />
          ) : (
            <Route path="inicio" element={<Navigate to="eventos" replace />} />
          )}
          <Route path="eventos" element={<PortalEventos />} />
          <Route path="asistencia" element={<PortalAsistencia />} />
          <Route path="clases" element={<PortalClases />} />
          <Route path="especialidades" element={<PortalEspecialidades />} />
          <Route path="registro" element={<PortalRegistro />} />
          <Route path="datos" element={<PortalDatosPersonales />} />
          <Route path="contactos" element={<PortalContactos />} />
          <Route path="datos-medicos" element={<Navigate to="../registro" replace />} />
          <Route path="cargos" element={<Navigate to="../registro" replace />} />
          <Route path="carnet" element={<Navigate to="datos" replace />} />
        </Routes>
      </div>
    </div>
  );
}
