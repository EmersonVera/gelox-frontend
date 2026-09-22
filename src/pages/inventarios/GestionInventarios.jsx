// src/pages/inventarios/GestionInventarios.jsx — RF17 + RF24 + RF26 + RF27
import { useState, useEffect, useMemo } from 'react';
import AppLayout from '../../components/AppLayout';
import CustomSelect from '../../components/ui/CustomSelect';
import Pagination from '../../components/ui/Pagination';
import {
  getProductosInventario,
  getAlertasStock,
  buscarProductosInventario,
} from '../../services/inventarioService';

/* ─── Mock data (fallback si el backend no responde) ─── */
const MOCK_PRODUCTOS = [
  { codigoTecnico: 'NUT-00124', nombre: 'Corneto Vainilla',   stockActual: 420, precioVenta: 1240, estado: 'NORMAL',      cantidadPedida: 420, cantidadRecibida: 420 },
  { codigoTecnico: 'NUT-00892', nombre: 'Paleta Drácula',     stockActual: 45,  precioVenta: 1240, estado: 'BAJO_STOCK',  cantidadPedida: 420, cantidadRecibida: 420 },
  { codigoTecnico: 'NUT-00341', nombre: 'Chococono Especial', stockActual: 80,  precioVenta: 1240, estado: 'STOCK_MEDIO', cantidadPedida: 420, cantidadRecibida: 420 },
  { codigoTecnico: 'NUT-00991', nombre: 'Crem Helado Litro',  stockActual: 88,  precioVenta: 1240, estado: 'NORMAL',      cantidadPedida: 420, cantidadRecibida: 420 },
];
const MOCK_ALERTAS = [
  { codigoTecnico: 'NUT-00892', nombre: 'Paleta Drácula', stockActual: 45, stockMinimo: 100, estado: 'BAJO_STOCK' },
];

const PAGE_SIZE = 10;
const CATEGORIAS = ['Todos', 'Paletas', 'Conos', 'Familiares', 'Vasos'];
const ESTADOS_FILTRO = [
  { value: '',            label: 'Todos los estados' },
  { value: 'NORMAL',      label: 'Normal' },
  { value: 'BAJO_STOCK',  label: 'Stock Bajo' },
  { value: 'STOCK_MEDIO', label: 'Stock Medio' },
];

/* ─── Helpers ─── */
const formatCOP = (n) =>
  '$' + Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });

/* ─── SVG Icons ─── */
function IceCreamIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-700 shrink-0">
      <path d="M12 22V12" />
      <path d="M8 12a4 4 0 0 1 8 0" />
      <path d="M4 12a8 8 0 0 1 16 0" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 shrink-0 mt-0.5">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 shrink-0">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}


/* ─── Badge de estado ─── */
function EstadoBadge({ estado }) {
  const map = {
    NORMAL:      { cls: 'bg-green-100 text-green-700',  label: 'NORMAL' },
    BAJO_STOCK:  { cls: 'bg-red-100 text-red-700',      label: 'BAJO STOCK' },
    STOCK_MEDIO: { cls: 'bg-amber-100 text-amber-700',  label: 'STOCK MEDIO' },
  };
  const cfg = map[estado] ?? { cls: 'bg-zinc-100 text-zinc-600', label: estado };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

/* ─── Color de stock según estado ─── */
function StockText({ cantidad, estado }) {
  if (estado === 'BAJO_STOCK')  return <span className="text-red-600 font-bold">{cantidad}</span>;
  if (estado === 'STOCK_MEDIO') return <span className="text-amber-600 font-bold">{cantidad}</span>;
  return <span className="text-zinc-900">{cantidad}</span>;
}

/* ─── Skeleton rows ─── */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>
          <td colSpan={7} className="px-6 py-3">
            <div className="bg-zinc-100 animate-pulse h-12 rounded-lg w-full" />
          </td>
        </tr>
      ))}
    </>
  );
}


/* ══════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════ */
export default function GestionInventarios() {
  /*
   * productosBase: lista completa cargada al montar la página (RF26 — datos
   *   siempre frescos, reflejo del inventario tras ventas/despachos del backend).
   * productos: subconjunto devuelto por /buscar cuando hay filtro de estado activo,
   *   o igual a productosBase cuando no hay filtro (RF27).
   */
  const [productosBase, setProductosBase] = useState([]);
  const [productos, setProductos]         = useState([]);
  const [alertas, setAlertas]             = useState([]);
  const [cargando, setCargando]           = useState(true);
  const [buscando, setBuscando]           = useState(false); // spinner filtro estado
  const [error, setError]                 = useState(false);

  const [busqueda, setBusqueda]         = useState('');
  const [categoriaActiva, setCatActiva] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [page, setPage]                 = useState(1);

  /* ── RF26: carga inicial — el backend ya descontó stock de ventas/despachos ── */
  useEffect(() => {
    let cancelled = false;
    async function cargar() {
      setCargando(true);
      setError(false);
      try {
        const [prods, alts] = await Promise.all([
          getProductosInventario(),
          getAlertasStock(),
        ]);
        if (!cancelled) {
          const lista = Array.isArray(prods) ? prods : MOCK_PRODUCTOS;
          setProductosBase(lista);
          setProductos(lista);
          setAlertas(Array.isArray(alts) ? alts : MOCK_ALERTAS);
        }
      } catch {
        if (!cancelled) {
          setProductosBase(MOCK_PRODUCTOS);
          setProductos(MOCK_PRODUCTOS);
          setAlertas(MOCK_ALERTAS);
          setError(false); // con mock no mostramos error en dev
        }
      } finally {
        if (!cancelled) setCargando(false);
      }
    }
    cargar();
    return () => { cancelled = true; };
  }, []);

  /* ── RF27: filtro por estado → llama a GET /api/inventario/buscar ── */
  useEffect(() => {
    if (cargando) return; // esperar a que termine la carga inicial

    let cancelled = false;

    async function aplicarFiltroEstado() {
      // Sin filtro de estado → restaurar la lista completa sin llamada extra
      if (!filtroEstado) {
        setProductos(productosBase);
        setPage(1);
        return;
      }

      setBuscando(true);
      try {
        const result = await buscarProductosInventario({ estado: filtroEstado });
        if (!cancelled) {
          setProductos(Array.isArray(result) ? result : []);
          setPage(1);
        }
      } catch {
        // Fallback local si el endpoint aún no está disponible
        if (!cancelled) {
          setProductos(productosBase.filter((p) => p.estado === filtroEstado));
          setPage(1);
        }
      } finally {
        if (!cancelled) setBuscando(false);
      }
    }

    aplicarFiltroEstado();
    return () => { cancelled = true; };
  // productosBase es estable; cargando solo importa en el guard de entrada
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado, cargando]);

  /* ── RF27: filtro local por nombre / código técnico (instantáneo) ── */
  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = q
      ? productos.filter((p) =>
          p.nombre?.toLowerCase().includes(q) ||
          p.codigoTecnico?.toLowerCase().includes(q)
        )
      : productos;
    return [...lista].sort((a, b) => {
      const stockA = a.cantidadDisponible ?? a.stockActual ?? 0;
      const stockB = b.cantidadDisponible ?? b.stockActual ?? 0;
      if (stockA !== stockB) return stockB - stockA;
      return (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es');
    });
  }, [productos, busqueda]);

  // Resetear página al cambiar texto de búsqueda o categoría
  useEffect(() => { setPage(1); }, [busqueda, categoriaActiva]);

  /* ── Paginación ── */
  const totalPages = Math.max(1, Math.ceil(productosFiltrados.length / PAGE_SIZE));
  const paginados  = productosFiltrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Mostrar pills de categoría solo si el backend devuelve el campo
  const hayCategoria = productosBase.some((p) => Boolean(p.categoria));

  // Conteo de alertas de bajo stock
  const bajoStockCount = alertas.filter((a) => a.estado === 'BAJO_STOCK').length;

  // ¿Hay algún filtro activo?
  const hayFiltros = busqueda.trim() !== '' || filtroEstado !== '';

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">

        {/* ── Encabezado ── */}
        <div>
          <h1 className="font-['Manrope'] font-extrabold text-3xl leading-9 tracking-tight text-zinc-900">
            Gestión de Inventarios
          </h1>
          <p className="font-['Inter'] text-sm text-zinc-500 mt-1">
            Control de existencias y abastecimiento para Distribuidora Gelox.
          </p>
        </div>

        {/* ── Panel de alerta RF24 — solo si hay productos en bajo stock ── */}
        {!cargando && bajoStockCount > 0 && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
            <WarningIcon />
            <div>
              <p className="font-['Manrope'] font-bold text-red-800 text-sm">Alerta de Stock</p>
              <p className="font-['Inter'] text-red-700 text-sm mt-0.5">
                Hay {bajoStockCount} producto(s) que requieren reposición inmediata para evitar quiebre de stock.
              </p>
            </div>
          </div>
        )}

        {/* ── Pills de categoría (solo si el backend devuelve el campo) ── */}
        {hayCategoria && (
          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat}
                onClick={() => setCatActiva(cat)}
                className={`px-5 py-2 rounded-full font-['Inter'] font-semibold text-sm transition-colors ${
                  categoriaActiva === cat
                    ? 'bg-red-700 text-white'
                    : 'bg-white text-zinc-600 border border-zinc-300 hover:border-red-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* ── Sección tabla ── */}
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">

          {/* Encabezado de sección con selector de estado (RF27) */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
            <h2 className="font-['Manrope'] font-bold text-lg text-zinc-900">Existencias Actuales</h2>

            <div className="flex items-center gap-3">
              <span className="font-['Inter'] text-[11px] uppercase tracking-wider font-bold text-zinc-500">
                Filtro por Estado
              </span>

              {/* Selector de estado — llama a /api/inventario/buscar (RF27) */}
              <div className="flex items-center gap-2">
                <CustomSelect
                  value={filtroEstado}
                  onChange={(v) => setFiltroEstado(v)}
                  options={ESTADOS_FILTRO}
                  size="sm"
                  disabled={cargando || buscando}
                  className="min-w-[160px]"
                />
                {buscando && (
                  <svg className="animate-spin w-4 h-4 text-red-600 shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Barra de búsqueda por nombre / código (RF27 — filtro local) */}
          <div className="px-6 py-3 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="relative max-w-sm flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <SearchIcon />
                </span>
                <input
                  type="text"
                  placeholder="Buscar por nombre o código técnico…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-100 border border-transparent
                    focus:border-red-700 focus:ring-2 focus:ring-red-700/20 rounded-xl
                    outline-none transition-all text-sm text-zinc-900 placeholder:text-zinc-400
                    font-['Inter']"
                />
              </div>

              {/* Contador de resultados cuando hay filtros activos */}
              {hayFiltros && !cargando && !buscando && (
                <span className="font-['Inter'] text-xs text-zinc-500 whitespace-nowrap">
                  {productosFiltrados.length === 0
                    ? 'Sin resultados'
                    : `${productosFiltrados.length} resultado${productosFiltrados.length !== 1 ? 's' : ''}`}
                </span>
              )}

              {/* Limpiar filtros */}
              {hayFiltros && (
                <button
                  onClick={() => { setBusqueda(''); setFiltroEstado(''); }}
                  className="font-['Inter'] text-xs font-semibold text-red-600
                    hover:text-red-800 transition-colors whitespace-nowrap"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-100 text-zinc-700 text-xs uppercase tracking-wider font-bold font-['Inter']">
                  <th className="px-6 py-3 text-left">Código</th>
                  <th className="px-6 py-3 text-left">Nombre Producto</th>
                  <th className="px-6 py-3 text-right">En Tanque</th>
                  <th className="px-6 py-3 text-right">Precio</th>
                  <th className="px-6 py-3 text-center">Estado</th>
                  <th className="px-6 py-3 text-right">Pedido</th>
                  <th className="px-6 py-3 text-right">Recibido</th>
                </tr>
              </thead>
              <tbody>
                {cargando || buscando ? (
                  <SkeletonRows />
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center font-['Inter'] text-sm text-zinc-400">
                      No se pudo cargar el inventario.
                    </td>
                  </tr>
                ) : paginados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center font-['Inter'] text-sm text-zinc-400">
                      {hayFiltros
                        ? 'No hay productos que coincidan con los filtros aplicados.'
                        : 'No hay productos en esta categoría.'}
                    </td>
                  </tr>
                ) : (
                  paginados.map((p) => (
                    <tr
                      key={p.codigoTecnico}
                      className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                    >
                      {/* Código */}
                      <td className="px-6 py-4 font-['Inter'] text-sm text-zinc-500">
                        {p.codigoTecnico}
                      </td>

                      {/* Nombre */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <IceCreamIcon />
                          <span className="font-['Inter'] font-bold text-zinc-900 text-sm">
                            {p.nombre}
                          </span>
                        </div>
                      </td>

                      {/* Stock actual — backend retorna cantidadDisponible */}
                      <td className="px-6 py-4 text-right font-['Inter'] text-sm">
                        <StockText cantidad={p.cantidadDisponible ?? p.stockActual} estado={p.estado} />
                      </td>

                      {/* Precio — backend retorna precio */}
                      <td className="px-6 py-4 text-right font-['Inter'] text-sm text-zinc-700">
                        {formatCOP(p.precio ?? p.precioVenta)}
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4 text-center">
                        <EstadoBadge estado={p.estado} />
                      </td>

                      {/* Pedido */}
                      <td className="px-6 py-4 text-right font-['Inter'] text-sm text-zinc-700">
                        {p.cantidadPedida != null ? p.cantidadPedida : '—'}
                      </td>

                      {/* Recibido */}
                      <td className="px-6 py-4 text-right font-['Inter'] text-sm text-zinc-700">
                        {p.cantidadRecibida != null ? p.cantidadRecibida : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {!cargando && !buscando && !error && productosFiltrados.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100">
              <p className="font-['Inter'] text-sm text-zinc-500">
                Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, productosFiltrados.length)}–
                {Math.min(page * PAGE_SIZE, productosFiltrados.length)} de{' '}
                {productosFiltrados.length} productos
              </p>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}