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

import MiembroDetalle from "../pages/MiembroDetalle";
import ProtectedRoute from "../components/ProtectedRoute";




export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />}>
          <Route index element={<Navigate to="miembros" />} />

          <Route path="miembros" element={<Miembros />} />
          <Route path="iglesias" element={<Iglesias />} />
          <Route path="contactos" element={<Contactos />} />
          <Route path="clubes" element={<Clubes />} />
          <Route path="especialidades" element={<Especialidades />} />
          <Route path="clases-progresivas" element={<ClasesProgresivas />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="miembro/:id/*" element={<MiembroDetalle />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}