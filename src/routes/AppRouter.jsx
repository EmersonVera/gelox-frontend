import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Ajustes from '../pages/Ajustes';
import GestionUsuarios from '../pages/GestionUsuarios';
import NuevoUsuario from '../pages/NuevoUsuario';
import EditarUsuario from '../pages/EditarUsuario';
import RecuperarContrasena from '../pages/RecuperarContrasena';
import ProtectedRoute from './ProtectedRoute';
import DashboardGerente from '../pages/placeholders/DashboardGerente';
import DashboardInventario from '../pages/placeholders/DashboardInventario';
import DashboardVentas from '../pages/placeholders/DashboardVentas';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Rutas privadas — Administrador */}
        <Route element={<ProtectedRoute rolesPermitidos={['ADMINISTRADOR']} />}>
          <Route path="/dashboard/gerente" element={<DashboardGerente />} />
          <Route path="/usuarios" element={<GestionUsuarios />} />
          <Route path="/usuarios/nuevo" element={<NuevoUsuario />} />
          <Route path="/usuarios/:id/editar" element={<EditarUsuario />} />
        </Route>

        {/* Rutas privadas — Encargado Inventario */}
        <Route element={<ProtectedRoute rolesPermitidos={['ENCARGADO_INVENTARIO']} />}>
          <Route path="/dashboard/inventario" element={<DashboardInventario />} />
        </Route>

        {/* Rutas privadas — Encargado Ventas */}
        <Route element={<ProtectedRoute rolesPermitidos={['ENCARGADO_VENTAS']} />}>
          <Route path="/dashboard/ventas" element={<DashboardVentas />} />
        </Route>

        {/* Rutas privadas — Todos los roles */}
        <Route element={<ProtectedRoute rolesPermitidos={['ADMINISTRADOR', 'ENCARGADO_INVENTARIO', 'ENCARGADO_VENTAS']} />}>
          <Route path="/ajustes" element={<Ajustes />} />
        </Route>

        <Route path="/no-autorizado" element={<div className="p-8 text-sm text-muted">No tienes permiso para acceder a esta sección.</div>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
