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
import CreditoComerciante      from '../pages/ventas/CreditoComerciante';
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
import EsquemaLiquidacion from '../pages/administrador/EsquemaLiquidacion';

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
import Proveedores              from '../pages/inventarios/Proveedores';
import PlantillasExportacion    from '../pages/inventarios/PlantillasExportacion';

/* ── Plataforma (Superadministrador) ── */
import Distribuidoras       from '../pages/plataforma/Distribuidoras';
import NuevaDistribuidora   from '../pages/plataforma/NuevaDistribuidora';
import DetalleDistribuidora from '../pages/plataforma/DetalleDistribuidora';
import PanelPlataforma      from '../pages/plataforma/PanelPlataforma';
import Planes               from '../pages/plataforma/Planes';
import Auditoria            from '../pages/plataforma/Auditoria';

/* ── Protección de rutas ── */
import ProtectedRoute from './ProtectedRoute';

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

        {/* ══ Plataforma — solo Superadministrador (RF58, RF59, RF69–RF71) ══ */}
        <Route element={<ProtectedRoute rolesPermitidos={['SUPERADMINISTRADOR']} />}>
          <Route path="/plataforma"                      element={<Navigate to="/plataforma/panel" replace />} />
          <Route path="/plataforma/panel"                element={<PanelPlataforma />} />
          <Route path="/plataforma/distribuidoras"       element={<Distribuidoras />} />
          <Route path="/plataforma/distribuidoras/nueva" element={<NuevaDistribuidora />} />
          <Route path="/plataforma/distribuidoras/:id"   element={<DetalleDistribuidora />} />
          <Route path="/plataforma/planes"               element={<Planes />} />
          <Route path="/plataforma/auditoria"            element={<Auditoria />} />
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
          <Route path="/ajustes/liquidacion"     element={<EsquemaLiquidacion />} />
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
          <Route path="/inventarios/proveedores"     element={<Proveedores />} />
          <Route path="/inventarios/plantillas"      element={<PlantillasExportacion />} />
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
          <Route path="/ventas/comerciantes/:id/credito"    element={<CreditoComerciante />} />
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
