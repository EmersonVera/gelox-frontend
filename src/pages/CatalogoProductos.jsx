// src/pages/CatalogoProductos.jsx — RF18
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import NuevoProducto from '../components/catalogo/NuevoProducto';
import EditarProducto from '../components/catalogo/EditarProducto';
import ModalConfirmarEliminar from '../components/catalogo/ModalConfirmarEliminar';

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
  const [cargando, setCargando]               = useState(true);
  const [modalNuevo, setModalNuevo]           = useState(false);
  const [productoEditar, setProductoEditar]   = useState(null);
  const [productoEliminar, setProductoEliminar] = useState(null);

  const fetchProductos = useCallback(async () => {
    setCargando(true);
    try {
      // Spring Pageable es 0-indexed; usar "size" no "limit"
      const params = new URLSearchParams({ page: page - 1, size: PAGE_SIZE });
      if (categoriaActiva !== 'Todos') params.set('categoria', categoriaActiva.toUpperCase());
      const res = await fetch(`/api/catalogo/productos?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      // Backend devuelve: { content, page, size, totalElements, totalPages }
      setProductos(Array.isArray(data.content) ? data.content : []);
      setTotal(data.totalElements ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (e) {
      console.error('fetchProductos:', e);
      setProductos([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setCargando(false);
    }
  }, [token, page, categoriaActiva]);

  useEffect(() => { fetchProductos(); }, [fetchProductos]);

  const handleCategoriaChange = (cat) => {
    setCategoriaActiva(cat);
    setPage(1);
  };

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
            <button className="flex items-center gap-2 border border-[#e7e5e4] bg-white rounded-[8px] px-4 py-2 font-['Inter'] font-medium text-[14px] text-[#1b1b1c] hover:bg-[#f6f3f3] cursor-pointer transition-colors">
              <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Filtros
            </button>
            <button
              onClick={() => setModalNuevo(true)}
              className="flex items-center gap-2 bg-[#9e2016] hover:bg-[#c0392b] text-white rounded-[8px] px-4 py-2 font-['Manrope'] font-bold text-[14px] cursor-pointer transition-colors"
            >
              + Nuevo Producto
            </button>
          </div>
        </div>

        {/* Pills categoría */}
        <div className="flex gap-2 flex-wrap">
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
        </div>

        {/* Grid */}
        {cargando ? (
          <div className="grid grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-[12px] h-[380px] animate-pulse border border-[#f5f5f4]" />
            ))}
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
  const { nombre, categoria, precioVenta, descripcion, stockMinimo, stockActual, imagenUrl } = producto;
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
          <span className="font-['Manrope'] font-semibold text-[16px] text-[#1b1b1c] leading-[22px]">{nombre}</span>
          <span className="font-['Manrope'] font-bold text-[18px] text-[#9e2016] shrink-0">{formatCOP(precioVenta)}</span>
        </div>
        <p className="font-['Inter'] font-normal text-[13px] text-[#57534e] leading-[20px] line-clamp-2">{descripcion}</p>

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
