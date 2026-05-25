// src/pages/inventarios/GenerarPedido.jsx — RF21: Generar Pedido a Proveedor
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/AppLayout';
import CantidadControl from '../../components/inventarios/CantidadControl';

const CATEGORIAS = ['Todos', 'Paletas', 'Conos', 'Vaso', 'Litros'];
const base = import.meta.env.VITE_API_BASE_URL ?? '';

export default function GenerarPedido() {
  const { token } = useAuth();
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]); // [{ producto, cajas, unidades }]
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);

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

  const toggleSeleccionar = (p) => {
    const enCarrito = carrito.find(i => i.producto.id === p.id);
    if (enCarrito) {
      setCarrito(prev => prev.filter(i => i.producto.id !== p.id));
    } else {
      setCarrito(prev => [...prev, { producto: p, cajas: 1, unidades: 0 }]);
    }
  };

  const eliminarDelCarrito = (id) =>
    setCarrito(prev => prev.filter(i => i.producto.id !== id));

  const vaciarCarrito = () => setCarrito([]);

  const actualizarCantidad = (id, campo, delta) => {
    setCarrito(prev =>
      prev.map(i =>
        i.producto.id === id
          ? { ...i, [campo]: Math.max(0, i[campo] + delta) }
          : i
      )
    );
  };

  const totalCajas    = carrito.reduce((s, i) => s + i.cajas, 0);
  const totalUnidades = carrito.reduce((s, i) => s + i.unidades, 0);

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
          productos: carrito.map(i => ({
            producto_id:       i.producto.id,
            cantidad_cajas:    i.cajas,
            cantidad_unidades: i.unidades,
          })),
        }),
      });
      if (!res.ok) throw new Error('Error al generar pedido');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `pedido-nutresa-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      vaciarCarrito();
    } catch (e) {
      console.error(e);
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

        <div className="flex gap-6 items-start">
          {/* ── Catálogo izquierda ── */}
          <div className="flex-1 flex flex-col gap-5">

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
            {cargando ? (
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div
                    key={i}
                    className="bg-white rounded-[12px] h-[320px] animate-pulse border border-[#f5f5f4]"
                  />
                ))}
              </div>
            ) : productos.length === 0 ? (
              <p className="font-['Inter'] text-[14px] text-[#a8a29e] text-center py-12">
                No hay productos en esta categoría.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {productos.map(p => {
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
            )}
          </div>

          {/* ── Panel carrito derecha ── */}
          <div className="w-[280px] shrink-0 sticky top-8">
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
                  <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto">
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
                            <p className="font-['Manrope'] font-semibold text-[13px] text-[#1b1b1c] leading-[18px] truncate">
                              {item.producto.nombre}
                            </p>
                            <p className="font-['Inter'] font-normal text-[11px] text-[#a8a29e]">
                              {item.producto.unidadMedida ?? item.producto.unidad_medida}
                            </p>
                          </div>
                          <button
                            onClick={() => eliminarDelCarrito(item.producto.id)}
                            className="text-[#a8a29e] hover:text-[#dc2626] cursor-pointer transition-colors shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                        <CantidadControl
                          label="Caja"
                          value={item.cajas}
                          onMinus={() => actualizarCantidad(item.producto.id, 'cajas', -1)}
                          onPlus={() => actualizarCantidad(item.producto.id, 'cajas', 1)}
                        />
                        <CantidadControl
                          label="Unidad"
                          value={item.unidades}
                          onMinus={() => actualizarCantidad(item.producto.id, 'unidades', -1)}
                          onPlus={() => actualizarCantidad(item.producto.id, 'unidades', 1)}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Totales */}
                  <div className="flex justify-between items-end pt-1">
                    <div>
                      <p className="font-['Inter'] font-semibold text-[10px] uppercase tracking-[0.5px] text-[#a8a29e]">
                        Total Pedido
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

                  {/* Botón Excel */}
                  <button
                    onClick={handleGenerarExcel}
                    disabled={generando}
                    className="w-full bg-[#9e2016] hover:bg-[#c0392b] disabled:opacity-70 text-white font-['Manrope'] font-bold text-[16px] rounded-[8px] py-3 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    {generando ? 'Generando...' : 'Generar Excel ↓'}
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
    </AppLayout>
  );
}
