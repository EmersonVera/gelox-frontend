/**
 * PedidoRural.jsx — RF32 + RF33
 * Toggle tipo cliente · Dropdown clientes guardados · Catálogo en tarjetas
 * Carrito lateral con controles − Caja/Unidad +
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import api from '../../api/axiosConfig';
import CustomSelect from '../../components/ui/CustomSelect';

const formatCOP = (n) => '$' + Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 });
const fechaHoy  = () => new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
const genTx     = () => `GLX-${Math.floor(1000 + Math.random() * 9000)}`;
const EMPTY_DEST  = { nombre: '', telefono: '', direccion: '', correo: '' };
const EMPTY_NUEVO = { nombre: '', telefono: '', direccion: '', correo: '' };

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
  const [errorGlobal, setErrorGlobal]         = useState('');
  const [stockErr, setStockErr]               = useState(null);
  const [pedidoOk, setPedidoOk]               = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [errores, setErrores]                 = useState({});
  const [showNuevo, setShowNuevo]             = useState(false);
  const [nuevoCliente, setNuevoCliente]       = useState(EMPTY_NUEVO);
  const [guardando, setGuardando]             = useState(false);
  const [errNuevo, setErrNuevo]               = useState('');

  /* Cargar catálogo */
  useEffect(() => {
    (async () => {
      setCargandoProd(true);
      try {
        const { data } = await api.get('/api/catalogo/productos', { params: { page: 0, size: 100 } });
        setProductos(Array.isArray(data.content) ? data.content : []);
      } catch { setProductos([]); }
      finally { setCargandoProd(false); }
    })();
  }, []);

  /* Cargar clientes */
  useEffect(() => {
    (async () => {
      setLoadingClientes(true);
      try {
        const { data } = await api.get('/api/clientes', { params: { page: 0, size: 100 } });
        setClientes(Array.isArray(data.content) ? data.content : Array.isArray(data) ? data : []);
      } catch {
        try {
          const { data } = await api.get('/api/clientes/buscar', { params: { telefono: '' } });
          setClientes(Array.isArray(data) ? data : (data.content ?? []));
        } catch { setClientes([]); }
      } finally { setLoadingClientes(false); }
    })();
  }, []);

  const handleSelectCliente = useCallback((id) => {
    setClienteIdSel(id);
    if (!id) { setDestinatario(EMPTY_DEST); return; }
    const cli = clientes.find((c) => String(c.id) === String(id));
    if (cli) {
      setDestinatario({ nombre: cli.nombre ?? '', telefono: cli.telefono ?? '', direccion: cli.direccion ?? '', correo: cli.correo ?? cli.email ?? '' });
      setErrores({});
    }
  }, [clientes]);

  const guardarNuevoCliente = async (e) => {
    e.preventDefault();
    setErrNuevo('');
    if (!nuevoCliente.nombre.trim() || !nuevoCliente.telefono.trim()) {
      setErrNuevo('Nombre y teléfono son obligatorios.'); return;
    }
    setGuardando(true);
    try {
      const { data } = await api.post('/api/clientes', nuevoCliente);
      setClientes((prev) => [...prev, data]);
      setClienteIdSel(String(data.id));
      setDestinatario({ nombre: data.nombre ?? '', telefono: data.telefono ?? '', direccion: data.direccion ?? '', correo: data.correo ?? '' });
      setShowNuevo(false);
      setNuevoCliente(EMPTY_NUEVO);
    } catch (err) {
      setErrNuevo(err.response?.data?.mensaje ?? err.response?.data?.message ?? 'No se pudo registrar el cliente.');
    } finally { setGuardando(false); }
  };

  const addToCart = useCallback((producto) => {
    setCartItems((prev) => {
      const existe = prev.find((i) => i.productoId === producto.id);
      if (existe) return prev.map((i) => i.productoId === producto.id ? { ...i, cajas: i.cajas + 1 } : i);
      return [...prev, {
        productoId:      producto.id,
        nombre:          producto.nombre,
        descripcion:     producto.descripcion ?? '',
        precioUnitario:  producto.precioUnitario ?? producto.precio ?? 0,
        unidadesPorCaja: producto.unidadesPorCaja ?? 12,
        imagen:          producto.imagen ?? producto.imagenUrl ?? null,
        cajas:           1,
        unidadesSueltas: 0,
      }];
    });
    setErrores((p) => ({ ...p, items: '' }));
    setStockErr(null);
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

  const calcSubCajas    = (it) => it.cajas * it.unidadesPorCaja * it.precioUnitario;
  const calcSubUnidades = (it) => it.unidadesSueltas * it.precioUnitario;
  const calcSub         = (it) => calcSubCajas(it) + calcSubUnidades(it);

  const subtotalProductos = cartItems.reduce((acc, it) => acc + calcSub(it), 0);
  const envio             = Number(costoEnvio) || 0;
  const totalPedido       = subtotalProductos + envio;

  const validar = () => {
    const e = {};
    if (!destinatario.nombre.trim())    e.nombre    = 'El nombre es obligatorio.';
    if (!destinatario.telefono.trim())  e.telefono  = 'El teléfono es obligatorio.';
    if (!destinatario.direccion.trim()) e.direccion = 'La dirección es obligatoria.';
    if (cartItems.length === 0)         e.items     = 'Agrega al menos un producto.';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const abrirConfirm = () => {
    if (validar()) { setShowConfirm(true); setErrorGlobal(''); setStockErr(null); }
  };

  const confirmarPedido = async () => {
    setEnviando(true); setErrorGlobal(''); setStockErr(null);
    const clienteObj = clientes.find((c) => String(c.id) === String(clienteIdSel));
    const body = {
      clienteId: clienteObj?.id ?? null,
      destinatario: {
        nombre:    destinatario.nombre.trim(),
        telefono:  destinatario.telefono.trim(),
        direccion: destinatario.direccion.trim(),
        correo:    destinatario.correo.trim() || null,
      },
      items: cartItems
        .filter((it) => it.cajas > 0 || it.unidadesSueltas > 0)
        .map((it) => ({ productoId: it.productoId, cajas: it.cajas, unidadesSueltas: it.unidadesSueltas })),
      costoEnvio: envio,
    };
    try {
      await api.post('/api/ventas/rural', body);
      setPedidoOk(true); setShowConfirm(false);
    } catch (err) {
      const status = err.response?.status;
      const data   = err.response?.data;
      if (status === 409 || data?.tipo === 'STOCK_INSUFICIENTE') {
        setStockErr(data?.detalle ?? data?.mensaje ?? 'Stock insuficiente para uno o más productos.');
      } else {
        setErrorGlobal(data?.mensaje ?? data?.message ?? 'Error al registrar el pedido.');
      }
      setShowConfirm(false);
    } finally { setEnviando(false); }
  };

  const reiniciar = () => {
    setCartItems([]); setCostoEnvio(''); setDestinatario(EMPTY_DEST); setClienteIdSel('');
    setErrores({}); setErrorGlobal(''); setStockErr(null); setPedidoOk(false);
  };

  /* ─── RENDER ─── */
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto animate-fade-in-up">

        {/* Éxito */}
        {pedidoOk && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-4 animate-scale-in">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0"><CheckIcon /></div>
            <div className="flex-1">
              <p className="font-bold text-emerald-800 font-display">¡Venta registrada!</p>
              <p className="text-sm text-emerald-700 font-inter mt-0.5">El pedido fue enviado correctamente y el stock fue descontado.</p>
            </div>
            <button onClick={reiniciar} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-all active:scale-95 shrink-0">Nueva venta</button>
          </div>
        )}

        {/* Error stock */}
        {stockErr && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 animate-scale-in">
            <span className="text-red-500 shrink-0 mt-0.5"><AlertIcon /></span>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-800 font-display">Stock insuficiente</p>
              <p className="text-sm text-red-700 font-inter mt-0.5">{stockErr}</p>
            </div>
            <button onClick={() => setStockErr(null)} className="text-red-300 hover:text-red-500 p-1"><XIcon size={14} /></button>
          </div>
        )}

        {/* Error general */}
        {errorGlobal && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 animate-scale-in">
            <span className="text-red-500 shrink-0 mt-0.5"><AlertIcon /></span>
            <p className="text-sm text-red-700 font-inter flex-1">{errorGlobal}</p>
            <button onClick={() => setErrorGlobal('')} className="text-red-300 hover:text-red-500 p-1"><XIcon size={14} /></button>
          </div>
        )}

        {!pedidoOk && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

            {/* ── COLUMNA IZQUIERDA (3/5) ── */}
            <div className="lg:col-span-3 space-y-5">

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
                        if (id === 'ventanilla') { navigate('/ventas/nueva'); return; }
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
                      <CustomSelect
                        value={clienteIdSel}
                        onChange={handleSelectCliente}
                        options={[
                          { value: '', label: 'Seleccionar cliente guardado...' },
                          ...clientes.map(c => ({ value: String(c.id), label: `${c.nombre} · ${c.telefono}` })),
                        ]}
                        disabled={loadingClientes}
                        searchable
                      />
                      <p className="text-[11px] text-zinc-400 font-inter mt-1.5">
                        Al seleccionar, los campos se autocompletán automáticamente.
                      </p>
                    </div>

                    {/* Campos del destinatario */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}><span className="flex items-center gap-1.5"><UserIcon /> Nombre completo</span></label>
                        <input type="text" placeholder="María Elena Gómez" value={destinatario.nombre}
                          onChange={(e) => { setDestinatario((p) => ({ ...p, nombre: e.target.value })); setErrores((p) => ({ ...p, nombre: '' })); }}
                          className={`${inputCls} ${errores.nombre ? 'border-red-400 focus:ring-red-400/20' : ''}`} />
                        {errores.nombre && <p className="text-xs text-red-500 mt-1 font-inter">{errores.nombre}</p>}
                      </div>
                      <div>
                        <label className={labelCls}><span className="flex items-center gap-1.5"><PhoneIcon /> Teléfono</span></label>
                        <input type="tel" placeholder="312 456 7890" value={destinatario.telefono}
                          onChange={(e) => { setDestinatario((p) => ({ ...p, telefono: e.target.value })); setErrores((p) => ({ ...p, telefono: '' })); }}
                          className={`${inputCls} ${errores.telefono ? 'border-red-400 focus:ring-red-400/20' : ''}`} />
                        {errores.telefono && <p className="text-xs text-red-500 mt-1 font-inter">{errores.telefono}</p>}
                      </div>
                      <div>
                        <label className={labelCls}><span className="flex items-center gap-1.5"><MapPinIcon /> Dirección / Vereda</span></label>
                        <input type="text" placeholder="Vereda La Linda" value={destinatario.direccion}
                          onChange={(e) => { setDestinatario((p) => ({ ...p, direccion: e.target.value })); setErrores((p) => ({ ...p, direccion: '' })); }}
                          className={`${inputCls} ${errores.direccion ? 'border-red-400 focus:ring-red-400/20' : ''}`} />
                        {errores.direccion && <p className="text-xs text-red-500 mt-1 font-inter">{errores.direccion}</p>}
                      </div>
                      <div>
                        <label className={labelCls}>
                          <span className="flex items-center gap-1.5">
                            <MailIcon /> Correo electrónico
                            <span className="text-zinc-400 normal-case font-normal tracking-normal text-[10px]">(opc.)</span>
                          </span>
                        </label>
                        <input type="email" placeholder="maria.gomez@ruralmail.com" value={destinatario.correo}
                          onChange={(e) => setDestinatario((p) => ({ ...p, correo: e.target.value }))} className={inputCls} />
                      </div>
                    </div>
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
                    ) : productosFiltrados.length === 0 ? (
                      <div className="text-center py-14 text-zinc-400 text-sm font-inter">No se encontraron productos.</div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {productosFiltrados.map((p) => {
                          const enCarrito = cartItems.some((i) => i.productoId === p.id);
                          return (
                            <div key={p.id}
                              className={`bg-white border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                                enCarrito ? 'border-[#9e2016]/40 ring-1 ring-[#9e2016]/20' : 'border-zinc-200'
                              }`}>
                              {/* Imagen / placeholder */}
                              <div className="aspect-square bg-zinc-100 flex items-center justify-center overflow-hidden">
                                {(p.imagen || p.imagenUrl) ? (
                                  <img src={p.imagen ?? p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-4xl font-extrabold text-zinc-200 font-display select-none">
                                    {p.nombre?.charAt(0)?.toUpperCase()}
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
                                    {formatCOP(p.precioUnitario ?? p.precio ?? 0)}
                                  </span>
                                  <button type="button" onClick={() => addToCart(p)}
                                    className="w-7 h-7 rounded-full bg-[#9e2016] hover:bg-[#7c0202] text-white flex items-center justify-center text-lg font-bold transition-all duration-200 active:scale-90 shadow-sm shadow-[#9e2016]/30">
                                    +
                                  </button>
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

            {/* ── CARRITO DERECHO (2/5) ── */}
            <div className="lg:col-span-2 lg:sticky lg:top-0">
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
                  ) : cartItems.map((item) => (
                    <div key={item.productoId} className="space-y-2.5">
                      {/* Producto info */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 overflow-hidden border border-zinc-200">
                          {item.imagen
                            ? <img src={item.imagen} alt={item.nombre} className="w-full h-full object-cover" />
                            : <span className="text-zinc-300 text-lg font-bold font-display">{item.nombre?.charAt(0)?.toUpperCase()}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-zinc-900 font-display leading-tight truncate">{item.nombre}</p>
                          <p className="text-[11px] text-zinc-400 font-inter">Unitario: {formatCOP(item.precioUnitario)}</p>
                        </div>
                        <button type="button" onClick={() => removeFromCart(item.productoId)}
                          className="text-zinc-300 hover:text-red-400 transition-colors p-0.5 shrink-0">
                          <XIcon size={14} />
                        </button>
                      </div>

                      {/* Fila Caja */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-500 font-inter w-14 shrink-0">Caja</span>
                        <div className="flex items-center gap-2">
                          <QtyBtn onClick={() => updateCart(item.productoId, 'cajas', item.cajas - 1)}>−</QtyBtn>
                          <span className="text-sm font-bold text-zinc-800 w-5 text-center font-display">{item.cajas}</span>
                          <QtyBtn onClick={() => updateCart(item.productoId, 'cajas', item.cajas + 1)}>+</QtyBtn>
                        </div>
                        <span className="text-sm font-bold text-zinc-800 font-display text-right min-w-[60px]">
                          {formatCOP(calcSubCajas(item))}
                        </span>
                      </div>

                      {/* Fila Unidad */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-500 font-inter w-14 shrink-0">Unidad</span>
                        <div className="flex items-center gap-2">
                          <QtyBtn onClick={() => updateCart(item.productoId, 'unidadesSueltas', item.unidadesSueltas - 1)}>−</QtyBtn>
                          <span className="text-sm font-bold text-zinc-800 w-5 text-center font-display">{item.unidadesSueltas}</span>
                          <QtyBtn onClick={() => updateCart(item.productoId, 'unidadesSueltas', item.unidadesSueltas + 1)}>+</QtyBtn>
                        </div>
                        <span className="text-sm font-bold text-zinc-800 font-display text-right min-w-[60px]">
                          {formatCOP(calcSubUnidades(item))}
                        </span>
                      </div>

                      <div className="border-b border-zinc-100" />
                    </div>
                  ))}
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

                  <button type="button" onClick={abrirConfirm}
                    disabled={enviando || cartItems.length === 0}
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
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
              <h3 className="text-base font-bold text-zinc-900 font-display flex items-center gap-2">
                <TruckIcon size={18} /> Confirmar Pedido Rural
              </h3>
              <button onClick={() => setShowConfirm(false)} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition-all"><XIcon /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto">
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
            <div className="flex gap-3 px-6 py-5 border-t border-zinc-100">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl py-3 text-sm font-semibold transition-all active:scale-95 font-inter">
                Editar
              </button>
              <button onClick={confirmarPedido} disabled={enviando}
                className="flex-1 bg-[#9e2016] hover:bg-[#7c0202] text-white rounded-xl py-3 text-sm font-bold transition-all active:scale-95 shadow-lg shadow-[#9e2016]/25 font-display disabled:opacity-60 flex items-center justify-center gap-2">
                {enviando ? <><SpinIcon /> Confirmando…</> : <><CheckIcon /> Confirmar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal nuevo cliente (RF33) ── */}
      {showNuevo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
              <h3 className="text-base font-bold text-zinc-900 font-display flex items-center gap-2">
                <UserPlusIcon /> Registrar Nuevo Cliente
              </h3>
              <button onClick={() => { setShowNuevo(false); setErrNuevo(''); }}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition-all"><XIcon /></button>
            </div>
            <form onSubmit={guardarNuevoCliente}>
              <div className="p-6 space-y-4">
                {errNuevo && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
                    <span className="text-red-500 shrink-0 mt-0.5"><AlertIcon /></span>
                    <p className="text-sm text-red-700 font-inter">{errNuevo}</p>
                  </div>
                )}
                {[
                  { label: 'Nombre',    key: 'nombre',    type: 'text',  ph: 'Nombre completo',            req: true  },
                  { label: 'Teléfono',  key: 'telefono',  type: 'tel',   ph: 'Ej: 3001234567',             req: true  },
                  { label: 'Dirección', key: 'direccion', type: 'text',  ph: 'Vereda, finca…',             req: false },
                  { label: 'Correo',    key: 'correo',    type: 'email', ph: 'correo@ejemplo.com',         req: false },
                ].map(({ label, key, type, ph, req }) => (
                  <div key={key}>
                    <label className={labelCls}>
                      {label} {req && <span className="text-red-500 normal-case font-normal tracking-normal">*</span>}
                    </label>
                    <input type={type} placeholder={ph} value={nuevoCliente[key]}
                      onChange={(e) => setNuevoCliente((p) => ({ ...p, [key]: e.target.value }))}
                      className={inputCls} required={req} />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 px-6 py-5 border-t border-zinc-100">
                <button type="button" onClick={() => { setShowNuevo(false); setErrNuevo(''); }}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl py-3 text-sm font-semibold transition-all active:scale-95 font-inter">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando}
                  className="flex-1 bg-[#9e2016] hover:bg-[#7c0202] text-white rounded-xl py-3 text-sm font-bold transition-all active:scale-95 shadow-lg shadow-[#9e2016]/25 font-display disabled:opacity-60 flex items-center justify-center gap-2">
                  {guardando ? <><SpinIcon /> Guardando…</> : <><UserPlusIcon /> Registrar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
