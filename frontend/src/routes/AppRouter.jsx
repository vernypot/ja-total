import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "../pages/Landing";
import Home from "../pages/Home";
import Noticias from "../pages/Noticias";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";

import Miembros from "../pages/Miembros";
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
import UserProfile from "../pages/UserProfile";

import MiembroDetalle from "../pages/MiembroDetalle";
import ProtectedRoute from "../components/ProtectedRoute";
import SuperAdminRoute from "../components/SuperAdminRoute";
import AdminRoute from "../components/AdminRoute";
import { DASHBOARD_HOME_PATH } from "../utils/dashboardRoutes";




export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />}>
          <Route index element={<Navigate to={DASHBOARD_HOME_PATH} replace />} />
          <Route path="home" element={<Home />} />
          <Route path="inicio" element={<Home />} />

          <Route path="noticias" element={<AdminRoute element={<Noticias />} />} />
          <Route path="miembros" element={<Miembros />} />
          <Route path="iglesias" element={<AdminRoute element={<Iglesias />} />} />
          <Route path="contactos" element={<Contactos />} />
          <Route path="clubes" element={<Clubes />} />
          <Route path="eventos" element={<Eventos />} />
          <Route path="calendario" element={<CalendarioClub />} />
          <Route path="planificacion" element={<AdminRoute element={<PlanificacionPeriodo />} />} />
          <Route path="tipos-evento" element={<AdminRoute element={<TiposEvento />} />} />
          <Route path="checkin" element={<AdminRoute element={<Checkin />} />} />
          <Route path="especialidades" element={<SuperAdminRoute element={<Especialidades />} />} />
          <Route path="clases-progresivas" element={<SuperAdminRoute element={<ClasesProgresivas />} />} />
          <Route path="usuarios" element={<SuperAdminRoute element={<Usuarios />} />} />
          <Route path="label-settings" element={<SuperAdminRoute element={<LabelSettings />} />} />
          <Route path="advanced-settings" element={<SuperAdminRoute element={<AdvancedSettings />} />} />
          <Route path="landing-cms" element={<SuperAdminRoute element={<LandingCms />} />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="miembro/:id/*" element={<MiembroDetalle />} />

          <Route path="*" element={<Navigate to={DASHBOARD_HOME_PATH} replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
