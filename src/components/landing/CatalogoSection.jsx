import { useEffect, useState } from 'react';

const CATEGORIAS = ['Todas', 'Paletas', 'Conos', 'Familiares'];

const BADGE_STYLES = {
  FAVORITO:   'bg-red-100 text-red-700',
  POPULAR:    'bg-zinc-200 text-zinc-700',
  DISPONIBLE: 'bg-emerald-100 text-emerald-700',
};

function formatPrecio(n) {
  return '$' + n.toLocaleString('es-CO');
}

function CartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function IceCreamPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-100">
      <span className="text-5xl select-none">🍦</span>
    </div>
  );
}

function ProductCard({ producto, waUrl }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
      <div className="relative h-44 bg-zinc-50 overflow-hidden">
        {producto.imagen_url ? (
          <img
            src={producto.imagen_url}
            alt={producto.nombre}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className={`w-full h-full ${producto.imagen_url ? 'hidden' : 'flex'}`}>
          <IceCreamPlaceholder />
        </div>
        {producto.badge && (
          <span className={`absolute top-3 right-3 font-['Inter'] font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full ${BADGE_STYLES[producto.badge] ?? BADGE_STYLES.DISPONIBLE}`}>
            {producto.badge}
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex-1">
          <p className="font-['Manrope'] font-bold text-[16px] text-zinc-900">{producto.nombre}</p>
          <p className="font-['Inter'] font-normal text-[13px] text-zinc-500 leading-[1.6] mt-1">
            {producto.descripcion}
          </p>
        </div>
        <span className="font-['Manrope'] font-extrabold text-[20px] text-zinc-900">
          {formatPrecio(producto.precio)}
        </span>
        <a
          href={waUrl || undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!waUrl}
          className={`flex items-center justify-center gap-2 w-full bg-emerald-500 text-white font-['Inter'] font-semibold text-[14px] py-2.5 rounded-xl transition-all duration-200 active:scale-95 ${
            waUrl ? 'hover:bg-emerald-600' : 'opacity-50 pointer-events-none'
          }`}
        >
          <CartIcon />
          Pedir por WhatsApp
        </a>
      </div>
    </div>
  );
}

export default function CatalogoSection({ waUrl }) {
  const [productos, setProductos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('Todas');

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/landing/productos`)
      .then((r) => r.json())
      .then((data) => {
        const plano = Object.entries(data).flatMap(([cat, items]) =>
          items.map((p, i) => ({
            id: `${cat}-${i}`,
            nombre: p.nombre,
            descripcion: '',
            precio: p.precioVenta,
            categoria: cat,
            imagen_url: p.imagenUrl,
            badge: null,
          }))
        );
        setProductos(plano);
      })
      .catch(() => {
        setProductos([]);
        setError('No se pudo cargar el catálogo.');
      })
      .finally(() => setCargando(false));
  }, []);

  const filtrados = productos
    ? filtro === 'Todas'
      ? productos
      : productos.filter((p) => p.categoria === filtro.toUpperCase())
    : [];

  const categoriasFiltradas = [...new Set(filtrados.map((p) => p.categoria))];

  return (
    <section id="catalogo" className="bg-white py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
          <div>
            <h2 className="font-['Manrope'] font-extrabold text-[32px] text-zinc-900 leading-tight">
              Catálogo de Sabores
            </h2>
            <p className="font-['Inter'] font-normal text-[16px] text-zinc-500 mt-1">
              Explora la magia en cada bocado.
            </p>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat}
                onClick={() => setFiltro(cat)}
                className={`font-['Inter'] font-semibold text-[13px] px-4 py-1.5 rounded-full border transition-all duration-200 ${
                  filtro === cat
                    ? 'bg-red-700 text-white border-red-700 shadow-sm'
                    : 'bg-white text-zinc-600 border-zinc-300 hover:border-red-400 hover:text-red-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="text-center font-['Inter'] text-[15px] text-zinc-400 py-16">{error}</p>
        ) : cargando ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-zinc-100 rounded-2xl h-[340px] animate-pulse" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <p className="text-center font-['Inter'] text-[15px] text-zinc-400 py-16">
            No hay productos en esta categoría.
          </p>
        ) : (
          <div className="flex flex-col gap-10">
            {categoriasFiltradas.map((cat) => {
              const items = filtrados.filter((p) => p.categoria === cat);
              const label = cat.charAt(0) + cat.slice(1).toLowerCase();
              return (
                <div key={cat}>
                  {/* Category separator */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-6 h-0.5 bg-red-600" />
                    <span className="font-['Manrope'] font-bold text-[13px] text-red-700 uppercase tracking-widest">
                      {label}
                    </span>
                    <div className="flex-1 h-px bg-zinc-100" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((p) => (
                      <ProductCard key={p.id} producto={p} waUrl={waUrl} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
