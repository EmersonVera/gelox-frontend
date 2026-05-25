// src/pages/inventarios/RegistroEntrada.jsx — RF23: Registro de Entrada de Mercancía
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import CantidadControl from '../../components/inventarios/CantidadControl';

const CATEGORIAS = ['Todos', 'Paletas', 'Conos', 'Vaso', 'Litros'];
const base = import.meta.env.VITE_API_BASE_URL ?? '';

export default function RegistroEntrada() {
  const { token }   = useAuth();
  const navigate    = useNavigate();
  const [pedidos, setPedidos]                       = useState([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState('');
  const [categoriaActiva, setCategoriaActiva]       = useState('Todos');
  const [productos, setProductos]                   = useState([]);
  const [carrito, setCarrito]                       = useState([]);
  const [cargando, setCargando]                     = useState(true);
  const [confirmando, setConfirmando]               = useState(false);
  const [resumen, setResumen]                       = useState(null);

  // Cargar pedidos PENDIENTES
  useEffect(() => {
    fetch(`${base}/api/inventario/pedidos?estado=PENDIENTE`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) { console.warn('pedidos PENDIENTES:', r.status); return []; }
        return r.json();
      })
      .then(d => {
        const list = d.pedidos ?? d.content ?? d;
        setPedidos(Array.isArray(list) ? list : []);
      })
      .catch(e => { console.error('fetchPedidosPendientes:', e); });
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

  const seleccionar = (p) => {
    if (carrito.find(i => i.producto.id === p.id)) return;
    setCarrito(prev => [...prev, { producto: p, cajas: 1, unidades: 0 }]);
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
    if (!pedidoSeleccionado || carrito.length === 0) return;
    setConfirmando(true);
    try {
      const res = await fetch(`${base}/api/inventario/entradas`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          pedido_id: pedidoSeleccionado,
          productos: carrito.map(i => ({
            producto_id:       i.producto.id,
            cantidad_cajas:    i.cajas,
            cantidad_unidades: i.unidades,
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
            {resumen.productos?.map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2 border-b border-[#fafaf9]"
              >
                <span className="font-['Inter'] font-medium text-[14px] text-[#1b1b1c]">
                  {p.nombre}
                </span>
                <span className="font-['Inter'] font-semibold text-[14px] text-[#16a34a]">
                  +{p.stock_agregado} → {p.stock_nuevo}
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
          <select
            value={pedidoSeleccionado}
            onChange={e => setPedidoSeleccionado(e.target.value)}
            className="bg-[#f6f3f3] border-none rounded-[8px] px-4 py-2.5 font-['Inter'] text-[14px] text-[#1b1b1c] outline-none focus:ring-2 focus:ring-[#9e2016]/20 min-w-[220px]"
          >
            <option value="">-- Seleccionar pedido --</option>
            {pedidos.map(p => (
              <option key={p.id} value={p.id}>
                {p.nombre ?? p.id_pedido ?? p.id}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-6 items-start">
          {/* ── Catálogo izquierda ── */}
          <div className="flex-1 flex flex-col gap-5">
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
            {cargando ? (
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    className="bg-white rounded-[12px] h-[300px] animate-pulse border border-[#f5f5f4]"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {productos.map(p => {
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
                          onClick={() => seleccionar(p)}
                          disabled={enCarrito}
                          className={`flex items-center justify-center gap-2 border rounded-full px-4 py-2 font-['Inter'] font-semibold text-[13px] cursor-pointer transition-colors ${
                            enCarrito
                              ? 'bg-[#9e2016] border-[#9e2016] text-white'
                              : 'border-[#e7e5e4] text-[#1b1b1c] hover:border-[#9e2016]'
                          }`}
                        >
                          <span style={{ color: enCarrito ? 'white' : '#9e2016' }}>+</span>
                          {enCarrito ? 'Seleccionado' : 'Seleccionar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Panel carrito entrada ── */}
          <div className="w-[280px] shrink-0 sticky top-8 flex flex-col gap-4">
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

              {carrito.length === 0 ? (
                <p className="font-['Inter'] font-normal text-[13px] text-[#a8a29e] text-center py-6">
                  Selecciona productos a ingresar
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-4 max-h-[360px] overflow-y-auto">
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
                  <div className="flex justify-between items-end pt-1">
                    <div>
                      <p className="font-['Inter'] font-semibold text-[10px] uppercase tracking-[0.5px] text-[#a8a29e]">
                        Total Ingreso
                      </p>
                      <p className="font-['Manrope'] font-bold text-[24px] text-[#1b1b1c] leading-none">
                        {totalCajas}{' '}
                        <span className="font-['Inter'] font-normal text-[12px] text-[#a8a29e]">CAJAS</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-['Inter'] font-semibold text-[10px] uppercase tracking-[0.5px] text-[#a8a29e]">
                        Total Unidades
                      </p>
                      <p className="font-['Manrope'] font-bold text-[20px] text-[#1b1b1c] leading-none">
                        {totalUnidades.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Botón confirmar */}
                  <button
                    onClick={handleConfirmar}
                    disabled={confirmando || !pedidoSeleccionado}
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
