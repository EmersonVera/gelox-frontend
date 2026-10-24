import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

/* ── Públicas ── */
import Login                 from '../pages/Login';
import RecuperarContrasena   from '../pages/RecuperarContrasena';
import RestablecerContrasena from '../pages/RestablecerContrasena';
import LandingPage           from '../pages/LandingPage';
import DistribuidoraBloqueada from '../pages/DistribuidoraBloqueada';

/* ── Compartidas ── */
import Ajustes           from '../pages/components/Ajustes';

/* ── Módulo Ventas ── */
import MisComerciantess        from '../pages/ventas/MisComerciantess';
import InformacionComerciante  from '../pages/ventas/InformacionComerciante';
import PlanillaDetalle         from '../pages/ventas/PlanillaDetalle';
import ReporteVentasDia  from '../pages/ventas/ReporteVentasDia';

/* ── Módulo Administrador ── */
import DashboardGerente from '../pages/administrador/DashboardGerente';
import GestionUsuarios  from '../pages/administrador/GestionUsuarios';
import NuevoUsuario     from '../pages/administrador/NuevoUsuario';
import EditarUsuario    from '../pages/administrador/EditarUsuario';
import Reportes         from '../pages/administrador/Reportes';
import HistorialCierres from '../pages/administrador/HistorialCierres';
import DetalleCierre    from '../pages/administrador/DetalleCierre';
import IdentidadVisual  from '../pages/administrador/IdentidadVisual';

/* ── Módulo Ventas ── */
import PedidoVentanilla from '../pages/ventas/PedidoVentanilla';
import PedidoRural      from '../pages/ventas/PedidoRural';
import PlanillaDiaria   from '../pages/ventas/PlanillaDiaria';

/* ── Módulo Inventarios ── */
import GestionInventarios from '../pages/inventarios/GestionInventarios';
import RegistroMerma      from '../pages/inventarios/RegistroMerma';
import RegistroEntrada    from '../pages/inventarios/RegistroEntrada';
import GenerarPedido      from '../pages/inventarios/GenerarPedido';
import ReportePedido      from '../pages/inventarios/ReportePedido';
import DetallePedido      from '../pages/inventarios/DetallePedido';
import CatalogoProductos  from '../pages/inventarios/CatalogoProductos';
import RecomendacionCompras     from '../pages/inventarios/RecomendacionCompras';
import HistorialRecomendaciones from '../pages/inventarios/HistorialRecomendaciones';

/* ── Plataforma (Superadministrador) ── */
import Distribuidoras       from '../pages/plataforma/Distribuidoras';
import NuevaDistribuidora   from '../pages/plataforma/NuevaDistribuidora';
import DetalleDistribuidora from '../pages/plataforma/DetalleDistribuidora';

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
        <Route path="/distribuidora-bloqueada" element={<DistribuidoraBloqueada />} />
        <Route path="/tienda/:subdominio"     element={<LandingPage />} />
        <Route path="/"                       element={<Navigate to="/login" replace />} />

        {/* ══ Plataforma — solo Superadministrador (RF58, RF59) ══ */}
        <Route element={<ProtectedRoute rolesPermitidos={['SUPERADMINISTRADOR']} />}>
          <Route path="/plataforma"                      element={<Navigate to="/plataforma/distribuidoras" replace />} />
          <Route path="/plataforma/distribuidoras"       element={<Distribuidoras />} />
          <Route path="/plataforma/distribuidoras/nueva" element={<NuevaDistribuidora />} />
          <Route path="/plataforma/distribuidoras/:id"   element={<DetalleDistribuidora />} />
          {/* Ajustes del superadministrador — mantiene SidebarPlataforma */}
          <Route path="/plataforma/ajustes"              element={<Ajustes />} />
        </Route>

        {/* ══ Solo Administrador ══ */}
        <Route element={<ProtectedRoute rolesPermitidos={['ADMINISTRADOR']} />}>
          <Route path="/dashboard/gerente"       element={<DashboardGerente />} />
          <Route path="/usuarios"                element={<GestionUsuarios />} />
          <Route path="/usuarios/nuevo"          element={<NuevoUsuario />} />
          <Route path="/usuarios/:id/editar"     element={<EditarUsuario />} />
          <Route path="/reportes"                element={<Reportes />} />
          <Route path="/reportes/ventas-dia"    element={<ReporteVentasDia />} />
          <Route path="/cierres-caja"            element={<HistorialCierres />} />
          <Route path="/cierres-caja/:id"        element={<DetalleCierre />} />
          {/* Ajustes del admin — mantiene SidebarAdministrador */}
          <Route path="/ajustes"                 element={<Ajustes />} />
          <Route path="/ajustes/identidad"       element={<IdentidadVisual />} />
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
          <Route path="/inventarios/recomendaciones"           element={<RecomendacionCompras />} />
          <Route path="/inventarios/recomendaciones/historial" element={<HistorialRecomendaciones />} />
          {/* Ajustes del módulo inventarios — mantiene SidebarInventarios */}
          <Route path="/inventarios/ajustes"         element={<Ajustes />} />
        </Route>

        {/* ══ Módulo Ventas (Administrador + Encargado de Ventas) ══ */}
        <Route element={<ProtectedRoute rolesPermitidos={['ADMINISTRADOR', 'ENCARGADO_VENTAS']} />}>
          <Route path="/ventas"                  element={<Navigate to="/ventas/pedidos-ventanilla" replace />} />
          <Route path="/ventas/pedidos-rurales"  element={<PedidoRural />} />
          <Route path="/ventas/pedidos-ventanilla" element={<PedidoVentanilla />} />
          <Route path="/ventas/reportes"         element={<ReporteVentasDia />} />
          <Route path="/ventas/comerciantes"     element={<MisComerciantess />} />
          <Route path="/ventas/comerciantes/:id/informacion" element={<InformacionComerciante />} />
          <Route path="/ventas/planilla/:id"                element={<PlanillaDetalle />} />
          <Route path="/ventas/comerciantes/:id/planilla-hoy" element={<PlanillaDiaria />} />
         
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
