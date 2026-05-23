import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Ajustes from '../pages/Ajustes';
import GestionUsuarios from '../pages/GestionUsuarios';
import NuevoUsuario from '../pages/NuevoUsuario';
import EditarUsuario from '../pages/EditarUsuario';
import RecuperarContrasena from '../pages/RecuperarContrasena';
import RestablecerContrasena from '../pages/RestablecerContrasena';
import ProtectedRoute from './ProtectedRoute';
import DashboardGerente from '../pages/DashboardGerente';
import DashboardInventario from '../pages/placeholders/DashboardInventario';
import DashboardVentas from '../pages/placeholders/DashboardVentas';
import LandingPage from '../pages/LandingPage';
import Reportes from '../pages/Reportes';
import CatalogoProductos from '../pages/CatalogoProductos';
import HistorialCierres from '../pages/HistorialCierres';
import DetalleCierre from '../pages/DetalleCierre';


export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
        <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Rutas privadas — Administrador */}
        <Route element={<ProtectedRoute rolesPermitidos={['ADMINISTRADOR']} />}>
          <Route path="/dashboard/gerente" element={<DashboardGerente />} />
          <Route path="/usuarios" element={<GestionUsuarios />} />
          <Route path="/usuarios/nuevo" element={<NuevoUsuario />} />
          <Route path="/usuarios/:id/editar" element={<EditarUsuario />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/cierres-caja" element={<HistorialCierres />} />
          <Route path="/cierres-caja/:id" element={<DetalleCierre />} />
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
          <Route path="/catalogo" element={<CatalogoProductos />} />
        </Route>

        <Route path="/no-autorizado" element={<div className="p-8 text-sm text-muted">No tienes permiso para acceder a esta sección.</div>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
