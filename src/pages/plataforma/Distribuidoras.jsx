// src/pages/plataforma/Distribuidoras.jsx — RF58/RF59: lista de distribuidoras del Superadministrador
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import Pagination from '../../components/ui/Pagination';
import EstadoBadge from '../../components/plataforma/EstadoBadge';
import {
  ESTADOS_DISTRIBUIDORA, ORDEN_ESTADOS, etiquetaPlan, formatoFecha, iniciales, mensajeError,
} from '../../components/plataforma/plataformaUtils';
import { USAR_MOCK, listarDistribuidoras } from '../../services/plataformaService';

const TAMANO_PAGINA = 10;

/* ── Icons ── */
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 10h.01M15 10h.01" />
    </svg>
  );
}

/* ── Shared class strings ── */
const btnPrimary =
  'inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition duration-300 active:scale-[0.97] shadow-[0_2px_8px_rgba(158,32,22,0.25)] disabled:opacity-60';

function ChipFiltro({ activo, onClick, dot, label, cantidad }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold border transition duration-300 active:scale-[0.97] ${
        activo
          ? 'bg-primary border-primary text-white shadow-[0_2px_8px_rgba(158,32,22,0.25)]'
          : 'bg-white border-border text-ink hover:bg-surface'
      }`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${activo ? 'bg-white' : dot}`} />}
      {label}
      <span className={`min-w-[18px] px-1.5 py-0.5 rounded-full text-[10px] leading-none ${activo ? 'bg-white/20 text-white' : 'bg-surface text-muted'}`}>
        {cantidad}
      </span>
    </button>
  );
}

export default function Distribuidoras() {
  const navigate = useNavigate();

  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [pagina, setPagina] = useState(1);

  // La búsqueda viaja al backend (?q=) con una pausa de 300 ms para no consultar en cada tecla.
  useEffect(() => {
    const valor = busqueda.trim();
    if (valor === q) return undefined;
    const t = setTimeout(() => {
      setCargando(true);
      setError('');
      setPagina(1);
      setQ(valor);
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda, q]);

  // El filtro por estado se aplica en pantalla para poder mostrar el conteo de cada estado.
  useEffect(() => {
    let vivo = true;
    listarDistribuidoras({ q })
      .then((data) => { if (vivo) setLista(data); })
      .catch((err) => { if (vivo) setError(mensajeError(err, 'No se pudo cargar la lista de distribuidoras.')); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [q]);

  const conteo = ORDEN_ESTADOS.reduce((acc, e) => {
    acc[e] = lista.filter((d) => d.estado === e).length;
    return acc;
  }, {});
  const filtradas = filtroEstado ? lista.filter((d) => d.estado === filtroEstado) : lista;
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / TAMANO_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtradas.slice((paginaActual - 1) * TAMANO_PAGINA, paginaActual * TAMANO_PAGINA);

  const cambiarFiltro = (estado) => {
    setFiltroEstado(estado);
    setPagina(1);
  };

  const abrir = (d) => navigate(`/plataforma/distribuidoras/${d.id}`);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in-up">
          <div>
            <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-1">Plataforma</p>
            <h1 className="font-display text-2xl font-extrabold text-ink tracking-tight">Distribuidoras</h1>
            <p className="text-sm text-muted mt-1 max-w-xl">
              Registra nuevas distribuidoras y controla su acceso según el estado de su suscripción.
            </p>
          </div>
          <button
            type="button"
            className={`${btnPrimary} shrink-0 self-start sm:self-auto`}
            onClick={() => navigate('/plataforma/distribuidoras/nueva')}
          >
            <PlusIcon />
            Registrar distribuidora
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 animate-fade-in-up [animation-delay:60ms]">
          <div className="flex items-center gap-2 flex-wrap">
            <ChipFiltro activo={filtroEstado === ''} onClick={() => cambiarFiltro('')} label="Todas" cantidad={lista.length} />
            {ORDEN_ESTADOS.map((e) => (
              <ChipFiltro
                key={e}
                activo={filtroEstado === e}
                onClick={() => cambiarFiltro(e)}
                dot={ESTADOS_DISTRIBUIDORA[e].dot}
                label={ESTADOS_DISTRIBUIDORA[e].label}
                cantidad={conteo[e]}
              />
            ))}
          </div>
          <div className="relative w-full lg:w-[300px]">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, NIT o subdominio"
              aria-label="Buscar distribuidora"
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl text-sm outline-none transition duration-300 bg-white text-ink placeholder:text-[#c0c0c0] focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden animate-fade-in-up [animation-delay:120ms]">
          <div className="flex items-center justify-between gap-2.5 px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-ink">
              <span className="text-faint"><BuildingIcon /></span>
              Distribuidoras registradas
            </div>
            {USAR_MOCK && <span className="text-xs text-muted">Modo simulado</span>}
          </div>

          {error && (
            <div className="px-6 py-4">
              <div className="px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm animate-slide-down flex items-start gap-2">
                <svg width="15" height="15" className="shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {cargando && lista.length === 0 ? (
            <div className="flex items-center justify-center gap-3 py-16 text-muted text-sm">
              <span className="w-5 h-5 rounded-full border-2 border-muted/30 border-t-muted animate-spin" />
              Cargando distribuidoras...
            </div>
          ) : !error && filtradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 py-16 text-center px-6">
              <p className="text-sm font-semibold text-ink">
                {lista.length === 0 && !q ? 'Aún no hay distribuidoras registradas.' : 'Ninguna distribuidora coincide con los filtros.'}
              </p>
              <p className="text-xs text-muted">
                {lista.length === 0 && !q ? 'Registra la primera con el botón «Registrar distribuidora».' : 'Prueba con otro estado o cambia el texto de búsqueda.'}
              </p>
            </div>
          ) : filtradas.length > 0 && (
            <div className={`overflow-x-auto transition-opacity duration-300 ${cargando ? 'opacity-50' : ''}`}>
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="bg-surface text-left">
                    <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Distribuidora</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">NIT</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Subdominio</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Plan</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Registro</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibles.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => abrir(d)}
                      className="hover:bg-surface/50 transition duration-150 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 ${
                            d.estado === 'INACTIVO' ? 'bg-surface text-muted' : 'bg-primary-tint text-primary'
                          }`}>
                            {iniciales(d.nombreComercial)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-ink truncate">{d.nombreComercial}</div>
                            <div className="text-xs text-muted truncate">{d.razonSocial}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-ink whitespace-nowrap">{d.nit}</td>
                      <td className="px-4 py-4 text-sm text-faint font-mono whitespace-nowrap">{d.subdominio}</td>
                      <td className="px-4 py-4 text-sm text-ink">{etiquetaPlan(d.plan)}</td>
                      <td className="px-4 py-4"><EstadoBadge estado={d.estado} /></td>
                      <td className="px-4 py-4 text-sm text-muted whitespace-nowrap">{formatoFecha(d.createdAt)}</td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); abrir(d); }}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-ink bg-surface rounded-lg hover:bg-border transition duration-300 active:scale-95"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filtradas.length > 0 && (
            <div className="border-t border-border px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-muted">
                Mostrando {visibles.length} de {filtradas.length} distribuidora{filtradas.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-3">
                <Pagination page={paginaActual} totalPages={totalPaginas} onPageChange={setPagina} />
                <p className="text-xs text-muted">Página {paginaActual} de {totalPaginas}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
