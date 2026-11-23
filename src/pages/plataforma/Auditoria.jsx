// src/pages/plataforma/Auditoria.jsx — RF71: log de auditoría global de las operaciones críticas
import { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import CustomSelect from '../../components/ui/CustomSelect';
import Pagination from '../../components/ui/Pagination';
import { AlertIcon, FilterIcon, GlobeIcon, ShieldIcon } from '../../components/plataforma/IconosPlataforma';
import {
  ACCIONES_AUDITORIA, ETIQUETA_ROL, TONOS_ACCION, etiquetaAccion, fechaISO, formatoFechaCorta, iniciales, mensajeError,
} from '../../components/plataforma/plataformaUtils';
import {
  USAR_MOCK, listarAccionesAuditoria, listarAuditoria, listarDistribuidoras, listarUsuariosAuditoria,
} from '../../services/plataformaService';

const TAMANO_PAGINA = 10;

/** Filtros por defecto: todo lo del mes en curso (como el mockup: 01/11 a hoy). */
function filtrosIniciales() {
  const hoy = fechaISO();
  return { distribuidoraId: '', usuarioId: '', desde: `${hoy.slice(0, 7)}-01`, hasta: hoy, accion: '' };
}

const fechaDe = (iso) => new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
const horaDe = (iso) => new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date(iso));

/** «Básico → Estándar. Motivo: …» → resalta el valor nuevo, como en el mockup RF71. */
function Detalle({ texto }) {
  const m = /^(.*?→\s)([^;]+?)((?:\.\s|;|\.$)[\s\S]*)?$/.exec(texto ?? '');
  if (!m) return texto || '—';
  return <>{m[1]}<strong className="font-semibold text-ink">{m[2]}</strong>{m[3]}</>;
}

/** Acepta ['ASIGNAR_PLAN', …] o [{ codigo, etiqueta }] del backend. */
const normalizarAccion = (a) => (typeof a === 'string'
  ? { value: a, label: etiquetaAccion(a) }
  : { value: a.codigo ?? a.accion ?? a.value, label: a.etiqueta ?? a.label ?? etiquetaAccion(a.codigo ?? a.accion) });

const lbl = 'text-xs font-semibold text-faint uppercase tracking-wider block mb-1.5';
const inputFecha = 'w-full bg-surface border border-transparent rounded-[8px] px-3 py-2.5 text-sm text-ink outline-none transition duration-200 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20';

export default function Auditoria() {
  const [borrador, setBorrador] = useState(filtrosIniciales);
  const [aplicados, setAplicados] = useState(filtrosIniciales);
  const [pagina, setPagina] = useState(1);
  const [errorFiltro, setErrorFiltro] = useState('');

  const [distribuidoras, setDistribuidoras] = useState([]);
  const [acciones, setAcciones] = useState([]);
  const [usuarios, setUsuarios] = useState({ distribuidoraId: null, lista: [] });
  const [resultado, setResultado] = useState(null); // { clave, pagina?, error? }

  // Opciones de los filtros.
  useEffect(() => {
    let vivo = true;
    listarDistribuidoras().then((l) => { if (vivo) setDistribuidoras(l); }).catch(() => {});
    listarAccionesAuditoria().then((l) => { if (vivo) setAcciones(l.map(normalizarAccion).filter((a) => a.value)); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  // Los usuarios del filtro dependen de la distribuidora elegida.
  useEffect(() => {
    let vivo = true;
    listarUsuariosAuditoria({ distribuidoraId: borrador.distribuidoraId || undefined })
      .then((lista) => { if (vivo) setUsuarios({ distribuidoraId: borrador.distribuidoraId, lista }); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [borrador.distribuidoraId]);

  const clave = JSON.stringify({ ...aplicados, pagina });
  const cargando = resultado?.clave !== clave;
  const datos = resultado?.pagina ?? null;
  const error = !cargando ? resultado?.error : '';

  useEffect(() => {
    let vivo = true;
    listarAuditoria({ ...aplicados, page: pagina - 1, size: TAMANO_PAGINA })
      .then((p) => { if (vivo) setResultado({ clave, pagina: p }); })
      .catch((err) => {
        if (vivo) setResultado((prev) => ({ clave, pagina: prev?.pagina ?? null, error: mensajeError(err, 'No se pudo cargar el log de auditoría.') }));
      });
    return () => { vivo = false; };
  }, [clave, aplicados, pagina]);

  const cambiar = (campo, valor) => {
    setErrorFiltro('');
    setBorrador((b) => ({
      ...b,
      [campo]: valor,
      // Al cambiar de distribuidora el usuario elegido puede no pertenecer a ella.
      ...(campo === 'distribuidoraId' ? { usuarioId: '' } : {}),
    }));
  };

  const aplicar = (e) => {
    e?.preventDefault();
    if (borrador.desde && borrador.hasta && borrador.desde > borrador.hasta) {
      setErrorFiltro('La fecha «Desde» no puede ser posterior a «Hasta».');
      return;
    }
    setAplicados(borrador);
    setPagina(1);
  };

  const limpiar = () => {
    const ini = filtrosIniciales();
    setErrorFiltro('');
    setBorrador(ini);
    setAplicados(ini);
    setPagina(1);
  };

  const filas = datos?.content ?? [];
  const total = datos?.totalElements ?? 0;
  const totalPaginas = Math.max(1, datos?.totalPages ?? 1);
  const paginaActual = (datos?.number ?? pagina - 1) + 1;
  const inicio = total === 0 ? 0 : (paginaActual - 1) * (datos?.size ?? TAMANO_PAGINA) + 1;
  const fin = inicio === 0 ? 0 : inicio + filas.length - 1;

  const rangoTexto = aplicados.desde && aplicados.hasta
    ? `entre el ${formatoFechaCorta(aplicados.desde)} y el ${formatoFechaCorta(aplicados.hasta)}`
    : aplicados.desde ? `desde el ${formatoFechaCorta(aplicados.desde)}`
      : aplicados.hasta ? `hasta el ${formatoFechaCorta(aplicados.hasta)}` : 'en todo el historial';

  const opcionesDistribuidora = [
    { value: '', label: 'Todas' },
    ...distribuidoras.map((d) => ({ value: d.id, label: d.nombreComercial })),
  ];
  const opcionesUsuario = [
    { value: '', label: 'Todos' },
    ...(usuarios.distribuidoraId === borrador.distribuidoraId ? usuarios.lista : []).map((u) => ({
      value: u.id,
      label: `${u.nombre ?? u.correo}${u.rol ? ` · ${ETIQUETA_ROL[u.rol] ?? u.rol}` : ''}`,
    })),
  ];
  const opcionesAccion = [{ value: '', label: 'Todas las acciones' }, ...acciones];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="animate-fade-in-up">
          <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-1">Plataforma</p>
          <h1 className="font-display text-2xl font-extrabold text-ink tracking-tight">Log de auditoría</h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Operaciones críticas de todas las distribuidoras con fecha, IP, distribuidora y usuario. Los registros no se pueden editar ni borrar.
          </p>
        </div>

        {/* Filtros */}
        <form
          onSubmit={aplicar}
          className="bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] px-6 py-5 animate-fade-in-up [animation-delay:60ms]"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_150px_150px_1fr_auto] gap-3 items-end">
            <div className="min-w-0">
              <span className={lbl}>Distribuidora</span>
              <CustomSelect size="sm" searchable value={borrador.distribuidoraId} onChange={(v) => cambiar('distribuidoraId', v)} options={opcionesDistribuidora} />
            </div>
            <div className="min-w-0">
              <span className={lbl}>Usuario</span>
              <CustomSelect size="sm" searchable value={borrador.usuarioId} onChange={(v) => cambiar('usuarioId', v)} options={opcionesUsuario} />
            </div>
            <div>
              <label htmlFor="aud-desde" className={lbl}>Desde</label>
              <input id="aud-desde" type="date" value={borrador.desde} max={borrador.hasta || undefined} onChange={(e) => cambiar('desde', e.target.value)} className={inputFecha} />
            </div>
            <div>
              <label htmlFor="aud-hasta" className={lbl}>Hasta</label>
              <input id="aud-hasta" type="date" value={borrador.hasta} min={borrador.desde || undefined} onChange={(e) => cambiar('hasta', e.target.value)} className={inputFecha} />
            </div>
            <div className="min-w-0">
              <span className={lbl}>Acción</span>
              <CustomSelect size="sm" searchable value={borrador.accion} onChange={(v) => cambiar('accion', v)} options={opcionesAccion} />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-1">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition duration-300 active:scale-[0.97] shadow-[0_2px_8px_rgba(158,32,22,0.25)]"
              >
                <FilterIcon />
                Aplicar
              </button>
              <button type="button" onClick={limpiar} className="text-primary text-[13px] font-semibold hover:underline whitespace-nowrap px-1">
                Limpiar
              </button>
            </div>
          </div>
          {errorFiltro && <p className="text-xs text-error-fg mt-2 animate-slide-down">{errorFiltro}</p>}
        </form>

        {/* Registros */}
        <section className="bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden animate-fade-in-up [animation-delay:120ms]">
          <div className="flex items-center justify-between gap-3 flex-wrap px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-ink">
              <span className="text-faint"><ShieldIcon /></span>
              Registros de auditoría
            </div>
            {datos && (
              <span className="text-xs text-muted">
                {total.toLocaleString('es-CO')} registro{total !== 1 ? 's' : ''} {rangoTexto}
                {USAR_MOCK && ' · Modo simulado'}
              </span>
            )}
          </div>

          {error && (
            <div className="px-6 py-4">
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm animate-slide-down">
                <span className="shrink-0 mt-0.5"><AlertIcon size={15} /></span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {cargando && !datos ? (
            <div className="flex items-center justify-center gap-3 py-16 text-muted text-sm">
              <span className="w-5 h-5 rounded-full border-2 border-muted/30 border-t-muted animate-spin" />
              Cargando registros...
            </div>
          ) : datos && filas.length === 0 ? (
            <div className="py-16 text-center px-6">
              <p className="text-sm font-semibold text-ink">No hay registros con estos filtros.</p>
              <p className="text-xs text-muted mt-0.5">Prueba con otro rango de fechas o quita algún filtro.</p>
            </div>
          ) : filas.length > 0 && (
            <div className={`overflow-x-auto transition-opacity duration-300 ${cargando ? 'opacity-50' : ''}`}>
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="bg-surface text-left">
                    {['Fecha y hora', 'Distribuidora', 'Usuario', 'Acción', 'Detalle', 'IP'].map((t, i, arr) => (
                      <th key={t} className={`${i === 0 ? 'pl-6 pr-4' : i === arr.length - 1 ? 'pl-4 pr-6' : 'px-4'} py-3 text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap`}>
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filas.map((a) => {
                    const accion = ACCIONES_AUDITORIA[a.accion];
                    return (
                      <tr key={a.id} className="hover:bg-surface/50 transition duration-150 align-middle">
                        <td className="pl-6 pr-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-ink">{fechaDe(a.fechaHora)}</div>
                          <div className="text-xs text-muted">{horaDe(a.fechaHora)}</div>
                        </td>
                        <td className="px-4 py-4">
                          {a.distribuidoraNombre ? (
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-[9px] bg-primary-tint text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                                {iniciales(a.distribuidoraNombre)}
                              </span>
                              <span className="text-sm font-medium text-ink whitespace-nowrap">{a.distribuidoraNombre}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-[9px] bg-surface text-muted flex items-center justify-center shrink-0"><GlobeIcon /></span>
                              <span className="text-sm text-muted whitespace-nowrap">Plataforma (global)</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4" title={a.usuarioCorreo ?? undefined}>
                          <div className="text-sm font-medium text-ink whitespace-nowrap">{a.usuarioNombre ?? a.usuarioCorreo ?? 'Sistema'}</div>
                          <div className="text-xs text-muted">{ETIQUETA_ROL[a.usuarioRol] ?? a.usuarioRol ?? (a.usuarioNombre ? a.usuarioCorreo : '')}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-medium whitespace-nowrap ${TONOS_ACCION[accion?.tono ?? 'neu']}`}>
                            {etiquetaAccion(a.accion)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-[13px] text-faint leading-relaxed min-w-[220px]"><Detalle texto={a.detalle} /></td>
                        <td className="pl-4 pr-6 py-4 font-mono text-xs text-faint whitespace-nowrap">{a.ip ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filas.length > 0 && (
            <div className="border-t border-border px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-muted">
                Mostrando {inicio}–{fin} de {total.toLocaleString('es-CO')} registro{total !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-3">
                <Pagination page={paginaActual} totalPages={totalPaginas} onPageChange={setPagina} />
                <p className="text-xs text-muted">Página {paginaActual} de {totalPaginas}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
