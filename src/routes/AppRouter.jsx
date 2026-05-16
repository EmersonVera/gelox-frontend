import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Ajustes from '../pages/Ajustes';
import ProtectedRoute from './ProtectedRoute';
import DashboardGerente from '../pages/placeholders/DashboardGerente';
import DashboardInventario from '../pages/placeholders/DashboardInventario';
import DashboardVentas from '../pages/placeholders/DashboardVentas';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/dashboard/gerente"
          element={
            <ProtectedRoute rolesPermitidos={['ADMINISTRADOR']}>
              <DashboardGerente />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/inventario"
          element={
            <ProtectedRoute rolesPermitidos={['ENCARGADO_INVENTARIO']}>
              <DashboardInventario />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/ventas"
          element={
            <ProtectedRoute rolesPermitidos={['ENCARGADO_VENTAS']}>
              <DashboardVentas />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ajustes"
          element={
            <ProtectedRoute rolesPermitidos={['ADMINISTRADOR', 'ENCARGADO_INVENTARIO', 'ENCARGADO_VENTAS']}>
              <Ajustes />
            </ProtectedRoute>
          }
        />

        <Route path="/no-autorizado" element={<div style={{padding:'2rem'}}>No tienes permiso para acceder a esta sección.</div>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
