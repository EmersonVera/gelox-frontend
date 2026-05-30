/**
 * PedidoRural.jsx — RF32 + RF33
 * Toggle tipo cliente · Dropdown clientes guardados · Catálogo en tarjetas
 * Carrito lateral con controles − Caja/Unidad +
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import api from '../../api/axiosConfig';
import CustomSelect from '../../components/ui/CustomSelect';
import SuccessToast from '../../components/SuccessToast';

const formatCOP = (n) => '$' + Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 });
const fechaHoy  = () => new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatFecha = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};
const genTx     = () => `GLX-${Math.floor(1000 + Math.random() * 9000)}`;
const EMPTY_DEST   = { nombre: '', telefono: '', direccion: '', correo: '', corregimiento: '' };
const EMPTY_FORM   = { nombre: '', telefono: '', direccion: '', correo: '', corregimiento: '' };

/* ── Icons ── */
function WindowIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>;
}
function TruckIcon({ size = 22 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
}
function UserIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function PhoneIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.18 18a19.45 19.45 0 0 1-6-6 19.79 19.79 0 0 1-3.93-8.78A2 2 0 0 1 3.26 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>; }
function MapPinIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function MailIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>; }
function SearchIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function UserPlusIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>; }
function XIcon({ size = 16 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function AlertIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>; }
function CheckIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }
function SpinIcon() { return <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>; }
function PackageIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>; }
function EditIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function LandmarkIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>; }
const inputCls       = 'w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-inter outline-none focus:border-[#9e2016] focus:ring-2 focus:ring-[#9e2016]/15 transition-all duration-200 text-zinc-900 placeholder:text-zinc-400 disabled:bg-zinc-50 disabled:text-zinc-500 disabled:cursor-not-allowed';
const inputLockedCls = 'w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-inter outline-none text-zinc-500 cursor-not-allowed';
const labelCls = 'block text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-inter mb-1.5';

function QtyBtn({ onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className="w-6 h-6 rounded border border-zinc-300 flex items-center justify-center text-zinc-600 hover:bg-zinc-100 hover:border-zinc-400 transition-all text-sm font-bold active:scale-90">
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════ */
export default function PedidoRural() {
  const navigate = useNavigate();
  const [tipoCliente, setTipoCliente]         = useState('rural');
  const [clientes, setClientes]               = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clienteIdSel, setClienteIdSel]       = useState('');
  const [destinatario, setDestinatario]       = useState(EMPTY_DEST);
  const [productos, setProductos]             = useState([]);
  const [cargandoProd, setCargandoProd]       = useState(true);
  const [busquedaProd, setBusquedaProd]       = useState('');
  const [cartItems, setCartItems]             = useState([]);
  const [costoEnvio, setCostoEnvio]           = useState('');
  const [transaccionId]                       = useState(genTx);
  const [enviando, setEnviando]               = useState(false);
  const [ventaConfirmada, setVentaConfirmada]   = useState(null);
  const [isLeavingSuccess, setIsLeavingSuccess] = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [isClosingConfirm, setIsClosingConfirm] = useState(false);
  const [errores, setErrores]                 = useState({});
  const [showNuevo, setShowNuevo]             = useState(false);
  const [isClosingNuevo, setIsClosingNuevo]   = useState(false);
  const [nuevoCliente, setNuevoCliente]       = useState(EMPTY_FORM);
  const [guardando, setGuardando]             = useState(false);
  const [errNuevo, setErrNuevo]               = useState('');
  const [showEditar, setShowEditar]           = useState(false);
  const [isClosingEditar, setIsClosingEditar] = useState(false);
  const [editandoCliente, setEditandoCliente] = useState(EMPTY_FORM);
  const [guardandoEditar, setGuardandoEditar] = useState(false);
  const [errEditar, setErrEditar]             = useState('');
  const [toast, setToast]                     = useState({ show: false, msg: '', type: 'success' });
  const [isLeavingFields, setIsLeavingFields] = useState(false);
  const [errorCatalogo, setErrorCatalogo]     = useState('');
  const [errorClientes, setErrorClientes]     = useState('');

  /* Cargar catálogo */
  useEffect(() => {
    (async () => {
      setCargandoProd(true);
      setErrorCatalogo('');
      try {
        const { data } = await api.get('/api/catalogo/productos', { params: { page: 0, size: 100 } });
        setProductos(Array.isArray(data.content) ? data.content : []);
      } catch (err) {
        setProductos([]);
        const status = err?.response?.status;
        if (!err?.response) setErrorCatalogo('Sin conexión a internet. No se pudo cargar el catálogo.');
        else if (status === 401) setErrorCatalogo('Tu sesión ha expirado. Vuelve a iniciar sesión.');
        else if (status === 403) setErrorCatalogo('No tienes permisos para ver el catálogo de productos.');
        else if (status >= 500) setErrorCatalogo('Error en el servidor al cargar el catálogo. Intenta más tarde.');
        else setErrorCatalogo(err?.response?.data?.mensaje ?? 'No se pudo cargar el catálogo.');
      } finally { setCargandoProd(false); }
    })();
  }, []);

  /* Cargar clientes rurales */
  useEffect(() => {
    (async () => {
      setLoadingClientes(true);
      setErrorClientes('');
      try {
        const { data } = await api.get('/api/ventas/clientes-rurales');
        setClientes(Array.isArray(data) ? data : (data.content ?? []));
      } catch {
        try {
          const { data } = await api.get('/api/clientes', { params: { page: 0, size: 200 } });
          setClientes(Array.isArray(data.content) ? data.content : Array.isArray(data) ? data : []);
        } catch (err2) {
          setClientes([]);
          const status = err2?.response?.status;
          if (!err2?.response) setErrorClientes('Sin conexión a internet. No se pudo cargar la lista de clientes.');
          else if (status === 401) setErrorClientes('Tu sesión ha expirado. Vuelve a iniciar sesión.');
          else if (status === 403) setErrorClientes('No tienes permisos para ver los clientes rurales.');
          else if (status >= 500) setErrorClientes('Error en el servidor al cargar clientes. Intenta más tarde.');
          else setErrorClientes('No se pudo cargar la lista de clientes rurales.');
        }
      } finally { setLoadingClientes(false); }
    })();
  }, []);

  const handleDeselectCliente = () => {
    setIsLeavingFields(true);
    setTimeout(() => {
      setIsLeavingFields(false);
      setClienteIdSel('');
      setDestinatario(EMPTY_DEST);
      setErrores({});
    }, 500);
  };

  const handleSelectCliente = useCallback((id) => {
    if (!id) { handleDeselectCliente(); return; }
    setClienteIdSel(id);
    const cli = clientes.find((c) => String(c.id) === String(id));
    if (cli) {
      setDestinatario({
        nombre:        cli.nombre        ?? '',
        telefono:      cli.telefono      ?? '',
        direccion:     cli.direccion     ?? '',
        correo:        cli.correo        ?? cli.email ?? '',
        corregimiento: cli.corregimiento ?? '',
      });
      setErrores({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientes]);

  const handleCloseNuevo = () => {
    if (isClosingNuevo) return;
    setIsClosingNuevo(true);
    setTimeout(() => {
      setIsClosingNuevo(false);
      setShowNuevo(false);
      setNuevoCliente(EMPTY_FORM);
      setErrNuevo('');
    }, 200);
  };

  const handleCloseEditar = () => {
    if (isClosingEditar) return;
    setIsClosingEditar(true);
    setTimeout(() => {
      setIsClosingEditar(false);
      setShowEditar(false);
      setErrEditar('');
    }, 200);
  };

  const closeConfirm = () => {
    if (isClosingConfirm) return;
    setIsClosingConfirm(true);
    setTimeout(() => { setIsClosingConfirm(false); setShowConfirm(false); }, 200);
  };

  const showToast = (msg, type = 'success') => setToast({ show: true, msg, type });

  const abrirEditar = () => {
    setEditandoCliente({ ...destinatario });
    setErrEditar('');
    setShowEditar(true);
  };

  const guardarNuevoCliente = async (e) => {
    e.preventDefault();
    setErrNuevo('');
    if (!nuevoCliente.nombre.trim() || !nuevoCliente.telefono.trim()) {
      setErrNuevo('Nombre y teléfono son obligatorios.'); return;
    }
    setGuardando(true);
    try {
      const { data } = await api.post('/api/ventas/clientes-rurales', nuevoCliente);
      setClientes((prev) => [...prev, data]);
      setClienteIdSel(String(data.id));
      setDestinatario({
        nombre: data.nombre ?? '', telefono: data.telefono ?? '',
        direccion: data.direccion ?? '', correo: data.correo ?? '',
        corregimiento: data.corregimiento ?? '',
      });
      handleCloseNuevo();
      showToast(`Cliente "${data.nombre}" registrado correctamente.`);
    } catch (err) {
      const status = err.response?.status;
      if (status === 409) setErrNuevo('El teléfono ya está registrado en otro cliente.');
      else setErrNuevo(err.response?.data?.mensaje ?? err.response?.data?.message ?? 'No se pudo registrar el cliente.');
    } finally { setGuardando(false); }
  };

  const guardarEditarCliente = async (e) => {
    e.preventDefault();
    setErrEditar('');
    if (!editandoCliente.nombre.trim() || !editandoCliente.telefono.trim()) {
      setErrEditar('Nombre y teléfono son obligatorios.'); return;
    }
    setGuardandoEditar(true);
    try {
      const { data } = await api.put(`/api/clientes/${clienteIdSel}`, editandoCliente);
      setClientes((prev) => prev.map((c) => String(c.id) === String(clienteIdSel) ? { ...c, ...data } : c));
      setDestinatario({
        nombre: data.nombre ?? '', telefono: data.telefono ?? '',
        direccion: data.direccion ?? '', correo: data.correo ?? '',
        corregimiento: data.corregimiento ?? '',
      });
      handleCloseEditar();
      showToast(`Datos de "${data.nombre}" actualizados correctamente.`);
    } catch (err) {
      const status = err.response?.status;
      if (status === 409) setErrEditar('El teléfono ya pertenece a otro cliente.');
      else if (status === 404) setErrEditar('Cliente no encontrado.');
      else setErrEditar(err.response?.data?.mensaje ?? err.response?.data?.message ?? 'No se pudo actualizar el cliente.');
    } finally { setGuardandoEditar(false); }
  };

  const addToCart = useCallback((producto) => {
    if ((producto.stockActual ?? 0) === 0) return;
    setCartItems((prev) => {
      const existe = prev.find((i) => i.productoId === producto.id);
      if (existe) return prev.map((i) => i.productoId === producto.id ? { ...i, cajas: i.cajas + 1 } : i);
      return [...prev, {
        productoId:      producto.id,
        nombre:          producto.nombre,
        descripcion:     producto.descripcion ?? '',
        precioUnitario:  producto.precioVenta ?? 0,
        unidadesPorCaja: producto.unidadesPorCaja ?? null,
        imagen:          producto.imagenUrl ?? null,
        cajas:           producto.unidadesPorCaja != null ? 1 : 0,
        unidadesSueltas: producto.unidadesPorCaja != null ? 0 : 1,
      }];
    });
    setErrores((p) => ({ ...p, items: '' }));
  }, []);

  const updateCart = useCallback((productoId, field, valor) => {
    setCartItems((prev) => prev.map((i) => i.productoId === productoId ? { ...i, [field]: Math.max(0, Number(valor) || 0) } : i));
  }, []);

  const removeFromCart = useCallback((productoId) => {
    setCartItems((prev) => prev.filter((i) => i.productoId !== productoId));
  }, []);

  const productosFiltrados = useMemo(() => {
    if (!busquedaProd.trim()) return productos;
    const q = busquedaProd.toLowerCase();
    return productos.filter((p) => p.nombre?.toLowerCase().includes(q) || p.descripcion?.toLowerCase().includes(q));
  }, [productos, busquedaProd]);

  const erroresCarrito = useMemo(() => {
    const errs = {};
    cartItems.forEach((it) => {
      if (it.cajas === 0 && it.unidadesSueltas === 0) {
        errs[it.productoId] = 'Agrega al menos 1 caja o 1 unidad.';
      }
    });
    return errs;
  }, [cartItems]);

  const hayErroresCarrito = Object.keys(erroresCarrito).length > 0;

  const calcSubCajas    = (it) => it.cajas * (it.unidadesPorCaja ?? 0) * it.precioUnitario;
  const calcSubUnidades = (it) => it.unidadesSueltas * it.precioUnitario;
  const calcSub         = (it) => calcSubCajas(it) + calcSubUnidades(it);

  const subtotalProductos = cartItems.reduce((acc, it) => acc + calcSub(it), 0);
  const envio             = Number(costoEnvio) || 0;
  const totalPedido       = subtotalProductos + envio;

  const validar = () => {
    const e = {};
    if (!destinatario.nombre.trim())   e.nombre  = 'El nombre es obligatorio.';
    if (!destinatario.telefono.trim()) e.telefono = 'El teléfono es obligatorio.';
    if (cartItems.length === 0)        e.items    = 'Agrega al menos un producto.';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const abrirConfirm = () => {
    if (validar()) setShowConfirm(true);
  };

  const confirmarPedido = async () => {
    setEnviando(true);
    const clienteObj = clientes.find((c) => String(c.id) === String(clienteIdSel));
    const body = {
      clienteRuralId:        clienteObj?.id ?? null,
      nombreDestinatario:    destinatario.nombre.trim()        || null,
      telefonoDestinatario:  destinatario.telefono.trim()      || null,
      direccionDestinatario: destinatario.direccion.trim()     || null,
      corregimiento:         destinatario.corregimiento.trim() || null,
      costoEnvio:            envio,
      items: cartItems
        .filter((it) => it.cajas > 0 || it.unidadesSueltas > 0)
        .map((it) => ({
          productoId:       it.productoId,
          cantidadCajas:    it.cajas,
          cantidadUnidades: it.unidadesSueltas,
        })),
    };
    try {
      const respuesta = await api.post('/api/ventas/rural', body);
      setVentaConfirmada(respuesta.data);
      setShowConfirm(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const status = err.response?.status;
      const data   = err.response?.data;
      if (status === 409 || data?.tipo === 'STOCK_INSUFICIENTE') {
        setToast({ show: true, msg: `Stock insuficiente: ${data?.detalle ?? data?.mensaje ?? 'uno o más productos no tienen suficiente stock.'}`, type: 'error' });
      } else {
        setToast({ show: true, msg: data?.mensaje ?? data?.message ?? 'Error al registrar el pedido.', type: 'error' });
      }
      setShowConfirm(false);
    } finally { setEnviando(false); }
  };

  const reiniciar = () => {
    setCartItems([]); setCostoEnvio(''); setDestinatario(EMPTY_DEST); setClienteIdSel('');
    setErrores({}); setVentaConfirmada(null);
  };

  const handleNuevaVenta = () => {
    setIsLeavingSuccess(true);
    setTimeout(() => { setIsLeavingSuccess(false); reiniciar(); }, 280);
  };

  /* ─── RENDER ─── */
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto animate-fade-in-up">

        {/* ══════════════ PANTALLA DE ÉXITO ══════════════ */}
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
                  El pedido fue enviado correctamente y el stock fue descontado.
                </p>
              </div>
              <button onClick={handleNuevaVenta}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-all active:scale-95 shrink-0">
                Nueva venta
              </button>
            </div>

            {/* Resumen */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 space-y-4">
              <p className={labelCls}>Resumen del Pedido</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-zinc-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-inter mb-1">N° Pedido</p>
                  <p className="text-sm font-extrabold text-zinc-900 font-display break-all">
                    {String(ventaConfirmada.ventaId ?? ventaConfirmada.pedidoId ?? '—').slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-inter mb-1">Total</p>
                  <p className="text-sm font-extrabold text-[#9e2016] font-display">
                    {formatCOP(ventaConfirmada.total)}
                  </p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-4 col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-inter mb-1">Fecha</p>
                  <p className="text-sm font-bold text-zinc-900 font-display">
                    {formatFecha(ventaConfirmada.fecha) ?? fechaHoy()}
                  </p>
                </div>
              </div>

              {/* Estado y canal */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold px-3 py-1 rounded-full font-inter uppercase tracking-wide border border-emerald-200">
                  <CheckIcon /> {ventaConfirmada.estado ?? 'CONFIRMADA'}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-zinc-100 text-zinc-600 text-[11px] font-semibold px-3 py-1 rounded-full font-inter uppercase tracking-wide">
                  <TruckIcon size={12} /> {ventaConfirmada.canal ?? 'RURAL'}
                </span>
              </div>

              {/* Destinatario */}
              <div className="bg-zinc-50 rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-inter mb-2">Destinatario</p>
                <p className="text-sm font-bold text-zinc-900 font-display">
                  {(ventaConfirmada.destinatario ?? destinatario).nombre}
                </p>
                <p className="text-xs text-zinc-500 font-inter mt-0.5">
                  {(ventaConfirmada.destinatario ?? destinatario).telefono}
                </p>
                {(ventaConfirmada.destinatario ?? destinatario).direccion && (
                  <p className="text-xs text-zinc-500 font-inter">
                    {(ventaConfirmada.destinatario ?? destinatario).direccion}
                  </p>
                )}
                {(ventaConfirmada.destinatario ?? destinatario).corregimiento && (
                  <p className="text-xs text-zinc-500 font-inter">
                    {(ventaConfirmada.destinatario ?? destinatario).corregimiento}
                  </p>
                )}
              </div>

              {/* Ítems */}
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
                          {it.cajas > 0 && (it.unidadesSueltas ?? it.unidades ?? 0) > 0 && ' + '}
                          {(it.unidadesSueltas ?? it.unidades ?? 0) > 0 && `${it.unidadesSueltas ?? it.unidades} uds sueltas`}
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
                    { id: 'rural',      icon: <TruckIcon />,  label: 'Rural' },
                  ].map(({ id, icon, label }) => (
                    <button key={id} type="button"
                      onClick={() => {
                        if (id === 'ventanilla') { navigate('/ventas/pedidos-ventanilla'); return; }
                        setTipoCliente(id);
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                        tipoCliente === id
                          ? 'border-[#9e2016] bg-[#9e2016]/5 text-[#9e2016]'
                          : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'
                      }`}>
                      {icon}
                      <span className="text-sm font-semibold font-display">{label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {tipoCliente === 'rural' && (
                <>
                  {/* § CLIENTE */}
                  <section className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <p className={labelCls + ' flex items-center gap-2 mb-0'}><UserIcon /> Cliente</p>
                      <button type="button" onClick={() => { setShowNuevo(true); setErrNuevo(''); }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#9e2016] hover:underline font-inter">
                        <UserPlusIcon /> Nuevo cliente
                      </button>
                    </div>

                    {/* Dropdown clientes guardados */}
                    <div>
                      <p className={labelCls}>Clientes Guardados</p>
                      {errorClientes && (
                        <div className="mb-2 px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm animate-slide-down flex items-start gap-2">
                          <span className="shrink-0 mt-0.5"><AlertIcon /></span>
                          <span className="flex-1 font-inter">{errorClientes}</span>
                          <button onClick={() => setErrorClientes('')} className="shrink-0 opacity-60 hover:opacity-100 p-0.5 transition-opacity"><XIcon size={13} /></button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <CustomSelect
                            value={clienteIdSel}
                            onChange={handleSelectCliente}
                            options={[
                              { value: '', label: 'Seleccionar cliente guardado...' },
                              ...clientes.map(c => ({ value: String(c.id), label: c.nombre })),
                            ]}
                            disabled={loadingClientes || isLeavingFields}
                            searchable
                          />
                        </div>
                        {(clienteIdSel || isLeavingFields) && (
                          <button
                            type="button"
                            onClick={handleDeselectCliente}
                            disabled={isLeavingFields}
                            className="shrink-0 w-9 h-[46px] flex items-center justify-center text-zinc-400 hover:text-[#9e2016] border border-zinc-200 hover:border-[#9e2016]/30 rounded-xl transition-all duration-200 active:scale-90 disabled:opacity-40"
                          >
                            <XIcon size={14} />
                          </button>
                        )}
                      </div>
                      {!clienteIdSel && !isLeavingFields && (
                        <p className="text-[11px] text-zinc-400 font-inter mt-1.5">
                          Al seleccionar, los campos se autocompletán automáticamente.
                        </p>
                      )}
                    </div>

                    {/* Campos del destinatario — aparece/desaparece con animación */}
                    {(clienteIdSel || isLeavingFields) && (
                      <div className={`space-y-4 ${isLeavingFields ? 'animate-scale-out' : 'animate-slide-down'}`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={labelCls}><span className="flex items-center gap-1.5"><UserIcon /> Nombre completo</span></label>
                            <input type="text" value={destinatario.nombre} disabled className={inputLockedCls} />
                          </div>
                          <div>
                            <label className={labelCls}><span className="flex items-center gap-1.5"><PhoneIcon /> Teléfono</span></label>
                            <input type="tel" value={destinatario.telefono} disabled className={inputLockedCls} />
                          </div>
                          <div>
                            <label className={labelCls}><span className="flex items-center gap-1.5"><MapPinIcon /> Dirección / Vereda</span></label>
                            <input type="text" value={destinatario.direccion} disabled className={inputLockedCls} />
                          </div>
                          <div>
                            <label className={labelCls}><span className="flex items-center gap-1.5"><LandmarkIcon /> Corregimiento</span></label>
                            <input type="text" value={destinatario.corregimiento} disabled className={inputLockedCls} />
                          </div>
                          <div className="sm:col-span-2">
                            <label className={labelCls}><span className="flex items-center gap-1.5"><MailIcon /> Correo electrónico</span></label>
                            <input type="email" value={destinatario.correo} disabled className={inputLockedCls} />
                          </div>
                        </div>
                        <button type="button" onClick={abrirEditar}
                          className="flex items-center justify-center gap-2 w-full py-2.5 border border-zinc-200 hover:border-[#9e2016]/40 bg-zinc-50 hover:bg-[#9e2016]/5 text-zinc-600 hover:text-[#9e2016] rounded-xl text-xs font-semibold font-inter transition-all duration-200 active:scale-[0.98]">
                          <EditIcon /> Editar datos del cliente
                        </button>
                      </div>
                    )}
                  </section>

                  {/* § PRODUCTOS */}
                  <section className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 space-y-4 animate-fade-in">
                    <p className={labelCls + ' flex items-center gap-2 mb-0'}><PackageIcon /> Productos</p>

                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"><SearchIcon /></span>
                      <input type="text" placeholder="Buscar productos..." value={busquedaProd}
                        onChange={(e) => setBusquedaProd(e.target.value)} className={`${inputCls} pl-10`} />
                    </div>

                    {errores.items && (
                      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                        <span className="text-red-500 shrink-0"><AlertIcon /></span>
                        <p className="text-sm text-red-700 font-inter">{errores.items}</p>
                      </div>
                    )}

                    {cargandoProd ? (
                      <div className="flex items-center justify-center py-16 gap-3">
                        <SpinIcon /><span className="text-sm text-zinc-500 font-inter">Cargando catálogo…</span>
                      </div>
                    ) : errorCatalogo ? (
                      <div className="px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm animate-slide-down flex items-start gap-2">
                        <span className="shrink-0 mt-0.5"><AlertIcon /></span>
                        <span className="flex-1 font-inter">{errorCatalogo}</span>
                        <button onClick={() => setErrorCatalogo('')} className="shrink-0 opacity-60 hover:opacity-100 p-0.5 transition-opacity"><XIcon size={13} /></button>
                      </div>
                    ) : productosFiltrados.length === 0 ? (
                      <div className="text-center py-14 text-zinc-400 text-sm font-inter">No se encontraron productos.</div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {productosFiltrados.map((p) => {
                          const sinStock  = (p.stockActual ?? 0) === 0;
                          const enCarrito = cartItems.some((i) => i.productoId === p.id);
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
                              {/* Imagen / placeholder */}
                              <div className="relative aspect-square bg-zinc-100 flex items-center justify-center overflow-hidden">
                                {p.imagenUrl ? (
                                  <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-4xl font-extrabold text-zinc-200 font-display select-none">
                                    {p.nombre?.charAt(0)?.toUpperCase()}
                                  </span>
                                )}
                                {sinStock ? (
                                  <span className="absolute top-2 left-2 bg-zinc-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-inter">
                                    Sin stock
                                  </span>
                                ) : (
                                  <span className={`absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md font-inter leading-none ${
                                    (p.stockActual ?? 0) <= (p.stockMinimo ?? 0)
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-zinc-100 text-zinc-500'
                                  }`}>
                                    {p.stockActual ?? 0}u
                                  </span>
                                )}
                              </div>
                              <div className="p-3">
                                <p className="text-sm font-bold text-zinc-800 font-display leading-tight">{p.nombre}</p>
                                {p.descripcion && (
                                  <p className="text-[11px] text-zinc-400 font-inter mt-0.5 leading-tight line-clamp-1">{p.descripcion}</p>
                                )}
                                <div className="flex items-center justify-between mt-2.5">
                                  <span className="text-sm font-extrabold text-[#9e2016] font-display">
                                    {formatCOP(p.precioVenta ?? 0)}
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
                    )}
                  </section>
                </>
              )}
            </div>

            {/* ── CARRITO DERECHO (1/4) ── */}
            <div className="lg:col-span-1 lg:sticky lg:top-0">
              <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">

                {/* Header */}
                <div className="px-6 py-4 border-b border-zinc-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-extrabold text-zinc-900 font-display">Carrito de Ventas</h2>
                    {cartItems.length > 0 && (
                      <span className="bg-[#9e2016] text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-inter">
                        {cartItems.length} {cartItems.length === 1 ? 'ÍTEM' : 'ÍTEMS'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 font-inter mt-0.5">Transacción #{transaccionId}</p>
                  <p className="text-[11px] text-zinc-400 font-inter">Fecha de la Transacción: {fechaHoy()}</p>
                </div>

                {/* Items */}
                <div className="px-6 py-4 space-y-5 max-h-[420px] overflow-y-auto">
                  {cartItems.length === 0 ? (
                    <div className="text-center py-10 text-zinc-300 text-sm font-inter">
                      <div className="text-4xl mb-2">🛒</div>
                      Agrega productos desde el catálogo
                    </div>
                  ) : cartItems.map((item) => {
                    const errItem = erroresCarrito[item.productoId];
                    return (
                    <div key={item.productoId} className="space-y-2.5">
                      {/* Producto info */}
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border ${errItem ? 'border-red-300 bg-red-50' : 'bg-zinc-100 border-zinc-200'}`}>
                          {item.imagen
                            ? <img src={item.imagen} alt={item.nombre} className="w-full h-full object-cover" />
                            : <span className="text-zinc-300 text-lg font-bold font-display">{item.nombre?.charAt(0)?.toUpperCase()}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-zinc-900 font-display leading-tight truncate">{item.nombre}</p>
                          <p className="text-[11px] text-zinc-400 font-inter">Unitario: {formatCOP(item.precioUnitario)}</p>
                          {errItem && (
                            <p className="text-[10px] text-red-500 font-inter mt-0.5 font-semibold">⚠ {errItem}</p>
                          )}
                        </div>
                        <button type="button" onClick={() => removeFromCart(item.productoId)}
                          className="text-zinc-300 hover:text-red-400 transition-colors p-0.5 shrink-0">
                          <XIcon size={14} />
                        </button>
                      </div>

                      {/* Fila Caja — solo si el producto viene en cajas */}
                      {item.unidadesPorCaja != null && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-zinc-500 font-inter w-14 shrink-0">Caja</span>
                          <div className="flex items-center gap-1.5">
                            <QtyBtn onClick={() => updateCart(item.productoId, 'cajas', item.cajas - 1)}>−</QtyBtn>
                            <input
                              type="number" min="0" value={item.cajas}
                              onChange={(e) => { const n = parseInt(e.target.value, 10); updateCart(item.productoId, 'cajas', isNaN(n) || n < 0 ? 0 : n); }}
                              className="w-9 text-center text-sm font-bold text-zinc-800 border border-zinc-200 rounded-lg py-0.5 outline-none focus:border-[#9e2016] focus:ring-1 focus:ring-[#9e2016]/20 font-display [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <QtyBtn onClick={() => updateCart(item.productoId, 'cajas', item.cajas + 1)}>+</QtyBtn>
                          </div>
                          <span className="text-sm font-bold text-zinc-800 font-display text-right min-w-[52px]">
                            {formatCOP(calcSubCajas(item))}
                          </span>
                        </div>
                      )}

                      {/* Fila Unidad */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-500 font-inter w-14 shrink-0">Unidad</span>
                        <div className="flex items-center gap-1.5">
                          <QtyBtn onClick={() => updateCart(item.productoId, 'unidadesSueltas', item.unidadesSueltas - 1)}>−</QtyBtn>
                          <input
                            type="number" min="0" value={item.unidadesSueltas}
                            onChange={(e) => { const n = parseInt(e.target.value, 10); updateCart(item.productoId, 'unidadesSueltas', isNaN(n) || n < 0 ? 0 : n); }}
                            className="w-9 text-center text-sm font-bold text-zinc-800 border border-zinc-200 rounded-lg py-0.5 outline-none focus:border-[#9e2016] focus:ring-1 focus:ring-[#9e2016]/20 font-display [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <QtyBtn onClick={() => updateCart(item.productoId, 'unidadesSueltas', item.unidadesSueltas + 1)}>+</QtyBtn>
                        </div>
                        <span className="text-sm font-bold text-zinc-800 font-display text-right min-w-[52px]">
                          {formatCOP(calcSubUnidades(item))}
                        </span>
                      </div>

                      <div className="border-b border-zinc-100" />
                    </div>
                    );
                  })}
                </div>

                {/* Footer: totales + envío + confirmar */}
                <div className="px-6 py-5 border-t border-zinc-100 space-y-3 bg-zinc-50/50">
                  <div className="flex justify-between items-center text-sm font-inter text-zinc-500">
                    <span>Subtotal</span>
                    <span className="font-semibold text-zinc-700">{formatCOP(subtotalProductos)}</span>
                  </div>

                  {/* Envío editable */}
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-sm text-zinc-500 font-inter shrink-0">Envío</span>
                    <div className="relative flex-1 max-w-[130px] ml-auto">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-semibold font-inter">$</span>
                      <input type="number" min={0} placeholder="0" value={costoEnvio}
                        onChange={(e) => setCostoEnvio(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded-lg pl-6 pr-3 py-1.5 text-sm font-semibold text-zinc-700 outline-none focus:border-[#9e2016] focus:ring-1 focus:ring-[#9e2016]/20 transition-all text-right font-inter" />
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center pt-1 border-t border-zinc-200">
                    <span className="text-sm font-bold text-zinc-900 font-display">Total General</span>
                    <span className="text-xl font-extrabold text-[#9e2016] font-display">
                      COP {Number(totalPedido || 0).toLocaleString('es-CO')}
                    </span>
                  </div>

                  {cartItems.length > 0 && !destinatario.nombre.trim() && (
                    <p className="text-[11px] text-amber-600 font-inter text-center bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Selecciona un cliente para continuar.
                    </p>
                  )}

                  {hayErroresCarrito && cartItems.length > 0 && (
                    <p className="text-[11px] text-red-500 font-inter text-center">
                      Corrige los errores en el carrito antes de continuar.
                    </p>
                  )}

                  <button type="button" onClick={abrirConfirm}
                    disabled={enviando || cartItems.length === 0 || !destinatario.nombre.trim() || hayErroresCarrito}
                    className="w-full bg-[#9e2016] hover:bg-[#7c0202] disabled:bg-zinc-300 disabled:cursor-not-allowed text-white rounded-xl py-3.5 text-sm font-bold tracking-wide font-display transition-all duration-200 active:scale-[0.98] shadow-lg shadow-[#9e2016]/25 flex items-center justify-center gap-2">
                    {enviando ? <><SpinIcon /> Procesando…</> : 'COMPLETAR VENTA →'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ── Modal confirmar pedido ── */}
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
                <TruckIcon size={18} /> Confirmar Pedido Rural
              </h3>
              <button onClick={closeConfirm} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition-all"><XIcon /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-zinc-50 rounded-xl p-4 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-inter mb-2">Destinatario</p>
                <p className="text-sm font-bold text-zinc-900 font-display">{destinatario.nombre}</p>
                <p className="text-xs text-zinc-500 font-inter">{destinatario.telefono}</p>
                <p className="text-xs text-zinc-500 font-inter">{destinatario.direccion}</p>
                {destinatario.correo && <p className="text-xs text-zinc-500 font-inter">{destinatario.correo}</p>}
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-inter">Productos ({cartItems.length})</p>
                {cartItems.map((it) => (
                  <div key={it.productoId} className="flex items-center justify-between bg-zinc-50 rounded-xl px-4 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-zinc-800 font-display">{it.nombre}</p>
                      <p className="text-[11px] text-zinc-400 font-inter">
                        {it.cajas > 0 && `${it.cajas} caja${it.cajas > 1 ? 's' : ''}`}
                        {it.cajas > 0 && it.unidadesSueltas > 0 && ' + '}
                        {it.unidadesSueltas > 0 && `${it.unidadesSueltas} ud${it.unidadesSueltas > 1 ? 's' : ''} sueltas`}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-zinc-800 font-display">{formatCOP(calcSub(it))}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-zinc-100 pt-3 space-y-1.5 text-sm font-inter">
                <div className="flex justify-between text-zinc-500"><span>Subtotal</span><span>{formatCOP(subtotalProductos)}</span></div>
                <div className="flex justify-between text-zinc-500"><span>Envío</span><span>{formatCOP(envio)}</span></div>
                <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
                  <span className="font-bold text-zinc-900 font-display">Total</span>
                  <span className="text-lg font-extrabold text-[#9e2016] font-display">{formatCOP(totalPedido)}</span>
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

      {/* ── Modal nuevo cliente (RF33) ── */}
      {showNuevo && createPortal(
        <div
          className={`fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-black/45 backdrop-blur-sm ${isClosingNuevo ? 'animate-fade-out' : 'animate-fade-in'}`}
          onClick={handleCloseNuevo}
        >
          <div
            className={`w-full max-w-md bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] p-7 sm:p-8 ${isClosingNuevo ? 'animate-scale-out' : 'animate-scale-in'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Badge ícono */}
            <div className="w-12 h-12 rounded-2xl bg-[#9e2016]/10 text-[#9e2016] flex items-center justify-center mx-auto mb-4">
              <UserPlusIcon />
            </div>

            <h2 className="font-display text-xl font-bold text-zinc-900 text-center mb-1">
              Registrar Nuevo Cliente
            </h2>
            <p className="text-sm text-zinc-500 font-inter text-center mb-6 leading-relaxed">
              Completa los datos del cliente para autocompletar futuros pedidos rurales.
            </p>

            {errNuevo && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-inter flex items-start gap-2">
                <span className="shrink-0 mt-0.5"><AlertIcon /></span>
                {errNuevo}
              </div>
            )}

            <form onSubmit={guardarNuevoCliente} noValidate className="flex flex-col gap-4">
              {/* Fila 1: Nombre | Teléfono */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Nombre',   key: 'nombre',   type: 'text', ph: 'Nombre completo', req: true },
                  { label: 'Teléfono', key: 'telefono', type: 'tel',  ph: 'Ej: 3001234567',  req: true },
                ].map(({ label, key, type, ph, req }) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-inter">
                      {label}<span className="text-red-500 ml-0.5 normal-case font-normal tracking-normal"> *</span>
                    </label>
                    <input type={type} placeholder={ph} value={nuevoCliente[key]} required
                      onChange={(e) => setNuevoCliente((p) => ({ ...p, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none transition duration-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-[#9e2016] focus:ring-2 focus:ring-[#9e2016]/20 font-inter" />
                  </div>
                ))}
              </div>
              {/* Fila 2: Dirección | Corregimiento */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Dirección',     key: 'direccion',     type: 'text', ph: 'Vereda, finca…'  },
                  { label: 'Corregimiento', key: 'corregimiento', type: 'text', ph: 'Ej: San Faustino' },
                ].map(({ label, key, type, ph }) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-inter">{label}</label>
                    <input type={type} placeholder={ph} value={nuevoCliente[key]}
                      onChange={(e) => setNuevoCliente((p) => ({ ...p, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none transition duration-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-[#9e2016] focus:ring-2 focus:ring-[#9e2016]/20 font-inter" />
                  </div>
                ))}
              </div>
              {/* Fila 3: Correo (completo) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-inter">Correo <span className="normal-case font-normal tracking-normal text-zinc-400">(opcional)</span></label>
                <input type="email" placeholder="correo@ejemplo.com" value={nuevoCliente.correo}
                  onChange={(e) => setNuevoCliente((p) => ({ ...p, correo: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none transition duration-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-[#9e2016] focus:ring-2 focus:ring-[#9e2016]/20 font-inter" />
              </div>

              <button
                type="submit"
                disabled={guardando}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#9e2016] hover:bg-[#7c0202] text-white text-sm font-semibold rounded-xl transition duration-300 active:scale-[0.97] disabled:opacity-60 shadow-[0_2px_8px_rgba(158,32,22,0.25)] mt-1 font-display"
              >
                {guardando
                  ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Guardando…</>
                  : <><UserPlusIcon /> Registrar Cliente</>
                }
              </button>

              <button
                type="button"
                onClick={handleCloseNuevo}
                className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-sm font-medium rounded-xl transition duration-300 active:scale-[0.97] font-inter"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
      {/* ── Modal editar cliente ── */}
      {showEditar && createPortal(
        <div
          className={`fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-black/45 backdrop-blur-sm ${isClosingEditar ? 'animate-fade-out' : 'animate-fade-in'}`}
          onClick={handleCloseEditar}
        >
          <div
            className={`w-full max-w-md bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] p-7 sm:p-8 ${isClosingEditar ? 'animate-scale-out' : 'animate-scale-in'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-[#9e2016]/10 text-[#9e2016] flex items-center justify-center mx-auto mb-4">
              <EditIcon />
            </div>
            <h2 className="font-display text-xl font-bold text-zinc-900 text-center mb-1">
              Editar Cliente
            </h2>
            <p className="text-sm text-zinc-500 font-inter text-center mb-6 leading-relaxed">
              Actualiza los datos del cliente. Los cambios se reflejarán en el pedido actual.
            </p>

            {errEditar && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-inter flex items-start gap-2">
                <span className="shrink-0 mt-0.5"><AlertIcon /></span>
                {errEditar}
              </div>
            )}

            <form onSubmit={guardarEditarCliente} noValidate className="flex flex-col gap-4">
              {/* Fila 1: Nombre | Teléfono */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Nombre',   key: 'nombre',   type: 'text', ph: 'Nombre completo', req: true },
                  { label: 'Teléfono', key: 'telefono', type: 'tel',  ph: 'Ej: 3001234567',  req: true },
                ].map(({ label, key, type, ph }) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-inter">
                      {label}<span className="text-red-500 ml-0.5 normal-case font-normal tracking-normal"> *</span>
                    </label>
                    <input type={type} placeholder={ph} value={editandoCliente[key] ?? ''} required
                      onChange={(e) => setEditandoCliente((p) => ({ ...p, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none transition duration-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-[#9e2016] focus:ring-2 focus:ring-[#9e2016]/20 font-inter" />
                  </div>
                ))}
              </div>
              {/* Fila 2: Dirección | Corregimiento */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Dirección',     key: 'direccion',     type: 'text', ph: 'Vereda, finca…'  },
                  { label: 'Corregimiento', key: 'corregimiento', type: 'text', ph: 'Ej: San Faustino' },
                ].map(({ label, key, type, ph }) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-inter">{label}</label>
                    <input type={type} placeholder={ph} value={editandoCliente[key] ?? ''}
                      onChange={(e) => setEditandoCliente((p) => ({ ...p, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none transition duration-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-[#9e2016] focus:ring-2 focus:ring-[#9e2016]/20 font-inter" />
                  </div>
                ))}
              </div>
              {/* Fila 3: Correo (completo) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-inter">Correo <span className="normal-case font-normal tracking-normal text-zinc-400">(opcional)</span></label>
                <input type="email" placeholder="correo@ejemplo.com" value={editandoCliente.correo ?? ''}
                  onChange={(e) => setEditandoCliente((p) => ({ ...p, correo: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none transition duration-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-[#9e2016] focus:ring-2 focus:ring-[#9e2016]/20 font-inter" />
              </div>

              <button
                type="submit"
                disabled={guardandoEditar}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#9e2016] hover:bg-[#7c0202] text-white text-sm font-semibold rounded-xl transition duration-300 active:scale-[0.97] disabled:opacity-60 shadow-[0_2px_8px_rgba(158,32,22,0.25)] mt-1 font-display"
              >
                {guardandoEditar
                  ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Guardando…</>
                  : <><CheckIcon /> Guardar Cambios</>
                }
              </button>

              <button
                type="button"
                onClick={handleCloseEditar}
                className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-sm font-medium rounded-xl transition duration-300 active:scale-[0.97] font-inter"
              >
                Cancelar
              </button>
            </form>
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
