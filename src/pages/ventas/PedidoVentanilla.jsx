/**
 * PedidoVentanilla.jsx — RF28 · RF29 · RF30 · RF31
 * Canal Ventanilla · Catálogo · Carrito Cajas + Unidades · Método de pago
 * Todos los datos provienen exclusivamente del backend a través de ventasService.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { getCatalogoVenta, calcularVenta, confirmarVenta } from '../../services/ventasService';
import SuccessToast from '../../components/SuccessToast';
import Pagination from '../../components/ui/Pagination';

/* ──────────────────────────── UTILIDADES ──────────────────────────────── */
const formatCOP = (n) =>
  '$' + Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 });

const formatFecha = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

/* ──────────────────────────── ÍCONOS SVG ──────────────────────────────── */
function WindowIcon({ size = 22 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>;
}
function TruckIcon({ size = 22 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
}
function SearchIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
function PackageIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
}
function UserIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function XIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function AlertIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
}
function CheckIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
function SpinIcon() {
  return <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>;
}
function BilleteIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 6v12M18 6v12"/></svg>;
}
function TransferenciaIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h2M10 15h4"/></svg>;
}

/* ──────────────────────────── CLASES COMUNES ──────────────────────────── */
const inputCls = 'w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-inter outline-none focus:border-[#9e2016] focus:ring-2 focus:ring-[#9e2016]/15 transition-all duration-200 text-zinc-900 placeholder:text-zinc-400';
const labelCls = 'block text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-inter mb-1.5';

function QtyBtn({ onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className="w-6 h-6 rounded border border-zinc-300 flex items-center justify-center text-zinc-600 hover:bg-zinc-100 hover:border-zinc-400 transition-all text-sm font-bold active:scale-90">
      {children}
    </button>
  );
}

/* ═══════════════════════════ COMPONENTE PRINCIPAL ═══════════════════════ */
export default function PedidoVentanilla() {
  const navigate = useNavigate();

  /* ── Catálogo ── */
  const [productos, setProductos]       = useState([]);
  const [cargandoProd, setCargandoProd] = useState(true);
  const [busquedaProd, setBusquedaProd] = useState('');

  /* ── Carrito ──
   * Estructura de cada ítem: { id, nombre, precioVenta, imagenUrl, cajas, unidades }
   * "unidades" = unidades sueltas (campo que el backend espera como "unidades")
   */
  const [cartItems, setCartItems] = useState([]);

  /* ── Resultado de cálculo (backend) ──
   * { items: [{ productoId, cajas, unidades, precioUnitario, subtotal }], total }
   */
  const [calcResult, setCalcResult] = useState(null);

  /* ── Pago ── */
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');

  const [pageProd, setPageProd] = useState(0);

  /* ── UI ── */
  const [enviando, setEnviando]             = useState(false);
  const [errorCatalogo, setErrorCatalogo]   = useState('');
  const [showConfirm, setShowConfirm]       = useState(false);
  const [isClosingConfirm, setIsClosingConfirm] = useState(false);
  const [toast, setToast]                   = useState({ show: false, msg: '', type: 'success' });

  /**
   * ventaConfirmada: respuesta real del backend al confirmar.
   * Estructura exacta: { ventaId, canal, fecha, estado, items, total, metodoPago }
   * Mientras sea null se muestra el formulario.
   */
  const [ventaConfirmada, setVentaConfirmada] = useState(null);
  const [isLeavingSuccess, setIsLeavingSuccess] = useState(false);

  /* ── Total visible en UI (backend cuando llega, estimación local mientras) ── */
  const [totalCalculado, setTotalCalculado] = useState(0);
  const calcTimerRef = useRef(null);

  /* ── Cargar catálogo desde API ── */
  useEffect(() => {
    let vivo = true;
    setCargandoProd(true);
    getCatalogoVenta()
      .then((data) => {
        if (!vivo) return;
        // Mapeo exacto con los campos reales que devuelve el backend.
        setProductos(data.map((p) => ({
          id:            p.id,
          codigoTecnico: p.codigo,
          nombre:        p.nombre,
          imagenUrl:     p.imagen ?? null,
          precioVenta:   Number(p.precioUnitario),
          stockActual:   Number(p.stock),
          disponible:    p.disponible,
          unidadesPorCaja: p.unidadesPorCaja ?? null,
        })));
      })
      .catch((err) => {
        if (!vivo) return;
        setProductos([]);
        const status = err?.response?.status;
        let msg;
        if (!err?.response) msg = 'Sin conexión a internet. Verifica tu red e intenta de nuevo.';
        else if (status === 401) msg = 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
        else if (status === 403) msg = 'No tienes permisos para ver el catálogo de productos.';
        else if (status === 404) msg = 'El catálogo de productos no está disponible en este momento.';
        else if (status >= 500) msg = 'Error en el servidor al cargar el catálogo. Intenta más tarde.';
        else msg = err?.response?.data?.mensaje ?? 'No se pudo cargar el catálogo. Intenta nuevamente.';
        setErrorCatalogo(msg);
      })
      .finally(() => { if (vivo) setCargandoProd(false); });
    return () => { vivo = false; };
  }, []);

  /* ── Estimación local de subtotal (solo para UX inmediata antes de respuesta backend) ──
   * Usa UNIDADES_POR_CAJA = 24, constante fijada por el backend.
   */
  const calcSubLocal = (it) =>
    (it.cajas * (it.unidadesPorCaja ?? 0) + it.unidades) * (Number(it.precioVenta) || 0);

  /* ── Subtotal de ítem: usa valor backend cuando está disponible, local como fallback ── */
  const getItemSubtotal = (itemId) => {
    if (calcResult?.items) {
      const found = calcResult.items.find((r) => r.productoId === itemId);
      if (found) return Number(found.subtotal);
    }
    const local = cartItems.find((i) => i.id === itemId);
    return local ? calcSubLocal(local) : 0;
  };

  /* ── Total: estimación local inmediata + sincronización con backend (debounce 500ms) ── */
  useEffect(() => {
    // Estimación local inmediata para UX fluida — siempre número válido
    const localTotal = cartItems.reduce((acc, i) => acc + calcSubLocal(i), 0);
    setTotalCalculado(Number.isFinite(localTotal) ? localTotal : 0);
    setCalcResult(null); // invalida resultado anterior al cambiar carrito

    if (cartItems.length === 0) return;
    if (calcTimerRef.current) clearTimeout(calcTimerRef.current);

    calcTimerRef.current = setTimeout(async () => {
      try {
        const payload = cartItems.map((i) => ({
          productoId: i.id,
          cajas:      i.cajas,
          unidades:   i.unidades,
        }));
        const resp = await calcularVenta(payload);
        // resp = { items: [...], total: ... } — el total definitivo es del backend
        setCalcResult(resp);
        if (resp?.total !== undefined) setTotalCalculado(Number(resp.total));
      } catch {
        /* conservar estimación local hasta que el backend responda */
      }
    }, 500);

    return () => { if (calcTimerRef.current) clearTimeout(calcTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems]);

  /* ── Acciones de carrito ── */
  const addToCart = useCallback((producto) => {
    if (!producto.disponible || producto.stockActual === 0) return;
    setCartItems((prev) => {
      const existe = prev.find((i) => i.id === producto.id);
      if (existe) return prev.map((i) =>
        i.id === producto.id ? { ...i, cajas: i.cajas + 1 } : i
      );
      return [...prev, {
        id:          producto.id,
        nombre:      producto.nombre,
        precioVenta: producto.precioVenta,
        imagenUrl:   producto.imagenUrl,
        stockActual: producto.stockActual, // necesario para validación local
        unidadesPorCaja: producto.unidadesPorCaja,
        cajas:       producto.unidadesPorCaja != null ? 1 : 0,
        unidades:    producto.unidadesPorCaja != null ? 0 : 1,
      }];
    });
  }, []);

  const updateCart = useCallback((id, field, valor) => {
    setCartItems((prev) =>
      prev.map((i) => i.id === id ? { ...i, [field]: Math.max(0, Number(valor) || 0) } : i)
    );
  }, []);

  const removeFromCart = useCallback((id) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  /* ── Búsqueda local sobre datos reales del catálogo ── */
  const productosFiltrados = useMemo(() => {
    if (!busquedaProd.trim()) return productos;
    const q = busquedaProd.toLowerCase();
    return productos.filter((p) =>
      p.nombre.toLowerCase().includes(q) ||
      p.codigoTecnico.toLowerCase().includes(q)
    );
  }, [productos, busquedaProd]);

  useEffect(() => setPageProd(0), [busquedaProd]);
  const totalProdPags = Math.ceil(productosFiltrados.length / 6);

  /* ── Confirmar venta ── */
  const confirmarPedido = async () => {
    setEnviando(true);
    try {
      const respuesta = await confirmarVenta({
        canal:      'VENTANILLA',
        metodoPago: metodoPago,
        items: cartItems
          .filter((i) => i.cajas > 0 || i.unidades > 0)
          .map((i) => ({
            productoId: i.id,
            cajas:      i.cajas,
            unidades:   i.unidades,
          })),
      });
      setVentaConfirmada(respuesta);
      setShowConfirm(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const status = err?.response?.status;
      const data   = err?.response?.data;
      if (status === 409 || data?.tipo === 'STOCK_INSUFICIENTE') {
        setToast({ show: true, msg: `Stock insuficiente: ${data?.detalle ?? data?.mensaje ?? 'uno o más productos no tienen suficiente stock.'}`, type: 'error' });
      } else {
        setToast({ show: true, msg: data?.mensaje ?? data?.message ?? 'Error al registrar la venta.', type: 'error' });
      }
      setShowConfirm(false);
    } finally {
      setEnviando(false);
    }
  };

  const closeConfirm = () => {
    if (isClosingConfirm) return;
    setIsClosingConfirm(true);
    setTimeout(() => { setIsClosingConfirm(false); setShowConfirm(false); }, 200);
  };

  const reiniciar = () => {
    setCartItems([]);
    setCalcResult(null);
    setTotalCalculado(0);
    setMetodoPago('EFECTIVO');
    setErrorCatalogo('');
    setVentaConfirmada(null);
  };

  const handleNuevaVenta = () => {
    setIsLeavingSuccess(true);
    setTimeout(() => { setIsLeavingSuccess(false); reiniciar(); }, 280);
  };

  const totalItemsBadge = cartItems.length;

  /* ── Validación local del carrito (previene confirm si hay errores) ── */
  const erroresCarrito = useMemo(() => {
    const errs = {};
    cartItems.forEach((it) => {
      const totalUnidades = it.cajas * (it.unidadesPorCaja ?? 0) + it.unidades;
      if (it.cajas === 0 && it.unidades === 0) {
        errs[it.id] = 'Agrega al menos 1 caja o 1 unidad.';
      } else if (totalUnidades > (it.stockActual ?? Infinity)) {
        errs[it.id] = `Supera el stock disponible (${it.stockActual} u. en total).`;
      }
    });
    return errs;
  }, [cartItems]);

  const hayErroresCarrito = Object.keys(erroresCarrito).length > 0;

  /* ═══════════════════════════ RENDER ═══════════════════════════════════ */
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto animate-fade-in-up">

        {/* ══════════════ PANTALLA DE ÉXITO ══════════════
         * Usa exclusivamente campos de ConfirmarVentaResponse:
         * ventaId, canal, fecha, estado, items, total, metodoPago
         */}
        {ventaConfirmada && (
          <div className={`space-y-4 ${isLeavingSuccess ? 'animate-scale-out' : 'animate-scale-in'}`}>

            {/* Banner principal */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckIcon />
              </div>
              <div className="flex-1">
                <p className="font-bold text-emerald-800 font-display">¡Venta registrada!</p>
                <p className="text-sm text-emerald-700 font-inter mt-0.5">
                  La venta fue registrada correctamente y el stock fue descontado.
                </p>
              </div>
              <button onClick={handleNuevaVenta}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-all active:scale-95 shrink-0">
                Nueva venta
              </button>
            </div>

            {/* Resumen — campos exactos del DTO */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 space-y-4">
              <p className={labelCls}>Resumen de la Venta</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

                {/* ID de venta */}
                <div className="bg-zinc-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-inter mb-1">N° Venta</p>
                  <p className="text-sm font-extrabold text-zinc-900 font-display break-all">
                    {String(ventaConfirmada.ventaId).slice(0, 8).toUpperCase()}
                  </p>
                </div>

                {/* Total */}
                <div className="bg-zinc-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-inter mb-1">Total</p>
                  <p className="text-sm font-extrabold text-[#9e2016] font-display">
                    {formatCOP(ventaConfirmada.total)}
                  </p>
                </div>

                {/* Método de pago */}
                <div className="bg-zinc-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-inter mb-1">Pago</p>
                  <p className="text-sm font-bold text-zinc-900 font-display capitalize">
                    {ventaConfirmada.metodoPago.toLowerCase()}
                  </p>
                </div>

                {/* Fecha */}
                <div className="bg-zinc-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-inter mb-1">Fecha</p>
                  <p className="text-sm font-bold text-zinc-900 font-display">
                    {formatFecha(ventaConfirmada.fecha)}
                  </p>
                </div>
              </div>

              {/* Canal — siempre presente; estado — solo si el backend lo devuelve */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold px-3 py-1 rounded-full font-inter uppercase tracking-wide border border-emerald-200">
                  <CheckIcon /> {ventaConfirmada.estado ?? 'CONFIRMADA'}
                </span>
                {ventaConfirmada.canal && (
                  <span className="inline-flex items-center gap-1.5 bg-zinc-100 text-zinc-600 text-[11px] font-semibold px-3 py-1 rounded-full font-inter uppercase tracking-wide">
                    <WindowIcon size={12} /> {ventaConfirmada.canal}
                  </span>
                )}
              </div>

              {/* Ítems de la venta — campos exactos de ItemVentaResponseDTO */}
              {ventaConfirmada.items?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-inter">
                    Productos ({ventaConfirmada.items.length})
                  </p>
                  {ventaConfirmada.items.map((it) => (
                    <div key={it.productoId}
                      className="flex items-center justify-between bg-zinc-50 rounded-xl px-4 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-zinc-800 font-display">{it.nombre}</p>
                        <p className="text-[11px] text-zinc-400 font-inter">
                          {it.cajas > 0 && `${it.cajas} caja${it.cajas > 1 ? 's' : ''}`}
                          {it.cajas > 0 && it.unidades > 0 && ' + '}
                          {it.unidades > 0 && `${it.unidades} unidad${it.unidades > 1 ? 'es' : ''}`}
                          {' · '}{formatCOP(it.precioUnitario)} c/u
                        </p>
                      </div>
                      <span className="text-sm font-bold text-zinc-800 font-display">
                        {formatCOP(it.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Error catálogo GET ── */}
        {errorCatalogo && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm animate-slide-down flex items-start gap-2">
            <span className="shrink-0 mt-0.5"><AlertIcon /></span>
            <span className="flex-1 font-inter">{errorCatalogo}</span>
            <button onClick={() => setErrorCatalogo('')} className="shrink-0 opacity-60 hover:opacity-100 p-0.5 transition-opacity">
              <XIcon size={13} />
            </button>
          </div>
        )}

        {/* ══════════════ FORMULARIO DE VENTA ══════════════ */}
        {!ventaConfirmada && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* ── COLUMNA IZQUIERDA ── */}
            <div className="lg:col-span-2 space-y-5">

              {/* § TIPO DE CLIENTE */}
              <section className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 space-y-3">
                <p className={labelCls + ' flex items-center gap-2'}><UserIcon /> Tipo de Cliente</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'ventanilla', icon: <WindowIcon />, label: 'Ventanilla' },
                    { id: 'rural',      icon: <TruckIcon />,  label: 'Rural'      },
                  ].map(({ id, icon, label }) => (
                    <button key={id} type="button"
                      onClick={() => { if (id === 'rural') navigate('/ventas/pedidos-rurales'); }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                        id === 'ventanilla'
                          ? 'border-[#9e2016] bg-[#9e2016]/5 text-[#9e2016]'
                          : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'
                      }`}>
                      {icon}
                      <span className="text-sm font-semibold font-display">{label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* § CATÁLOGO — datos exactos desde API */}
              <section className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 space-y-4">
                <p className={labelCls + ' flex items-center gap-2 mb-0'}><PackageIcon /> Productos</p>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"><SearchIcon /></span>
                  <input
                    type="text"
                    placeholder="Buscar por nombre o código..."
                    value={busquedaProd}
                    onChange={(e) => setBusquedaProd(e.target.value)}
                    className={`${inputCls} pl-10`}
                  />
                </div>

                {cargandoProd ? (
                  <div className="flex items-center justify-center py-16 gap-3">
                    <SpinIcon /><span className="text-sm text-zinc-500 font-inter">Cargando catálogo…</span>
                  </div>
                ) : productosFiltrados.length === 0 ? (
                  <div className="text-center py-14 text-zinc-400 text-sm font-inter">
                    {productos.length === 0 ? 'No hay productos disponibles.' : 'No se encontraron productos.'}
                  </div>
                ) : (
                  <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {productosFiltrados.slice(pageProd * 6, (pageProd + 1) * 6).map((p) => {
                      const sinStock  = !p.disponible || p.stockActual === 0;
                      const enCarrito = cartItems.some((i) => i.id === p.id);
                      return (
                        <div key={p.id}
                          onClick={() => !sinStock && addToCart(p)}
                          className={`bg-white border rounded-2xl overflow-hidden transition-all duration-200 ${
                            sinStock
                              ? 'opacity-40 cursor-not-allowed'
                              : enCarrito
                                ? 'border-[#9e2016]/40 ring-1 ring-[#9e2016]/20 hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
                                : 'border-zinc-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
                          }`}>
                          <div className="relative aspect-square bg-zinc-100 flex items-center justify-center overflow-hidden">
                            {p.imagenUrl
                              ? <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover" />
                              : <span className="text-4xl font-extrabold text-zinc-200 font-display select-none">
                                  {p.nombre?.charAt(0)?.toUpperCase()}
                                </span>
                            }
                            {sinStock ? (
                              <span className="absolute top-2 left-2 bg-zinc-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-inter">
                                Sin stock
                              </span>
                            ) : (
                              <span className={`absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md font-inter leading-none ${
                                p.stockActual <= 5
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-zinc-100 text-zinc-500'
                              }`}>
                                {p.stockActual}u
                              </span>
                            )}
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-bold text-zinc-800 font-display leading-tight">{p.nombre}</p>
                            <div className="flex items-center justify-between mt-2.5">
                              <span className="text-sm font-extrabold text-[#9e2016] font-display">
                                {formatCOP(p.precioVenta)}
                              </span>
                              {!sinStock && (
                                <button type="button"
                                  onClick={(e) => { e.stopPropagation(); addToCart(p); }}
                                  className="w-7 h-7 rounded-full bg-[#9e2016] hover:bg-[#7c0202] text-white flex items-center justify-center text-lg font-bold transition-all duration-200 active:scale-90 shadow-sm shadow-[#9e2016]/30">
                                  +
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {totalProdPags > 1 && (
                    <div className="flex items-center justify-between pt-3 mt-1 border-t border-zinc-100">
                      <span className="text-xs text-zinc-400 font-inter">
                        {pageProd * 6 + 1}–{Math.min((pageProd + 1) * 6, productosFiltrados.length)} de {productosFiltrados.length} productos
                      </span>
                      <Pagination
                        page={pageProd + 1}
                        totalPages={totalProdPags}
                        onPageChange={(p) => setPageProd(p - 1)}
                      />
                    </div>
                  )}
                  </>
                )}
              </section>
            </div>

            {/* ── CARRITO DERECHO (1/4) ── */}
            <div className="lg:col-span-1 lg:sticky lg:top-0">
              <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">

                {/* Header */}
                <div className="px-6 py-4 border-b border-zinc-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-extrabold text-zinc-900 font-display">Carrito de Ventas</h2>
                    {totalItemsBadge > 0 && (
                      <span className="bg-[#9e2016] text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-inter">
                        {totalItemsBadge} {totalItemsBadge === 1 ? 'ÍTEM' : 'ÍTEMS'}
                      </span>
                    )}
                  </div>
                  {/* N° de venta se asigna al confirmar — no se genera localmente */}
                  <p className="text-[11px] text-zinc-400 font-inter mt-0.5">Canal: Ventanilla</p>
                </div>

                {/* Items */}
                <div className="px-6 py-4 space-y-5 max-h-[340px] overflow-y-auto">
                  {cartItems.length === 0 ? (
                    <div className="text-center py-10 text-zinc-300 text-sm font-inter">
                      <div className="text-4xl mb-2">🛒</div>
                      Agrega productos desde el catálogo
                    </div>
                  ) : cartItems.map((item) => {
                    // Precio unitario: viene del calcResult backend si ya llegó, o del catálogo como estimación local
                    const backendItem   = calcResult?.items?.find((r) => r.productoId === item.id);
                    const precioUnit    = Number(backendItem?.precioUnitario ?? item.precioVenta) || 0;
                    const subtotalCajas = item.cajas * (item.unidadesPorCaja ?? 0) * precioUnit;
                    const subtotalUnidades = item.unidades * precioUnit;

                    const errItem = erroresCarrito[item.id];
                    return (
                      <div key={item.id} className="space-y-2.5">

                        {/* Info producto */}
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border ${errItem ? 'border-red-300 bg-red-50' : 'bg-zinc-100 border-zinc-200'}`}>
                            {item.imagenUrl
                              ? <img src={item.imagenUrl} alt={item.nombre} className="w-full h-full object-cover" />
                              : <span className="text-zinc-300 text-lg font-bold font-display">{item.nombre?.charAt(0)?.toUpperCase()}</span>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-zinc-900 font-display leading-tight truncate">{item.nombre}</p>
                            <p className="text-[11px] text-zinc-400 font-inter">
                              Unitario: {formatCOP(item.precioVenta)}
                              {item.stockActual != null && (
                                <span className={`ml-1.5 font-semibold ${item.stockActual <= 5 ? 'text-red-500' : 'text-zinc-400'}`}>
                                  · stock: {item.stockActual}u
                                </span>
                              )}
                            </p>
                            {errItem && (
                              <p className="text-[10px] text-red-500 font-inter mt-0.5 font-semibold">
                                ⚠ {errItem}
                              </p>
                            )}
                          </div>
                          <button type="button" onClick={() => removeFromCart(item.id)}
                            className="text-zinc-300 hover:text-red-400 transition-colors p-0.5 shrink-0">
                            <XIcon size={14} />
                          </button>
                        </div>

                        {/* Fila Cajas — solo si el producto viene en cajas */}
                        {item.unidadesPorCaja != null && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-zinc-500 font-inter w-14 shrink-0">Caja</span>
                            <div className="flex items-center gap-1.5">
                              <QtyBtn onClick={() => updateCart(item.id, 'cajas', item.cajas - 1)}>−</QtyBtn>
                              <input
                                type="number" min="0" value={item.cajas}
                                onChange={(e) => { const n = parseInt(e.target.value, 10); updateCart(item.id, 'cajas', isNaN(n) || n < 0 ? 0 : n); }}
                                className="w-9 text-center text-sm font-bold text-zinc-800 border border-zinc-200 rounded-lg py-0.5 outline-none focus:border-[#9e2016] focus:ring-1 focus:ring-[#9e2016]/20 font-display [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <QtyBtn onClick={() => updateCart(item.id, 'cajas', item.cajas + 1)}>+</QtyBtn>
                            </div>
                            <span className="text-sm font-bold text-zinc-800 font-display text-right min-w-[52px]">
                              {formatCOP(subtotalCajas)}
                            </span>
                          </div>
                        )}

                        {/* Fila Unidades (unidades sueltas — campo "unidades" en el backend) */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-zinc-500 font-inter w-14 shrink-0">Unidad</span>
                          <div className="flex items-center gap-1.5">
                            <QtyBtn onClick={() => updateCart(item.id, 'unidades', item.unidades - 1)}>−</QtyBtn>
                            <input
                              type="number" min="0" value={item.unidades}
                              onChange={(e) => { const n = parseInt(e.target.value, 10); updateCart(item.id, 'unidades', isNaN(n) || n < 0 ? 0 : n); }}
                              className="w-9 text-center text-sm font-bold text-zinc-800 border border-zinc-200 rounded-lg py-0.5 outline-none focus:border-[#9e2016] focus:ring-1 focus:ring-[#9e2016]/20 font-display [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <QtyBtn onClick={() => updateCart(item.id, 'unidades', item.unidades + 1)}>+</QtyBtn>
                          </div>
                          <span className="text-sm font-bold text-zinc-800 font-display text-right min-w-[52px]">
                            {formatCOP(subtotalUnidades)}
                          </span>
                        </div>

                        <div className="border-b border-zinc-100" />
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="px-6 py-5 border-t border-zinc-100 space-y-4 bg-zinc-50/50">

                  {/* Método de pago */}
                  <div>
                    <p className={labelCls}>Método de Pago</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'EFECTIVO',      icon: <BilleteIcon />,      label: 'Efectivo'      },
                        { id: 'TRANSFERENCIA', icon: <TransferenciaIcon />, label: 'Transferencia' },
                      ].map(({ id, icon, label }) => (
                        <button key={id} type="button"
                          onClick={() => setMetodoPago(id)}
                          className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold font-inter transition-all duration-200 ${
                            metodoPago === id
                              ? 'border-[#9e2016] bg-[#9e2016]/5 text-[#9e2016]'
                              : 'border-zinc-200 text-zinc-500 hover:border-zinc-300 bg-white'
                          }`}>
                          {icon}
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="flex justify-between items-center text-sm font-inter text-zinc-500">
                    <span>Subtotal</span>
                    <span className="font-semibold text-zinc-700">{formatCOP(totalCalculado)}</span>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center pt-1 border-t border-zinc-200">
                    <span className="text-sm font-bold text-zinc-900 font-display">Total General</span>
                    <span className="text-xl font-extrabold text-[#9e2016] font-display">
                      COP {Number(totalCalculado).toLocaleString('es-CO')}
                    </span>
                  </div>

                  {/* Mensaje de error de validación del carrito */}
                  {hayErroresCarrito && cartItems.length > 0 && (
                    <p className="text-[11px] text-red-500 font-inter text-center">
                      Corrige los errores en el carrito antes de continuar.
                    </p>
                  )}

                  {/* Botón */}
                  <button type="button"
                    onClick={() => { if (cartItems.length > 0 && !hayErroresCarrito) setShowConfirm(true); }}
                    disabled={enviando || cartItems.length === 0 || hayErroresCarrito}
                    className="w-full bg-[#9e2016] hover:bg-[#7c0202] disabled:bg-zinc-300 disabled:cursor-not-allowed text-white rounded-xl py-3.5 text-sm font-bold tracking-wide font-display transition-all duration-200 active:scale-[0.98] shadow-lg shadow-[#9e2016]/25 flex items-center justify-center gap-2">
                    {enviando ? <><SpinIcon /> Procesando…</> : 'COMPLETAR VENTA →'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ══════════════ MODAL CONFIRMAR ══════════════ */}
      {showConfirm && createPortal(
        <div
          className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm ${isClosingConfirm ? 'animate-fade-out' : 'animate-fade-in'}`}
          onClick={closeConfirm}
        >
          <div
            className={`bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-zinc-200 w-full max-w-md flex flex-col max-h-[90vh] ${isClosingConfirm ? 'animate-scale-out' : 'animate-scale-in'}`}
            onClick={(e) => e.stopPropagation()}
          >

            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 shrink-0">
              <h3 className="text-base font-bold text-zinc-900 font-display flex items-center gap-2">
                <WindowIcon size={18} /> Confirmar Venta — Ventanilla
              </h3>
              <button onClick={closeConfirm}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition-all">
                <XIcon />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">

              {/* Método de pago seleccionado */}
              <div className="bg-zinc-50 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-[#9e2016]">
                  {metodoPago === 'EFECTIVO' ? <BilleteIcon /> : <TransferenciaIcon />}
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-inter">Método de pago</p>
                  <p className="text-sm font-bold text-zinc-900 font-display">
                    {metodoPago === 'EFECTIVO' ? 'Efectivo' : 'Transferencia'}
                  </p>
                </div>
              </div>

              {/* Productos con cantidades reales del carrito */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-inter">
                  Productos ({cartItems.length})
                </p>
                {cartItems.map((it) => (
                  <div key={it.id} className="flex items-center justify-between bg-zinc-50 rounded-xl px-4 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-zinc-800 font-display">{it.nombre}</p>
                      <p className="text-[11px] text-zinc-400 font-inter">
                        {it.cajas > 0 && `${it.cajas} caja${it.cajas > 1 ? 's' : ''}`}
                        {it.cajas > 0 && it.unidades > 0 && ' + '}
                        {it.unidades > 0 && `${it.unidades} unidad${it.unidades > 1 ? 'es' : ''}`}
                        {it.cajas === 0 && it.unidades === 0 && '—'}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-zinc-800 font-display">
                      {formatCOP(getItemSubtotal(it.id))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total validado por backend */}
              <div className="border-t border-zinc-100 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-zinc-900 font-display">Total</span>
                  <span className="text-lg font-extrabold text-[#9e2016] font-display">{formatCOP(totalCalculado)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-5 border-t border-zinc-100 shrink-0">
              <button onClick={closeConfirm}
                className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl py-3 text-sm font-semibold transition-all active:scale-95 font-inter">
                Editar
              </button>
              <button onClick={confirmarPedido} disabled={enviando}
                className="flex-1 bg-[#9e2016] hover:bg-[#7c0202] text-white rounded-xl py-3 text-sm font-bold transition-all active:scale-95 shadow-lg shadow-[#9e2016]/25 font-display disabled:opacity-60 flex items-center justify-center gap-2">
                {enviando ? <><SpinIcon /> Confirmando…</> : <><CheckIcon /> Confirmar</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      <SuccessToast
        message={toast.msg}
        show={toast.show}
        onClose={() => setToast(t => ({ ...t, show: false }))}
        type={toast.type}
      />
    </AppLayout>
  );
}
