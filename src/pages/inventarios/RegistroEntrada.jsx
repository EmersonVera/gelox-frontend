// src/pages/inventarios/RegistroEntrada.jsx — RF23: Registro de Entrada de Mercancía
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import CantidadControl from '../../components/inventarios/CantidadControl';
import CustomSelect from '../../components/ui/CustomSelect';

const CATEGORIAS = ['Todos', 'Paletas', 'Conos', 'Vaso', 'Litros'];
const base = import.meta.env.VITE_API_BASE_URL ?? '';

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function formatFecha(fecha) {
  if (!fecha) return '—';
  const [año, mes, dia] = String(fecha).split('-').map(Number);
  return `${dia} ${MESES[mes - 1]} ${año}`;
}

export default function RegistroEntrada() {
  const { token }   = useAuth();
  const navigate    = useNavigate();
  const [pedidos, setPedidos]                       = useState([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState('');
  const [categoriaActiva, setCategoriaActiva]       = useState('Todos');
  const [busqueda, setBusqueda]                     = useState('');
  const [productos, setProductos]                   = useState([]);
  const [carrito, setCarrito]                       = useState([]);
  const [cargando, setCargando]                     = useState(true);
  const [cargandoPedido, setCargandoPedido]         = useState(false);
  const [confirmando, setConfirmando]               = useState(false);
  const [resumen, setResumen]                       = useState(null);

  // Cargar pedidos PENDIENTES
  // Nota: GET /api/inventario/pedidos aún no está implementado en el backend.
  // El pedidoId es opcional en RegistrarEntradaRequest — si no se selecciona,
  // la entrada se registra como entrada directa sin asociar pedido (RF23).
  useEffect(() => {
    fetch(`${base}/api/inventario/pedidos?estado=PENDIENTE`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        // 500/404/405 = endpoint no implementado aún en el backend → lista vacía silenciosa
        if (!r.ok) return [];
        return r.json();
      })
      .then(d => {
        const list = d.pedidos ?? d.content ?? d;
        setPedidos(Array.isArray(list) ? list : []);
      })
      .catch(() => { /* endpoint no disponible, continuar sin pedidos */ });
  }, [token]);

  // Cargar catálogo según categoría
  const fetchProductos = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (categoriaActiva !== 'Todos') params.set('categoria', categoriaActiva);
      const res = await fetch(`${base}/api/catalogo/productos?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`catalogo ${res.status}`);
      const data = await res.json();
      const list = data.productos ?? data.content ?? data;
      setProductos(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('fetchProductos:', e);
      setProductos([]);
    } finally {
      setCargando(false);
    }
  }, [token, categoriaActiva]);

  useEffect(() => { fetchProductos(); }, [fetchProductos]);

  // Cuando se selecciona un pedido, cargar sus ítems en el carrito automáticamente
  useEffect(() => {
    if (!pedidoSeleccionado) {
      setCarrito([]);
      return;
    }
    setCargandoPedido(true);
    fetch(`${base}/api/inventario/pedidos/${pedidoSeleccionado}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.items?.length) {
          setCarrito(
            data.items.map(item => ({
              producto: {
                id:             item.productoId,
                nombre:         item.nombre,
                codigoTecnico:  item.codigoTecnico,
              },
              cajas:    item.cantidadSolicitada,
              unidades: 0,
            }))
          );
        } else {
          setCarrito([]);
        }
      })
      .catch(() => setCarrito([]))
      .finally(() => setCargandoPedido(false));
  }, [pedidoSeleccionado, token]);

  const toggleSeleccionar = (p) => {
    const enCarrito = carrito.find(i => i.producto.id === p.id);
    if (enCarrito) {
      setCarrito(prev => prev.filter(i => i.producto.id !== p.id));
    } else {
      setCarrito(prev => [...prev, { producto: p, cajas: 1, unidades: 0 }]);
    }
  };

  const eliminar = (id) =>
    setCarrito(prev => prev.filter(i => i.producto.id !== id));

  const actualizar = (id, campo, delta) =>
    setCarrito(prev =>
      prev.map(i =>
        i.producto.id === id ? { ...i, [campo]: Math.max(0, i[campo] + delta) } : i
      )
    );

  const handleConfirmar = async () => {
    if (carrito.length === 0) return;
    setConfirmando(true);
    try {
      const res = await fetch(`${base}/api/inventario/entradas`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          // RF22+RF23 — RegistrarEntradaRequest: pedidoId (opcional) + items[].productoId + cantidadRecibida
          pedidoId: pedidoSeleccionado || null,
          items: carrito.map(i => ({
            productoId:       i.producto.id,
            cantidadRecibida: i.cajas + i.unidades,
          })),
        }),
      });
      if (!res.ok) throw new Error('Error al confirmar ingreso');
      const data = await res.json();
      setResumen(data);
      setCarrito([]);
    } catch (e) {
      console.error(e);
    } finally {
      setConfirmando(false);
    }
  };

  const totalCajas    = carrito.reduce((s, i) => s + i.cajas, 0);
  const totalUnidades = carrito.reduce((s, i) => s + i.unidades, 0);

  // ── Vista resumen post-confirmación ──
  if (resumen) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="bg-white rounded-[12px] border border-[#f5f5f4] p-8 max-w-[480px] w-full text-center flex flex-col gap-4">
            <div className="w-14 h-14 bg-[#f0fdf4] rounded-full flex items-center justify-center text-[28px] mx-auto">
              ✓
            </div>
            <h2 className="font-['Manrope'] font-bold text-[22px] text-[#1b1b1c]">
              Ingreso Confirmado
            </h2>
            <p className="font-['Inter'] font-normal text-[14px] text-[#78716c]">
              El stock ha sido actualizado automáticamente en el sistema.
            </p>
            {/* RF22 — comparacion por producto (si se vinculó un pedido) */}
            {resumen.comparacion?.map(c => (
              <div
                key={c.productoId}
                className="flex items-center justify-between py-2 border-b border-[#fafaf9]"
              >
                <span className="font-['Inter'] font-medium text-[14px] text-[#1b1b1c]">
                  {c.nombre}
                </span>
                <span className={`font-['Inter'] font-semibold text-[13px] px-2 py-0.5 rounded-full ${
                  c.estado === 'CORRECTO'  ? 'bg-[#f0fdf4] text-[#16a34a]' :
                  c.estado === 'FALTANTE'  ? 'bg-[#fef2f2] text-[#dc2626]' :
                                             'bg-[#fefce8] text-[#ca8a04]'
                }`}>
                  {c.cantidadRecibida} / {c.cantidadSolicitada} — {c.estado}
                </span>
              </div>
            ))}
            {/* RF23 — stock actualizado por producto */}
            {!resumen.comparacion && resumen.stockActualizado?.map(s => (
              <div
                key={s.productoId}
                className="flex items-center justify-between py-2 border-b border-[#fafaf9]"
              >
                <span className="font-['Inter'] font-medium text-[14px] text-[#1b1b1c]">
                  {s.nombre}
                </span>
                <span className="font-['Inter'] font-semibold text-[14px] text-[#16a34a]">
                  Stock: {s.nuevoStock}
                </span>
              </div>
            ))}
            <button
              onClick={() => navigate('/inventarios/reporte-pedido')}
              className="mt-2 bg-[#9e2016] text-white font-['Manrope'] font-bold text-[14px] rounded-[8px] px-6 py-3 cursor-pointer hover:bg-[#c0392b] transition-colors"
            >
              Ver Reporte de Pedidos
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div>
          <p className="font-['Inter'] font-bold text-[11px] uppercase tracking-[0.55px] text-[#9e2016] mb-1">
            ▣ Módulo de Inventarios
          </p>
          <h1 className="font-['Manrope'] font-bold text-[30px] text-[#1b1b1c] tracking-[-0.75px]">
            Registro Entrada
          </h1>
        </div>

        {/* Selector de pedido */}
        <div>
          <label className="font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#1b1b1c] mb-2 block">
            Selecciona Pedido
          </label>
          <CustomSelect
            value={pedidoSeleccionado}
            onChange={setPedidoSeleccionado}
            options={[
              { value: '', label: '-- Seleccionar pedido --' },
              ...pedidos.map(p => ({
                value: String(p.id),
                label: `${formatFecha(p.fecha)}${p.notas ? ' — ' + p.notas : ''}  #${p.id.toString().substring(0, 8).toUpperCase()}`,
              })),
            ]}
            className="min-w-[280px]"
            size="sm"
          />
        </div>

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

            {/* Pills */}
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

            {/* Grid productos */}
            {(() => {
              const productosFiltrados = busqueda
                ? productos.filter(p => p.nombre?.toLowerCase().includes(busqueda.toLowerCase()))
                : productos;
              return cargando ? (
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    className="bg-white rounded-[12px] h-[300px] animate-pulse border border-[#f5f5f4]"
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
                      <div className="h-[160px] bg-[#f6f3f3]">
                        {(p.imagenUrl || p.imagen_url) && (
                          <img
                            src={p.imagenUrl ?? p.imagen_url}
                            alt={p.nombre}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="p-4 flex flex-col gap-2 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-['Manrope'] font-semibold text-[15px] text-[#1b1b1c]">
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
                          className={`flex items-center justify-center gap-2 border rounded-full px-4 py-2 font-['Inter'] font-semibold text-[13px] cursor-pointer transition-colors ${
                            enCarrito
                              ? 'bg-[#9e2016] border-[#9e2016] text-white hover:bg-[#c0392b] hover:border-[#c0392b]'
                              : 'border-[#e7e5e4] text-[#1b1b1c] hover:border-[#9e2016]'
                          }`}
                        >
                          <span style={{ color: enCarrito ? 'white' : '#9e2016' }}>
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

          {/* ── Panel carrito entrada ── */}
          <div className="w-[340px] shrink-0 sticky top-8 flex flex-col gap-4">
            <div className="bg-white rounded-[12px] border border-[#f5f5f4] p-5 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[#9e2016]">🛒</span>
                  <span className="font-['Manrope'] font-bold text-[16px] text-[#1b1b1c]">
                    Carrito de Entrada
                  </span>
                </div>
                {carrito.length > 0 && (
                  <span className="bg-[#9e2016] text-white font-['Inter'] font-bold text-[11px] px-2 py-0.5 rounded-full">
                    {carrito.length} ÍTEMS
                  </span>
                )}
              </div>

              {cargandoPedido ? (
                <div className="flex flex-col items-center gap-2 py-6">
                  <div className="w-6 h-6 border-2 border-[#9e2016] border-t-transparent rounded-full animate-spin" />
                  <p className="font-['Inter'] font-normal text-[12px] text-[#a8a29e]">
                    Cargando items del pedido…
                  </p>
                </div>
              ) : carrito.length === 0 ? (
                <p className="font-['Inter'] font-normal text-[13px] text-[#a8a29e] text-center py-6">
                  Selecciona productos a ingresar
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-4 max-h-[360px] overflow-y-auto pr-1">
                    {carrito.map(item => (
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
                            <p className="font-['Manrope'] font-semibold text-[13px] text-[#1b1b1c] truncate">
                              {item.producto.nombre}
                            </p>
                            <p className="font-['Inter'] font-normal text-[11px] text-[#a8a29e]">
                              {item.producto.unidadMedida ?? item.producto.unidad_medida}
                            </p>
                          </div>
                          <button
                            onClick={() => eliminar(item.producto.id)}
                            className="text-[#a8a29e] hover:text-[#dc2626] cursor-pointer transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                        <CantidadControl
                          label="Caja"
                          value={item.cajas}
                          onMinus={() => actualizar(item.producto.id, 'cajas', -1)}
                          onPlus={() => actualizar(item.producto.id, 'cajas', 1)}
                        />
                        <CantidadControl
                          label="Unidad"
                          value={item.unidades}
                          onMinus={() => actualizar(item.producto.id, 'unidades', -1)}
                          onPlus={() => actualizar(item.producto.id, 'unidades', 1)}
                        />
                      </div>
                    ))}
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

                  {/* Botón confirmar — pedidoId es opcional en el backend (RF23 sin pedido asociado) */}
                  <button
                    onClick={handleConfirmar}
                    disabled={confirmando || carrito.length === 0}
                    className="w-full bg-[#9e2016] hover:bg-[#c0392b] disabled:opacity-70 text-white font-['Manrope'] font-bold text-[16px] rounded-[8px] py-3 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    {confirmando ? 'Confirmando...' : 'Confirmar Ingreso ✓'}
                  </button>
                </>
              )}
            </div>

            {/* Nota de almacén */}
            <div className="bg-[#fef2f2] rounded-[12px] p-4 border-l-4 border-[#9e2016]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#9e2016]">ⓘ</span>
                <span className="font-['Manrope'] font-semibold text-[14px] text-[#9e2016]">
                  Nota de Almacén
                </span>
              </div>
              <p className="font-['Inter'] font-normal text-[13px] text-[#57534e] leading-[18px]">
                Verifica que las cajas no presenten signos de descongelación parcial antes de
                confirmar el ingreso al sistema.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
