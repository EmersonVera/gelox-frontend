import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

/* ── Públicas ── */
import Login                 from '../pages/Login';
import RecuperarContrasena   from '../pages/RecuperarContrasena';
import RestablecerContrasena from '../pages/RestablecerContrasena';
import LandingPage           from '../pages/LandingPage';

/* ── Compartidas ── */
import Ajustes           from '../pages/Ajustes';

/* ── Módulo Comerciantes ── */
import MisComerciantess from '../pages/MisComerciantess';

/* ── Módulo Administrador ── */
import DashboardGerente from '../pages/administrador/DashboardGerente';
import GestionUsuarios  from '../pages/administrador/GestionUsuarios';
import NuevoUsuario     from '../pages/administrador/NuevoUsuario';
import EditarUsuario    from '../pages/administrador/EditarUsuario';
import Reportes         from '../pages/administrador/Reportes';
import HistorialCierres from '../pages/administrador/HistorialCierres';
import DetalleCierre    from '../pages/administrador/DetalleCierre';

/* ── Módulo Ventas ── */
import PedidoVentanilla      from '../pages/ventas/PedidoVentanilla';
import PedidoRural     from '../pages/ventas/PedidoRural';

/* ── Módulo Inventarios ── */
import GestionInventarios from '../pages/inventarios/GestionInventarios';
import RegistroMerma      from '../pages/inventarios/RegistroMerma';
import RegistroEntrada    from '../pages/inventarios/RegistroEntrada';
import GenerarPedido      from '../pages/inventarios/GenerarPedido';
import ReportePedido      from '../pages/inventarios/ReportePedido';
import DetallePedido      from '../pages/inventarios/DetallePedido';
import CatalogoProductos  from '../pages/inventarios/CatalogoProductos';

/* ── Protección de rutas ── */
import ProtectedRoute from './ProtectedRoute';

/* ── Placeholder genérico para módulos en construcción ── */
import AppLayout from '../components/AppLayout';
function EnConstruccion({ modulo }) {
  return (
    <AppLayout>
      <div className="max-w-lg mx-auto mt-16 text-center space-y-4">
        <div className="text-4xl">🚧</div>
        <h1 className="font-display text-xl font-bold text-zinc-900">{modulo}</h1>
        <p className="text-sm text-zinc-500 font-inter">
          Este módulo está en desarrollo y estará disponible próximamente.
        </p>
      </div>
    </AppLayout>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ══ Rutas públicas ══ */}
        <Route path="/login"                  element={<Login />} />
        <Route path="/recuperar-contrasena"   element={<RecuperarContrasena />} />
        <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />
        <Route path="/landing"                element={<LandingPage />} />
        <Route path="/"                       element={<Navigate to="/login" replace />} />

        {/* ══ Solo Administrador ══ */}
        <Route element={<ProtectedRoute rolesPermitidos={['ADMINISTRADOR']} />}>
          <Route path="/dashboard/gerente"       element={<DashboardGerente />} />
          <Route path="/usuarios"                element={<GestionUsuarios />} />
          <Route path="/usuarios/nuevo"          element={<NuevoUsuario />} />
          <Route path="/usuarios/:id/editar"     element={<EditarUsuario />} />
          <Route path="/reportes"                element={<Reportes />} />
          <Route path="/cierres-caja"            element={<HistorialCierres />} />
          <Route path="/cierres-caja/:id"        element={<DetalleCierre />} />
          {/* Ajustes del admin — mantiene SidebarAdministrador */}
          <Route path="/ajustes"                 element={<Ajustes />} />
        </Route>

        {/* ══ Módulo Inventarios (Administrador + Encargado de Inventario) ══ */}
        <Route element={<ProtectedRoute rolesPermitidos={['ADMINISTRADOR', 'ENCARGADO_INVENTARIO']} />}>
          <Route path="/inventarios"                 element={<Navigate to="/inventarios/gestion" replace />} />
          <Route path="/inventarios/gestion"         element={<GestionInventarios />} />
          <Route path="/inventarios/merma"           element={<RegistroMerma />} />
          <Route path="/inventarios/entrada"         element={<RegistroEntrada />} />
          <Route path="/inventarios/catalogo"        element={<CatalogoProductos />} />
          <Route path="/inventarios/generar-pedido"  element={<GenerarPedido />} />
          <Route path="/inventarios/reporte-pedido"  element={<ReportePedido />} />
          <Route path="/inventarios/pedidos/:id"     element={<DetallePedido />} />
          {/* Ajustes del módulo inventarios — mantiene SidebarInventarios */}
          <Route path="/inventarios/ajustes"         element={<Ajustes />} />
        </Route>

        {/* ══ Módulo Ventas (Administrador + Encargado de Ventas) ══ */}
        <Route element={<ProtectedRoute rolesPermitidos={['ADMINISTRADOR', 'ENCARGADO_VENTAS']} />}>
          <Route path="/ventas"                  element={<Navigate to="/ventas/pedido-ventanilla" replace />} />
          <Route path="/ventas/pedidos-rurales"  element={<PedidoRural />} />
          <Route path="/ventas/pedidos-ventanilla" element={<PedidoVentanilla />} />
          <Route path="/ventas/reportes"         element={<EnConstruccion modulo="Reportes de Ventas" />} />
          <Route path="/ventas/comerciantes"     element={<MisComerciantess />} />
          {/* Ajustes del módulo ventas — mantiene SidebarVentas */}
          <Route path="/ventas/ajustes"          element={<Ajustes />} />
        </Route>

        {/* ══ Fallbacks ══ */}
        <Route
          path="/no-autorizado"
          element={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center space-y-3">
                <div className="text-4xl">🚫</div>
                <p className="font-display text-lg font-bold text-zinc-900">Acceso denegado</p>
                <p className="text-sm text-zinc-500 font-inter">No tienes permiso para acceder a esta sección.</p>
              </div>
            </div>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
