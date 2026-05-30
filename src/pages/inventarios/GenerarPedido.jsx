// src/pages/inventarios/GenerarPedido.jsx — RF21: Generar Pedido a Proveedor
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/AppLayout';
import CantidadControl from '../../components/inventarios/CantidadControl';
import SuccessToast from '../../components/SuccessToast';

const CATEGORIAS = ['Todos', 'Paletas', 'Conos', 'Vasos', 'Familiares'];
const base = import.meta.env.VITE_API_BASE_URL ?? '';

export default function GenerarPedido() {
  const { token } = useAuth();
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [busqueda, setBusqueda]               = useState('');
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]); // [{ producto, cajas, unidades }]
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [errorProductos, setErrorProductos] = useState('');
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  const fetchProductos = useCallback(async () => {
    setCargando(true);
    setErrorProductos('');
    try {
      const params = new URLSearchParams({ page: 0, size: 300 });
      if (categoriaActiva !== 'Todos') params.set('categoria', categoriaActiva.toUpperCase());
      const res = await fetch(`${base}/api/catalogo/productos?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) throw Object.assign(new Error(), { status: 401 });
        if (res.status === 403) throw Object.assign(new Error(), { status: 403 });
        if (res.status >= 500)  throw Object.assign(new Error(), { status: 500 });
        throw Object.assign(new Error(), { status: res.status });
      }
      const data = await res.json();
      const list = Array.isArray(data.content) ? data.content : (data.productos ?? data.content ?? data);
      setProductos(Array.isArray(list) ? list : []);
    } catch (e) {
      setProductos([]);
      const status = e?.status;
      if (!status || e instanceof TypeError)
        setErrorProductos('Sin conexión a internet. No se pudo cargar el catálogo de productos.');
      else if (status === 401)
        setErrorProductos('Tu sesión ha expirado. Vuelve a iniciar sesión.');
      else if (status === 403)
        setErrorProductos('No tienes permisos para ver el catálogo de productos.');
      else if (status >= 500)
        setErrorProductos('Error en el servidor al cargar el catálogo. Intenta más tarde.');
      else
        setErrorProductos('No se pudo cargar el catálogo de productos. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }, [token, categoriaActiva]);

  useEffect(() => { fetchProductos(); }, [fetchProductos]);

  const toggleSeleccionar = (p) => {
    const enCarrito = carrito.find(i => i.producto.id === p.id);
    if (enCarrito) {
      setCarrito(prev => prev.filter(i => i.producto.id !== p.id));
    } else {
      setCarrito(prev => [...prev, {
        producto: p,
        cajas:    p.unidadesPorCaja != null ? 1 : 0,
        unidades: p.unidadesPorCaja != null ? 0 : 1,
      }]);
    }
  };

  const eliminarDelCarrito = (id) =>
    setCarrito(prev => prev.filter(i => i.producto.id !== id));

  const vaciarCarrito = () => setCarrito([]);

  const actualizarCantidad = (id, campo, valor) => {
    setCarrito(prev =>
      prev.map(i =>
        i.producto.id === id
          ? { ...i, [campo]: Math.max(0, Number(valor) || 0) }
          : i
      )
    );
  };

  const totalCajas    = carrito.reduce((s, i) => s + i.cajas, 0);
  const totalUnidades = carrito.reduce((s, i) => s + i.unidades, 0);

  const erroresCarrito = carrito.reduce((acc, it) => {
    if (it.cajas === 0 && it.unidades === 0) acc[it.producto.id] = 'Agrega al menos 1 caja o 1 unidad.';
    return acc;
  }, {});
  const hayErroresCarrito = Object.keys(erroresCarrito).length > 0;

  const handleGenerarExcel = async () => {
    if (carrito.length === 0) return;
    setGenerando(true);
    try {
      const res = await fetch(`${base}/api/inventario/pedidos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: carrito.map(i => ({
            productoId:       i.producto.id,
            cantidadCajas:    i.cajas,
            cantidadUnidades: i.unidades,
          })),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.mensaje ?? errData.message ?? '';
        if (res.status === 400) throw new Error(msg || 'Datos del pedido inválidos. Revisa las cantidades.');
        if (res.status >= 500)  throw new Error('Error en el servidor al generar el pedido. Intenta más tarde.');
        throw new Error(msg || 'No se pudo generar el pedido Excel.');
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `pedido-nutresa-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      vaciarCarrito();
      setToast({ show: true, msg: 'Pedido generado y descargado correctamente.', type: 'success' });
    } catch (e) {
      setToast({ show: true, msg: e.message || 'No se pudo generar el archivo Excel. Intenta de nuevo.', type: 'error' });
    } finally {
      setGenerando(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div>
          <p className="font-['Inter'] font-bold text-[11px] uppercase tracking-[0.55px] text-[#9e2016] flex items-center gap-1 mb-1">
            <span>▣</span> Módulo de Inventarios
          </p>
          <h1 className="font-['Manrope'] font-bold text-[30px] text-[#1b1b1c] tracking-[-0.75px]">
            Generar Pedido
          </h1>
        </div>

        {/* Error catálogo */}
        {errorProductos && (
          <div className="bg-[#fef2f2] border border-[#fca5a5] rounded-[10px] px-4 py-3 flex items-start gap-2.5">
            <svg width="15" height="15" className="shrink-0 mt-0.5 text-[#dc2626]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span className="font-['Inter'] font-medium text-[14px] text-[#dc2626] flex-1">{errorProductos}</span>
            <button onClick={() => setErrorProductos('')} className="text-[#dc2626] opacity-60 hover:opacity-100 transition-opacity">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}

        <div className="flex gap-6 items-start">
          {/* ── Catálogo izquierda ── */}
          <div className="flex-1 flex flex-col gap-5">

            {/* Barra de búsqueda */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29e]" width="16" height="16" fill="none" viewBox="0 0 16 16">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar producto..."
                className="bg-[#f6f3f3] border-none rounded-[8px] pl-10 pr-4 py-2.5 w-full font-['Inter'] text-[14px] text-[#1b1b1c] outline-none focus:ring-2 focus:ring-[#9e2016]/20"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a8a29e] hover:text-[#78716c] cursor-pointer transition-colors"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Pills de categoría */}
            <div className="flex gap-2 flex-wrap">
              {CATEGORIAS.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoriaActiva(cat)}
                  className={`px-4 py-1.5 rounded-full font-['Inter'] font-medium text-[14px] cursor-pointer transition-colors ${
                    categoriaActiva === cat
                      ? 'bg-[#9e2016] text-white'
                      : 'bg-white border border-[#e7e5e4] text-[#1b1b1c] hover:border-[#9e2016]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Grid de productos */}
            {(() => {
              const productosFiltrados = busqueda
                ? productos.filter(p => p.nombre?.toLowerCase().includes(busqueda.toLowerCase()))
                : productos;
              return cargando ? (
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div
                    key={i}
                    className="bg-white rounded-[12px] h-[320px] animate-pulse border border-[#f5f5f4]"
                  />
                ))}
              </div>
            ) : productosFiltrados.length === 0 ? (
              <p className="font-['Inter'] text-[14px] text-[#a8a29e] text-center py-12">
                {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay productos en esta categoría.'}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {productosFiltrados.map(p => {
                  const enCarrito = !!carrito.find(i => i.producto.id === p.id);
                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-[12px] border border-[#f5f5f4] overflow-hidden flex flex-col"
                    >
                      {/* Imagen */}
                      <div className="h-[160px] bg-[#f6f3f3]">
                        {p.imagenUrl || p.imagen_url
                          ? (
                            <img
                              src={p.imagenUrl ?? p.imagen_url}
                              alt={p.nombre}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#a8a29e] text-[12px]">
                              Sin imagen
                            </div>
                          )
                        }
                      </div>

                      {/* Contenido */}
                      <div className="p-4 flex flex-col gap-2 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-['Manrope'] font-semibold text-[15px] text-[#1b1b1c] leading-[20px]">
                            {p.nombre}
                          </span>
                          <span className="bg-[#f6f3f3] text-[#57534e] font-['Inter'] font-medium text-[11px] uppercase px-2 py-0.5 rounded-full shrink-0">
                            {p.categoria}
                          </span>
                        </div>
                        <p className="font-['Inter'] font-normal text-[13px] text-[#78716c] leading-[18px] line-clamp-2 flex-1">
                          {p.descripcion}
                        </p>
                        <button
                          onClick={() => toggleSeleccionar(p)}
                          className={`flex items-center justify-center gap-2 border rounded-full px-4 py-2 font-['Inter'] font-semibold text-[13px] cursor-pointer transition-colors mt-1 ${
                            enCarrito
                              ? 'bg-[#9e2016] border-[#9e2016] text-white hover:bg-[#c0392b] hover:border-[#c0392b]'
                              : 'border-[#e7e5e4] text-[#1b1b1c] hover:border-[#9e2016]'
                          }`}
                        >
                          <span className="text-[16px] font-bold" style={{ color: enCarrito ? 'white' : '#9e2016' }}>
                            {enCarrito ? '−' : '+'}
                          </span>
                          {enCarrito ? 'Quitar' : 'Seleccionar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );})()}
          </div>

          {/* ── Panel carrito derecha ── */}
          <div className="w-[340px] shrink-0 sticky top-8">
            <div className="bg-white rounded-[12px] border border-[#f5f5f4] p-5 flex flex-col gap-4">

              {/* Header carrito */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[#9e2016]">🛒</span>
                  <span className="font-['Manrope'] font-bold text-[16px] text-[#1b1b1c]">
                    Carrito de Pedido
                  </span>
                </div>
                {carrito.length > 0 && (
                  <span className="bg-[#9e2016] text-white font-['Inter'] font-bold text-[11px] px-2 py-0.5 rounded-full">
                    {carrito.length} ÍTEMS
                  </span>
                )}
              </div>

              {carrito.length === 0 ? (
                <p className="font-['Inter'] font-normal text-[13px] text-[#a8a29e] text-center py-6">
                  Selecciona productos del catálogo
                </p>
              ) : (
                <>
                  {/* Ítems */}
                  <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-1">
                    {carrito.map(item => {
                      const errItem = erroresCarrito[item.producto.id];
                      return (
                      <div
                        key={item.producto.id}
                        className="flex flex-col gap-2 pb-3 border-b border-[#fafaf9]"
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-10 h-10 rounded-[8px] bg-[#f6f3f3] shrink-0 overflow-hidden">
                            {(item.producto.imagenUrl || item.producto.imagen_url) && (
                              <img
                                src={item.producto.imagenUrl ?? item.producto.imagen_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-['Manrope'] font-semibold text-[13px] text-[#1b1b1c] leading-[18px] truncate">
                              {item.producto.nombre}
                            </p>
                            <p className="font-['Inter'] font-normal text-[11px] text-[#a8a29e]">
                              {item.producto.unidadMedida ?? item.producto.unidad_medida}
                            </p>
                            {errItem && (
                              <p className="font-['Inter'] font-semibold text-[10px] text-[#dc2626] mt-0.5">⚠ {errItem}</p>
                            )}
                          </div>
                          <button
                            onClick={() => eliminarDelCarrito(item.producto.id)}
                            className="text-[#a8a29e] hover:text-[#dc2626] cursor-pointer transition-colors shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                        {item.producto.unidadesPorCaja != null && (
                          <CantidadControl
                            label="Caja"
                            value={item.cajas}
                            onMinus={() => actualizarCantidad(item.producto.id, 'cajas', item.cajas - 1)}
                            onPlus={() => actualizarCantidad(item.producto.id, 'cajas', item.cajas + 1)}
                            onChange={(v) => actualizarCantidad(item.producto.id, 'cajas', v)}
                            hasError={!!errItem}
                          />
                        )}
                        <CantidadControl
                          label="Unidad"
                          value={item.unidades}
                          onMinus={() => actualizarCantidad(item.producto.id, 'unidades', item.unidades - 1)}
                          onPlus={() => actualizarCantidad(item.producto.id, 'unidades', item.unidades + 1)}
                          onChange={(v) => actualizarCantidad(item.producto.id, 'unidades', v)}
                          hasError={!!errItem}
                        />
                      </div>
                      );
                    })}
                  </div>

                  {/* Totales */}
                  <div className="bg-[#fafaf9] rounded-[8px] p-3 flex items-center">
                    <div className="flex-1 text-center">
                      <p className="font-['Manrope'] font-bold text-[22px] text-[#1b1b1c] leading-none">
                        {totalCajas}
                      </p>
                      <p className="font-['Inter'] font-semibold text-[10px] uppercase tracking-[0.5px] text-[#a8a29e] mt-1">
                        Cajas
                      </p>
                    </div>
                    <div className="w-px h-9 bg-[#e7e5e4] shrink-0" />
                    <div className="flex-1 text-center">
                      <p className="font-['Manrope'] font-bold text-[22px] text-[#1b1b1c] leading-none">
                        {totalUnidades}
                      </p>
                      <p className="font-['Inter'] font-semibold text-[10px] uppercase tracking-[0.5px] text-[#a8a29e] mt-1">
                        Unidades
                      </p>
                    </div>
                  </div>

                  {/* Error global carrito */}
                  {hayErroresCarrito && (
                    <p className="font-['Inter'] text-[11px] text-[#dc2626] text-center">
                      Corrige los errores en el carrito antes de continuar.
                    </p>
                  )}

                  {/* Botón Excel */}
                  <button
                    onClick={handleGenerarExcel}
                    disabled={generando || hayErroresCarrito}
                    className="w-full bg-[#9e2016] hover:bg-[#c0392b] disabled:opacity-70 disabled:cursor-not-allowed text-white font-['Manrope'] font-bold text-[16px] rounded-[8px] py-3 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    {generando ? (
                      <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin shrink-0" />Generando...</>
                    ) : 'Generar Excel ↓'}
                  </button>

                  {/* Vaciar */}
                  <button
                    onClick={vaciarCarrito}
                    className="font-['Inter'] font-normal text-[13px] text-[#a8a29e] underline text-center cursor-pointer hover:text-[#78716c] transition-colors"
                  >
                    Vaciar carrito
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <SuccessToast
        message={toast.msg}
        show={toast.show}
        onClose={() => setToast(t => ({ ...t, show: false }))}
        type={toast.type}
      />
    </AppLayout>
  );
}
