import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import '../styles/form.css';

import DatosPersonalesView from '../mvc/views/DatosPersonalesView';
import DatosMedicosView from '../mvc/views/DatosMedicosView';
import ContactosView from '../mvc/views/ContactosView';
import MiembroEspecialidadesView from '../mvc/views/MiembroEspecialidadesView';
import MiembroCargosView from '../mvc/views/MiembroCargosView';
import MiembroClasesView from '../mvc/views/MiembroClasesView';
import MiembroEventosView from '../mvc/views/MiembroEventosView';
import MiembroAsistenciaView from '../mvc/views/MiembroAsistenciaView';
import MiembroCarnetView from '../mvc/views/MiembroCarnetView';

import {
  useMemberPortalDatosPersonalesController,
  useMemberPortalDatosMedicosController,
  useMemberPortalContactosController,
  useMemberPortalEspecialidadesController,
  useMemberPortalCargosController,
  useMemberPortalClasesController,
  useMemberPortalAsistenciaController,
  useMemberPortalCarnetController,
} from '../mvc/controllers/useMemberPortalProfileTabControllers';
import { useMemberPortalEventosController } from '../mvc/controllers/useMemberPortalEventosController';

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

function PortalCarnet() {
  return <MiembroCarnetView {...useMemberPortalCarnetController()} />;
}

export default function MemberPortalProfile() {
  const { t } = useLanguage();

  return (
    <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ margin: '0 0 6px' }}>{t('portalProfileTitle')}</h1>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{t('portalProfileSubtitle')}</p>
      </div>

      <div className="tabs no-print">
        <Link to="datos">{t('tabData')}</Link>
        <Link to="datos-medicos">{t('tabMedicalData')}</Link>
        <Link to="contactos">{t('tabContacts')}</Link>
        <Link to="especialidades">{t('tabSpecialties')}</Link>
        <Link to="cargos">{t('tabCargos')}</Link>
        <Link to="clases">{t('tabClasses')}</Link>
        <Link to="eventos">{t('tabEvents')}</Link>
        <Link to="asistencia">{t('tabAttendance')}</Link>
        <Link to="carnet">{t('tabCarnet')}</Link>
      </div>

      <div className="card">
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
          <Route path="carnet" element={<PortalCarnet />} />
        </Routes>
      </div>
    </div>
  );
}
