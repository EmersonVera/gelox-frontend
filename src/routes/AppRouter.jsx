import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
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

        {/* Rutas privadas por rol */}
        <Route element={<ProtectedRoute rolesPermitidos={['ADMINISTRADOR']} />}>
          <Route path="/dashboard/gerente" element={<DashboardGerente />} />
        </Route>

        <Route element={<ProtectedRoute rolesPermitidos={['ENCARGADO_INVENTARIO']} />}>
          <Route path="/dashboard/inventario" element={<DashboardInventario />} />
        </Route>

        <Route element={<ProtectedRoute rolesPermitidos={['ENCARGADO_VENTAS']} />}>
          <Route path="/dashboard/ventas" element={<DashboardVentas />} />
        </Route>

        <Route path="/no-autorizado" element={<div style={{ padding: '2rem' }}>No tienes permiso para acceder a esta sección.</div>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
