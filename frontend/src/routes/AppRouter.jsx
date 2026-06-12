import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";

import Miembros from "../pages/Miembros";
import Iglesias from "../pages/Iglesias";
import Clubes from "../pages/Clubes";
import Contactos from "../pages/Contactos";
import Especialidades from "../pages/Especialidades";
import ClasesProgresivas from "../pages/ClasesProgresivas";
import Usuarios from "../pages/Usuarios";
import LabelSettings from "../pages/LabelSettings";
import AdvancedSettings from "../pages/AdvancedSettings";
import UserProfile from "../pages/UserProfile";

import MiembroDetalle from "../pages/MiembroDetalle";
import ProtectedRoute from "../components/ProtectedRoute";
import SuperAdminRoute from "../components/SuperAdminRoute";
import AdminRoute from "../components/AdminRoute";




export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />}>
          <Route index element={<Navigate to="miembros" />} />

          <Route path="miembros" element={<Miembros />} />
          <Route path="iglesias" element={<AdminRoute element={<Iglesias />} />} />
          <Route path="contactos" element={<Contactos />} />
          <Route path="clubes" element={<Clubes />} />
          <Route path="especialidades" element={<SuperAdminRoute element={<Especialidades />} />} />
          <Route path="clases-progresivas" element={<SuperAdminRoute element={<ClasesProgresivas />} />} />
          <Route path="usuarios" element={<SuperAdminRoute element={<Usuarios />} />} />
          <Route path="label-settings" element={<SuperAdminRoute element={<LabelSettings />} />} />
          <Route path="advanced-settings" element={<SuperAdminRoute element={<AdvancedSettings />} />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="miembro/:id/*" element={<MiembroDetalle />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}
