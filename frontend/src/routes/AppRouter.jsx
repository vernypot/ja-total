import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "../pages/Landing";
import Home from "../pages/Home";
import Login from "../pages/Login";
import ResetPassword from "../pages/ResetPassword";
import RecoveryRedirect from "../components/RecoveryRedirect";
import Dashboard from "../pages/Dashboard";

import Miembros from "../pages/Miembros";
import Unidades from "../pages/Unidades";
import BloquesCompletados from "../pages/BloquesCompletados";
import Iglesias from "../pages/Iglesias";
import Clubes from "../pages/Clubes";
import Eventos from "../pages/Eventos";
import TiposEvento from "../pages/TiposEvento";
import Checkin from "../pages/Checkin";
import Contactos from "../pages/Contactos";
import Especialidades from "../pages/Especialidades";
import ClasesProgresivas from "../pages/ClasesProgresivas";
import Usuarios from "../pages/Usuarios";
import LabelSettings from "../pages/LabelSettings";
import AdvancedSettings from "../pages/AdvancedSettings";
import PlanificacionPeriodo from "../pages/PlanificacionPeriodo";
import CalendarioClub from "../pages/CalendarioClub";
import LandingCms from "../pages/LandingCms";
import SystemModules from "../pages/SystemModules";
import EstructuraOrganizacional from "../pages/EstructuraOrganizacional";
import PageHelpAdmin from "../pages/PageHelpAdmin";
import SiteContent from "../pages/SiteContent";
import UserProfile from "../pages/UserProfile";

import MiembroDetalle from "../pages/MiembroDetalle";
import Cargos from "../pages/Cargos";
import ClubDirectiva from "../pages/ClubDirectiva";
import ClubCarnetsPrint from "../pages/ClubCarnetsPrint";
import MemberPortalLogin from "../pages/MemberPortalLogin";
import MemberPortalHome from "../pages/MemberPortalHome";
import MemberPortalProfile from "../pages/MemberPortalProfile";
import MemberPortalEventos from "../pages/MemberPortalEventos";
import MemberPortalCalendario from "../pages/MemberPortalCalendario";
import ProtectedRoute from "../components/ProtectedRoute";
import StaffOnlyRoute from "../components/StaffOnlyRoute";
import PortalOrStaffPage from "../components/PortalOrStaffPage";
import NoticiasRoute from "../components/NoticiasRoute";
import SuperAdminRoute from "../components/SuperAdminRoute";
import AdminRoute from "../components/AdminRoute";
import { DASHBOARD_HOME_PATH } from "../utils/dashboardRoutes";




export default function AppRouter() {
  return (
    <BrowserRouter>
      <RecoveryRedirect />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/modulos" element={<SystemModules />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/portal" element={<MemberPortalLogin />} />
        <Route path="/portal/inicio" element={<Navigate to={DASHBOARD_HOME_PATH} replace />} />
        <Route path="/portal/perfil" element={<Navigate to="/dashboard/profile" replace />} />
        <Route path="/portal/noticias" element={<Navigate to="/dashboard/noticias" replace />} />
        <Route path="/portal/eventos" element={<Navigate to="/dashboard/eventos" replace />} />
        <Route path="/portal/calendario" element={<Navigate to="/dashboard/calendario" replace />} />

        <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />}>
          <Route index element={<Navigate to={DASHBOARD_HOME_PATH} replace />} />
          <Route
            path="home"
            element={<PortalOrStaffPage portal={MemberPortalHome} staff={Home} />}
          />
          <Route
            path="inicio"
            element={<PortalOrStaffPage portal={MemberPortalHome} staff={Home} />}
          />

          <Route path="noticias" element={<NoticiasRoute />} />
          <Route path="miembros" element={<StaffOnlyRoute element={<Miembros />} />} />
          <Route
            path="unidades"
            element={<StaffOnlyRoute element={<AdminRoute element={<Unidades />} />} />}
          />
          <Route
            path="bloques-completados"
            element={<StaffOnlyRoute element={<AdminRoute element={<BloquesCompletados />} />} />}
          />
          <Route path="iglesias" element={<StaffOnlyRoute element={<AdminRoute element={<Iglesias />} />} />} />
          <Route path="estructura" element={<StaffOnlyRoute element={<SuperAdminRoute element={<EstructuraOrganizacional />} />} />} />
          <Route path="contactos" element={<StaffOnlyRoute element={<Contactos />} />} />
          <Route path="clubes" element={<StaffOnlyRoute element={<Clubes />} />} />
          <Route path="club-directiva" element={<StaffOnlyRoute element={<ClubDirectiva />} />} />
          <Route
            path="eventos"
            element={<PortalOrStaffPage portal={MemberPortalEventos} staff={Eventos} />}
          />
          <Route
            path="calendario"
            element={<PortalOrStaffPage portal={MemberPortalCalendario} staff={CalendarioClub} />}
          />
          <Route path="planificacion" element={<StaffOnlyRoute element={<AdminRoute element={<PlanificacionPeriodo />} />} />} />
          <Route path="tipos-evento" element={<StaffOnlyRoute element={<AdminRoute element={<TiposEvento />} />} />} />
          <Route path="checkin" element={<StaffOnlyRoute element={<AdminRoute element={<Checkin />} />} />} />
          <Route path="carnets-club" element={<StaffOnlyRoute element={<AdminRoute element={<ClubCarnetsPrint />} />} />} />
          <Route path="especialidades" element={<StaffOnlyRoute element={<SuperAdminRoute element={<Especialidades />} />} />} />
          <Route path="cargos" element={<StaffOnlyRoute element={<SuperAdminRoute element={<Cargos />} />} />} />
          <Route path="clases-progresivas" element={<StaffOnlyRoute element={<SuperAdminRoute element={<ClasesProgresivas />} />} />} />
          <Route path="usuarios" element={<StaffOnlyRoute element={<SuperAdminRoute element={<Usuarios />} />} />} />
          <Route path="label-settings" element={<StaffOnlyRoute element={<SuperAdminRoute element={<LabelSettings />} />} />} />
          <Route path="advanced-settings" element={<StaffOnlyRoute element={<SuperAdminRoute element={<AdvancedSettings />} />} />} />
          <Route path="landing-cms" element={<StaffOnlyRoute element={<SuperAdminRoute element={<LandingCms />} />} />} />
          <Route path="site-content" element={<StaffOnlyRoute element={<SuperAdminRoute element={<SiteContent />} />} />} />
          <Route path="page-help" element={<StaffOnlyRoute element={<SuperAdminRoute element={<PageHelpAdmin />} />} />} />
          <Route
            path="profile/*"
            element={<PortalOrStaffPage portal={MemberPortalProfile} staff={UserProfile} />}
          />
          <Route path="miembro/:id/*" element={<StaffOnlyRoute element={<MiembroDetalle />} />} />

          <Route path="*" element={<Navigate to={DASHBOARD_HOME_PATH} replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
