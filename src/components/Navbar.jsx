import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const base = import.meta.env.VITE_API_BASE_URL ?? '';

/* ── Icons ── */
function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6"  x2="21" y2="6"  />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="6"  x2="18" y2="18" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

const CARGO_LABEL = {
  ADMINISTRADOR:        'Gerente General',
  ENCARGADO_INVENTARIO: 'Encargado de Inventario',
  ENCARGADO_VENTAS:     'Encargado de Ventas',
};

function getInitials(nombre) {
  if (!nombre) return '?';
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/* ── Componente campana de alertas ── */
function AlertasBell({ token }) {
  const [alertas, setAlertas]   = useState([]);
  const [open, setOpen]         = useState(false);
  const [cargando, setCargando] = useState(false);
  const [readIds, setReadIds]   = useState(new Set());
  const ref                     = useRef(null);

  const fetchAlertas = () => {
    setCargando(true);
    fetch(`${base}/api/inventario/alertas`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setAlertas(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    fetchAlertas();
    const interval = setInterval(fetchAlertas, 120_000); // refresca cada 2 min
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const count = alertas.length;
  const unreadCount = alertas.filter((a, i) => !readIds.has(a.id ?? i)).length;

  const handleLeerTodo = () => {
    setReadIds(new Set(alertas.map((a, i) => a.id ?? i)));
  };

  return (
    <div ref={ref} className="relative">
      {/* Botón campana */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-colors ${
          open ? 'bg-primary-tint text-primary' : 'text-muted hover:bg-surface hover:text-ink'
        }`}
        title="Alertas de stock"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[320px] bg-white border border-border rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] z-50 overflow-hidden animate-dropdown-in">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-primary"><BellIcon /></span>
              <span className="font-semibold text-[14px] text-ink">Alertas de Stock</span>
              {count > 0 && (
                <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleLeerTodo}
                  className="font-['Inter'] text-[12px] font-semibold text-primary hover:underline transition-colors cursor-pointer"
                >
                  Leer todo
                </button>
              )}
              <button
                onClick={fetchAlertas}
                className="text-muted hover:text-ink transition-colors cursor-pointer"
                title="Actualizar"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={cargando ? 'animate-spin' : ''}>
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-[320px] overflow-y-auto">
            {cargando && alertas.length === 0 ? (
              <div className="py-8 flex justify-center">
                <svg className="animate-spin w-5 h-5 text-muted" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              </div>
            ) : alertas.length === 0 ? (
              <div className="py-10 text-center">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-[13px] text-muted">Todo el stock está en niveles normales.</p>
              </div>
            ) : (
              alertas.map((a, i) => {
                const esBajoStock = a.estado === 'BAJO_STOCK';
                const isRead = readIds.has(a.id ?? i);
                return (
                  <div
                    key={a.id ?? i}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-[#fafaf9] last:border-0 hover:bg-surface transition-colors ${isRead ? 'opacity-50' : ''}`}
                  >
                    {/* Icono estado */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      esBajoStock ? 'bg-red-100' : 'bg-amber-100'
                    }`}>
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={esBajoStock ? '#dc2626' : '#d97706'} strokeWidth="2.2" strokeLinecap="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-ink leading-tight truncate">
                        {a.nombre}
                      </p>
                      <p className="text-[11px] text-muted mt-0.5">{a.codigoTecnico}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-[11px] font-bold ${esBajoStock ? 'text-red-600' : 'text-amber-600'}`}>
                          Stock: {a.stockActual} u
                        </span>
                        <span className="text-[11px] text-muted">
                          Mín: {a.stockMinimo} u
                        </span>
                      </div>
                    </div>

                    {/* Badge */}
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      esBajoStock
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {esBajoStock ? 'CRÍTICO' : 'MEDIO'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Navbar principal ── */
export default function Navbar({ onToggle, sidebarOpen }) {
  const { perfil, token } = useAuth();
  const cargo = CARGO_LABEL[perfil?.rol] ?? '';
  const puedeVerAlertas = ['ADMINISTRADOR', 'ENCARGADO_INVENTARIO'].includes(perfil?.rol);

  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 px-4 h-[60px] bg-white/85 backdrop-blur-md border-b border-border">
      {/* Hamburger — mobile only */}
      <button
        className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-ink hover:bg-surface transition duration-300 active:scale-90"
        type="button"
        onClick={onToggle}
        aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={sidebarOpen}
      >
        {sidebarOpen ? <CloseIcon /> : <HamburgerIcon />}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Campana de alertas — solo ADMINISTRADOR y ENCARGADO_INVENTARIO */}
      {puedeVerAlertas && <AlertasBell token={token} />}

      {/* Divider */}
      <div className="w-px h-6 bg-divider" />

      {/* User info */}
      <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-surface transition duration-300 cursor-pointer">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-semibold text-ink leading-tight">{perfil?.nombre ?? '—'}</div>
          <div className="text-xs text-muted leading-tight">{cargo}</div>
        </div>
        {perfil?.foto_url ? (
          <img
            src={perfil.foto_url}
            alt={perfil.nombre}
            className="w-8 h-8 rounded-full object-cover hover:scale-105 transition duration-300"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary-tint text-primary text-xs font-bold flex items-center justify-center shrink-0 hover:scale-105 transition duration-300">
            {getInitials(perfil?.nombre)}
          </div>
        )}
      </div>
    </header>
  );
}
