// src/pages/inventarios/CatalogoProductos.jsx — RF18
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/AppLayout';
import NuevoProducto from '../../components/catalogo/NuevoProducto';
import EditarProducto from '../../components/catalogo/EditarProducto';
import ModalConfirmarEliminar from '../../components/catalogo/ModalConfirmarEliminar';

// Categorías que acepta el backend: PALETAS, CONOS, FAMILIARES
const CATEGORIAS = ['Todos', 'Paletas', 'Conos', 'Familiares'];
const PAGE_SIZE = 8;

const formatCOP = (n) => '$' + Number(n).toLocaleString('es-CO');

const CAT_LABEL = {
  PALETAS: 'Paletas',
  CONOS: 'Conos',
  FAMILIARES: 'Familiares',
};

export default function CatalogoProductos() {
  const { token } = useAuth();
  const [productos, setProductos]             = useState([]);
  const [total, setTotal]                     = useState(0);
  const [totalPages, setTotalPages]           = useState(1);
  const [page, setPage]                       = useState(1);          // 1-indexed para UI
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [busqueda, setBusqueda]               = useState('');
  const [filtroStock, setFiltroStock]         = useState('');        // '' | 'bajo' | 'sin'
  const [filtroOpen, setFiltroOpen]           = useState(false);
  const [cargando, setCargando]               = useState(true);
  const [modalNuevo, setModalNuevo]           = useState(false);
  const [productoEditar, setProductoEditar]   = useState(null);
  const [productoEliminar, setProductoEliminar] = useState(null);
  const filtroRef = useRef(null);

  const fetchProductos = useCallback(async () => {
    setCargando(true);
    try {
      // Cuando hay búsqueda activa: traer todos (size grande) y filtrar client-side
      // El backend no soporta parámetro q para búsqueda por nombre
      const hayBusqueda = busqueda.trim().length > 0;
      const params = new URLSearchParams({
        page: hayBusqueda ? 0 : page - 1,
        size: hayBusqueda ? 500 : PAGE_SIZE,
      });
      if (categoriaActiva !== 'Todos') params.set('categoria', categoriaActiva.toUpperCase());
      if (filtroStock === 'medio') params.set('stockMedio', 'true');
      if (filtroStock === 'bajo')  params.set('stockBajo',  'true');
      if (filtroStock === 'sin')   params.set('sinStock',   'true');
      const base = import.meta.env.VITE_API_BASE_URL ?? '';
      const res = await fetch(`${base}/api/catalogo/productos?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      let lista = Array.isArray(data.content) ? data.content : [];

      // Filtrado client-side de stock
      if (filtroStock === 'medio') lista = lista.filter(p => p.stockActual != null && p.stockActual <= (p.stockMedio ?? p.stockMinimo));
      if (filtroStock === 'bajo')  lista = lista.filter(p => p.stockActual != null && p.stockActual <= p.stockMinimo);
      if (filtroStock === 'sin')   lista = lista.filter(p => p.stockActual === 0 || p.stockActual == null);

      // Filtrado client-side por nombre (búsqueda)
      if (hayBusqueda) {
        const q = busqueda.trim().toLowerCase();
        lista = lista.filter(p => p.nombre?.toLowerCase().includes(q));
        // Paginación local sobre resultados filtrados
        setTotal(lista.length);
        setTotalPages(Math.max(1, Math.ceil(lista.length / PAGE_SIZE)));
        const from = (page - 1) * PAGE_SIZE;
        lista = lista.slice(from, from + PAGE_SIZE);
      } else {
        setTotal(data.totalElements ?? 0);
        setTotalPages(data.totalPages ?? 1);
      }

      setProductos(lista);
    } catch (e) {
      console.error('fetchProductos:', e);
      setProductos([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setCargando(false);
    }
  }, [token, page, categoriaActiva, filtroStock, busqueda]);

  useEffect(() => { fetchProductos(); }, [fetchProductos]);

  // Cerrar panel de filtros al hacer clic fuera
  useEffect(() => {
    if (!filtroOpen) return;
    const handler = (e) => {
      if (!filtroRef.current?.contains(e.target)) setFiltroOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filtroOpen]);

  const handleCategoriaChange = (cat) => {
    setCategoriaActiva(cat);
    setPage(1);
  };

  const handleBusqueda = (e) => {
    setBusqueda(e.target.value);
    setPage(1);
  };

  const handleFiltroStock = (valor) => {
    setFiltroStock(valor);
    setFiltroOpen(false);
    setPage(1);
  };

  const FILTROS_STOCK = [
    { value: '',      label: 'Todos',        desc: 'Sin filtro aplicado'               },
    { value: 'medio', label: 'Stock medio',  desc: 'Stock actual ≤ stock medio'        },
    { value: 'bajo',  label: 'Stock mínimo', desc: 'Stock actual ≤ stock mínimo'       },
    { value: 'sin',   label: 'Sin stock',    desc: 'Stock actual en 0 o no registrado' },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-['Manrope'] font-bold text-[24px] text-[#1b1b1c] leading-[32px]">
              Administración del Catálogo
            </h1>
            <p className="font-['Inter'] font-normal text-[14px] text-[#a8a29e]">
              Parametrización de referencias y niveles de stock
            </p>
          </div>
          <div className="flex gap-3">
            {/* ── Botón Filtros con panel desplegable ── */}
            <div className="relative" ref={filtroRef}>
              <button
                onClick={() => setFiltroOpen(v => !v)}
                className={[
                  'flex items-center gap-2 border rounded-[8px] px-4 py-2',
                  "font-['Inter'] font-medium text-[14px] cursor-pointer transition-colors",
                  filtroStock
                    ? 'border-[#9e2016] bg-[#fef2f2] text-[#9e2016]'
                    : 'border-[#e7e5e4] bg-white text-[#1b1b1c] hover:bg-[#f6f3f3]',
                ].join(' ')}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                  <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Filtros
                {filtroStock && (
                  <span className="w-2 h-2 bg-[#9e2016] rounded-full shrink-0" />
                )}
              </button>

              {filtroOpen && (
                <div className="absolute right-0 top-full mt-1.5 bg-white border border-[#f0eded] rounded-[12px] shadow-2xl overflow-hidden z-50 min-w-[220px]">
                  <p className="px-4 pt-3 pb-1 font-['Inter'] font-semibold text-[10px] uppercase tracking-[0.55px] text-[#a8a29e]">
                    Filtrar por stock
                  </p>
                  <ul className="py-1.5">
                    {FILTROS_STOCK.map(opt => (
                      <li key={opt.value}>
                        <button
                          type="button"
                          onClick={() => handleFiltroStock(opt.value)}
                          className={[
                            'w-full px-4 py-2.5 text-left transition-colors duration-100',
                            filtroStock === opt.value
                              ? 'bg-[#fef2f2]'
                              : 'hover:bg-[#f6f3f3]',
                          ].join(' ')}
                        >
                          <div className="flex-1">
                            <p className={`font-['Inter'] font-semibold text-[14px] ${
                              filtroStock === opt.value ? 'text-[#9e2016]' : 'text-[#1b1b1c]'
                            }`}>
                              {opt.label}
                            </p>
                            <p className="font-['Inter'] font-normal text-[12px] text-[#a8a29e] mt-0.5">
                              {opt.desc}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              onClick={() => setModalNuevo(true)}
              className="flex items-center gap-2 bg-[#9e2016] hover:bg-[#c0392b] text-white rounded-[8px] px-4 py-2 font-['Manrope'] font-bold text-[14px] cursor-pointer transition-colors"
            >
              + Nuevo Producto
            </button>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29e]" width="16" height="16" fill="none" viewBox="0 0 16 16">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            value={busqueda}
            onChange={handleBusqueda}
            placeholder="Buscar producto por nombre..."
            className="bg-[#f6f3f3] border-none rounded-[8px] pl-10 pr-10 py-2.5 w-full font-['Inter'] text-[14px] text-[#1b1b1c] outline-none focus:ring-2 focus:ring-[#9e2016]/20"
          />
          {busqueda && (
            <button
              onClick={() => { setBusqueda(''); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a8a29e] hover:text-[#78716c] cursor-pointer transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Pills categoría + badge filtro activo */}
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORIAS.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoriaChange(cat)}
              className={`px-4 py-1.5 rounded-full font-['Inter'] font-medium text-[14px] cursor-pointer transition-colors ${
                categoriaActiva === cat
                  ? 'bg-[#9e2016] text-white'
                  : 'bg-white border border-[#e7e5e4] text-[#1b1b1c] hover:border-[#9e2016]'
              }`}
            >
              {cat}
            </button>
          ))}
          {filtroStock && (
            <span className="flex items-center gap-1.5 bg-[#fef2f2] border border-[#9e2016]/20 text-[#9e2016] rounded-full px-3 py-1 font-['Inter'] font-semibold text-[13px]">
              {FILTROS_STOCK.find(f => f.value === filtroStock)?.label}
              <button
                onClick={() => handleFiltroStock('')}
                className="ml-0.5 text-[#9e2016]/60 hover:text-[#9e2016] cursor-pointer transition-colors"
                title="Quitar filtro"
              >
                ×
              </button>
            </span>
          )}
        </div>

        {/* Grid */}
        {cargando ? (
          <div className="grid grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-[12px] h-[380px] animate-pulse border border-[#f5f5f4]" />
            ))}
          </div>
        ) : productos.length === 0 && busqueda ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="text-[32px]">🔍</span>
            <p className="font-['Manrope'] font-semibold text-[16px] text-[#1b1b1c]">Sin resultados</p>
            <p className="font-['Inter'] text-[14px] text-[#a8a29e]">No se encontraron productos para <strong>"{busqueda}"</strong></p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {productos.map((p) => (
              <ProductoCard
                key={p.id}
                producto={p}
                onEditar={() => setProductoEditar(p)}
                onEliminar={() => setProductoEliminar(p)}
              />
            ))}
            {/* Card añadir */}
            <button
              onClick={() => setModalNuevo(true)}
              className="border-2 border-dashed border-[#e7e5e4] rounded-[12px] flex flex-col items-center justify-center gap-3 p-8 hover:border-[#9e2016] cursor-pointer transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[#f6f3f3] flex items-center justify-center group-hover:bg-[#fef2f2] transition-colors">
                <span className="text-[#a8a29e] text-[20px] group-hover:text-[#9e2016]">+</span>
              </div>
              <div className="text-center">
                <p className="font-['Manrope'] font-semibold text-[16px] text-[#a8a29e] group-hover:text-[#9e2016]">
                  Añadir Nueva Referencia
                </p>
                <p className="font-['Inter'] font-normal text-[13px] text-[#a8a29e] mt-1">
                  Define nuevos sabores, presentaciones y precios para tu catálogo.
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Paginación */}
        <div className="flex items-center justify-between pt-2">
          <p className="font-['Inter'] font-normal text-[14px] text-[#78716c]">
            Mostrando {productos.length} de {total} productos registrados
          </p>
          <div className="flex gap-1 items-center">
            <PaginaBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              ‹
            </PaginaBtn>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
              <PaginaBtn key={n} activo={n === page} onClick={() => setPage(n)}>
                {n}
              </PaginaBtn>
            ))}
            <PaginaBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              ›
            </PaginaBtn>
          </div>
        </div>

        {/* Modales */}
        {modalNuevo && (
          <NuevoProducto onClose={() => setModalNuevo(false)} onSuccess={fetchProductos} />
        )}
        {productoEditar && (
          <EditarProducto
            producto={productoEditar}
            onClose={() => setProductoEditar(null)}
            onSuccess={fetchProductos}
          />
        )}
        {productoEliminar && (
          <ModalConfirmarEliminar
            producto={productoEliminar}
            onClose={() => setProductoEliminar(null)}
            onSuccess={fetchProductos}
          />
        )}
      </div>
    </AppLayout>
  );
}

function ProductoCard({ producto, onEditar, onEliminar }) {
  // Backend devuelve camelCase: codigoTecnico, precioVenta, stockMinimo, stockActual, imagenUrl
  const { nombre, codigoTecnico, categoria, precioVenta, descripcion, stockMinimo, stockActual, unidadMedida, imagenUrl } = producto;
  const stockBajo = stockActual !== null && stockActual <= stockMinimo;

  return (
    <div className="bg-white rounded-[12px] border border-[#f5f5f4] overflow-hidden flex flex-col">
      {/* Imagen */}
      <div className="relative h-[180px]">
        {imagenUrl ? (
          <img src={imagenUrl} alt={nombre} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[#f6f3f3] flex items-center justify-center">
            <span className="text-[#a8a29e] text-[12px]">Sin imagen</span>
          </div>
        )}
        <span className="absolute top-3 left-3 bg-[#1b1b1c] text-white text-[10px] uppercase tracking-[1px] px-2 py-1 rounded-full">
          {CAT_LABEL[categoria] ?? categoria}
        </span>
      </div>

      {/* Contenido */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="font-['Manrope'] font-semibold text-[16px] text-[#1b1b1c] leading-[22px]">{nombre}</span>
            {codigoTecnico && (
              <span className="font-['Inter'] font-normal text-[11px] text-[#a8a29e] tracking-wide">{codigoTecnico}</span>
            )}
          </div>
          <span className="font-['Manrope'] font-bold text-[18px] text-[#9e2016] shrink-0">{formatCOP(precioVenta)}</span>
        </div>
        <p className="font-['Inter'] font-normal text-[13px] text-[#57534e] leading-[20px] line-clamp-2">{descripcion}</p>
        {unidadMedida && (
          <p className="font-['Inter'] font-normal text-[12px] text-[#a8a29e]">
            Unidad: <span className="font-semibold text-[#57534e]">{unidadMedida}</span>
          </p>
        )}

        {/* Stock mínimo */}
        <div className={`flex items-center justify-between rounded-[8px] px-3 py-2 ${stockBajo ? 'bg-[#fef2f2]' : 'bg-[#f6f3f3]'}`}>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
              <rect x="1" y="3" width="12" height="10" rx="1.5" stroke={stockBajo ? '#dc2626' : '#78716c'} strokeWidth="1.2"/>
              <path d="M4 3V2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke={stockBajo ? '#dc2626' : '#78716c'} strokeWidth="1.2"/>
            </svg>
            <span className={`font-['Inter'] font-bold text-[10px] uppercase tracking-[0.5px] ${stockBajo ? 'text-[#dc2626]' : 'text-[#78716c]'}`}>
              Stock Mínimo
            </span>
          </div>
          <span className={`font-['Inter'] font-bold text-[14px] ${stockBajo ? 'text-[#dc2626]' : 'text-[#1b1b1c]'}`}>
            {stockMinimo} <span className="font-normal text-[#a8a29e]">u</span>
          </span>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 mt-auto">
          <button
            onClick={onEditar}
            className="flex-1 border border-[#9e2016] text-[#9e2016] rounded-[8px] py-2 font-['Inter'] font-semibold text-[14px] hover:bg-[#9e2016] hover:text-white transition-colors cursor-pointer"
          >
            Editar
          </button>
          <button
            onClick={onEliminar}
            className="border border-[#e7e5e4] rounded-[8px] p-2 text-[#78716c] hover:border-[#dc2626] hover:text-[#dc2626] transition-colors cursor-pointer"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
              <path d="M2 4h12M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M6 7v5M10 7v5M3 4l1 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function PaginaBtn({ children, onClick, activo, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 rounded-[8px] font-['Inter'] font-medium text-[14px] flex items-center justify-center cursor-pointer transition-colors ${
        activo   ? 'bg-[#9e2016] text-white' :
        disabled ? 'text-[#d6d3d1] cursor-not-allowed' :
                   'text-[#78716c] hover:bg-[#f6f3f3]'
      }`}
    >
      {children}
    </button>
  );
}
