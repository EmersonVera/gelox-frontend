// src/pages/inventarios/Proveedores.jsx — proveedores comerciales de la distribuidora
import { useEffect, useMemo, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import Pagination from '../../components/ui/Pagination';
import SuccessToast from '../../components/SuccessToast';
import FormProveedor from '../../components/inventarios/FormProveedor';
import {
  formatoNit, formatoCOP, formatoDias, iniciales, mensajeError,
} from '../../components/inventarios/proveedoresUtils';
import { USAR_MOCK, listarProveedores } from '../../services/proveedoresService';

const TAMANO_PAGINA = 8;

const FILTROS = [
  { value: '',          label: 'Todos' },
  { value: 'activos',   label: 'Activos' },
  { value: 'inactivos', label: 'Inactivos' },
];

/* ── Icons ── */
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function Kpi({ titulo, valor, detalle }) {
  return (
    <div className="bg-white rounded-2xl border border-border px-6 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted">{titulo}</p>
      <p className="font-display text-2xl font-extrabold text-ink mt-2">{valor}</p>
      <p className="text-xs text-muted mt-1">{detalle}</p>
    </div>
  );
}

function EstadoProveedor({ activo }) {
  return activo ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-success-bg text-success-fg">
      <span className="w-1.5 h-1.5 rounded-full bg-success-fg" />Activo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface text-muted">
      <span className="w-1.5 h-1.5 rounded-full bg-muted" />Inactivo
    </span>
  );
}

export default function Proveedores() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('');
  const [pagina, setPagina] = useState(1);
  // null: panel cerrado · 'nuevo': alta · objeto: edición
  const [enEdicion, setEnEdicion] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  useEffect(() => {
    let vivo = true;
    listarProveedores()
      .then((data) => { if (vivo) setLista(data); })
      .catch((err) => { if (vivo) setError(mensajeError(err, 'No se pudo cargar la lista de proveedores.')); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, []);

  // Búsqueda y filtro en pantalla: la lista de proveedores de una distribuidora es corta.
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const digitos = q.replace(/\D/g, '');
    return lista
      .filter((p) => (filtro === 'activos' ? p.activo : filtro === 'inactivos' ? !p.activo : true))
      .filter((p) => !q
        || p.nombreComercial?.toLowerCase().includes(q)
        || p.razonSocial?.toLowerCase().includes(q)
        || (digitos && String(p.nit).includes(digitos)));
  }, [lista, busqueda, filtro]);

  const activos = lista.filter((p) => p.activo);
  const entregaPromedio = activos.length
    ? activos.reduce((s, p) => s + Number(p.tiempoEntregaDias || 0), 0) / activos.length
    : 0;
  const productosAsociados = lista.reduce((s, p) => s + Number(p.productosAsociados || 0), 0);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / TAMANO_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaActual - 1) * TAMANO_PAGINA, paginaActual * TAMANO_PAGINA);

  const alGuardar = (guardado, mensaje) => {
    setLista((prev) => {
      const existe = prev.some((p) => p.id === guardado.id);
      return existe ? prev.map((p) => (p.id === guardado.id ? guardado : p)) : [guardado, ...prev];
    });
    setEnEdicion(null);
    setToast({ show: true, msg: mensaje, type: 'success' });
  };

  const panelAbierto = enEdicion !== null;
  const idSeleccionado = enEdicion && enEdicion !== 'nuevo' ? enEdicion.id : null;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in-up">
          <div>
            <p className="text-xs text-muted mb-1">
              Inventario › <span className="text-primary font-semibold">Proveedores</span>
            </p>
            <h1 className="font-display text-2xl font-extrabold text-ink tracking-tight">Proveedores</h1>
            <p className="text-sm text-muted mt-1">
              Registra los proveedores comerciales de tu distribuidora y sus condiciones de pedido.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEnEdicion('nuevo')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition active:scale-[0.97] shadow-[0_2px_8px_rgba(158,32,22,0.25)] self-start sm:self-auto"
          >
            <PlusIcon />
            Nuevo proveedor
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up [animation-delay:60ms]">
          <Kpi
            titulo="Proveedores activos"
            valor={activos.length}
            detalle={`${lista.length - activos.length} inactivo${lista.length - activos.length === 1 ? '' : 's'}`}
          />
          <Kpi
            titulo="Entrega promedio"
            valor={`${entregaPromedio.toLocaleString('es-CO', { maximumFractionDigits: 1 })} días`}
            detalle="Días hábiles desde el envío del pedido"
          />
          <Kpi titulo="Productos asociados" valor={productosAsociados} detalle="En el catálogo multimarca" />
        </div>

        <div className={`grid gap-6 items-start ${panelAbierto ? 'xl:grid-cols-[minmax(0,1fr)_380px]' : ''}`}>

          {/* Tabla */}
          <div className="bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden animate-fade-in-up [animation-delay:120ms]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-6 py-4 border-b border-border">
              <div>
                <h2 className="font-display text-base font-bold text-ink">Listado de proveedores</h2>
                <p className="text-xs text-muted">
                  {lista.length} registrado{lista.length === 1 ? '' : 's'}
                  {USAR_MOCK && ' · modo simulado'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"><SearchIcon /></span>
                  <input
                    type="search"
                    value={busqueda}
                    onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                    placeholder="Buscar nombre o NIT"
                    aria-label="Buscar proveedor"
                    className="w-[200px] pl-9 pr-3 py-2 border border-border rounded-xl text-sm outline-none bg-white text-ink placeholder:text-[#c0c0c0] focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {FILTROS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    aria-pressed={filtro === f.value}
                    onClick={() => { setFiltro(f.value); setPagina(1); }}
                    className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition ${
                      filtro === f.value
                        ? 'bg-primary border-primary text-white'
                        : 'bg-white border-border text-ink hover:bg-surface'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="px-6 py-4">
                <div className="px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm">{error}</div>
              </div>
            )}

            {cargando ? (
              <div className="flex items-center justify-center gap-3 py-16 text-muted text-sm">
                <span className="w-5 h-5 rounded-full border-2 border-muted/30 border-t-muted animate-spin" />
                Cargando proveedores...
              </div>
            ) : !error && filtrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1 py-16 text-center px-6">
                <p className="text-sm font-semibold text-ink">
                  {lista.length === 0 ? 'Aún no hay proveedores registrados.' : 'Ningún proveedor coincide con la búsqueda.'}
                </p>
                <p className="text-xs text-muted">
                  {lista.length === 0 ? 'Registra el primero con «Nuevo proveedor».' : 'Prueba con otro nombre, NIT o filtro.'}
                </p>
              </div>
            ) : filtrados.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="bg-surface text-left">
                      <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Proveedor</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">NIT</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider text-center">Entrega</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider text-right">Monto mín.</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider text-center">Prod.</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Estado</th>
                      <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visibles.map((p) => {
                      const seleccionado = p.id === idSeleccionado;
                      const tenue = p.activo ? 'text-ink' : 'text-muted';
                      return (
                        <tr
                          key={p.id}
                          onClick={() => setEnEdicion(p)}
                          className={`cursor-pointer transition ${seleccionado ? 'bg-[#fef2f2] shadow-[inset_3px_0_0_var(--color-primary)]' : 'hover:bg-surface/50'}`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                p.activo ? 'bg-surface text-primary' : 'bg-surface text-muted'
                              }`}>
                                {iniciales(p.nombreComercial)}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-sm font-semibold truncate ${tenue}`}>{p.nombreComercial}</p>
                                {p.contactoNombre && <p className="text-xs text-muted truncate">{p.contactoNombre}</p>}
                              </div>
                            </div>
                          </td>
                          <td className={`px-4 py-4 text-sm font-mono whitespace-nowrap ${tenue}`}>{formatoNit(p.nit)}</td>
                          <td className={`px-4 py-4 text-sm text-center whitespace-nowrap ${tenue}`}>{formatoDias(p.tiempoEntregaDias)}</td>
                          <td className={`px-4 py-4 text-sm text-right whitespace-nowrap ${tenue}`}>{formatoCOP(p.montoMinimo)}</td>
                          <td className={`px-4 py-4 text-sm text-center ${tenue}`}>{p.productosAsociados ?? 0}</td>
                          <td className="px-4 py-4"><EstadoProveedor activo={p.activo} /></td>
                          <td className="px-4 py-4 text-right">
                            <button
                              type="button"
                              aria-label={`Editar ${p.nombreComercial}`}
                              onClick={(e) => { e.stopPropagation(); setEnEdicion(p); }}
                              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border text-muted hover:text-primary hover:border-primary transition"
                            >
                              <EditIcon />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filtrados.length > 0 && (
              <div className="border-t border-border px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-muted">
                  Mostrando {(paginaActual - 1) * TAMANO_PAGINA + 1}–{Math.min(paginaActual * TAMANO_PAGINA, filtrados.length)} de {filtrados.length}
                </p>
                <Pagination page={paginaActual} totalPages={totalPaginas} onPageChange={setPagina} />
              </div>
            )}
          </div>

          {/* Panel de alta / edición */}
          {panelAbierto && (
            <div className="xl:sticky xl:top-6">
              <FormProveedor
                key={idSeleccionado ?? 'nuevo'}
                proveedor={enEdicion === 'nuevo' ? null : enEdicion}
                onCancelar={() => setEnEdicion(null)}
                onGuardado={alGuardar}
              />
            </div>
          )}
        </div>
      </div>

      <SuccessToast
        message={toast.msg}
        show={toast.show}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
        type={toast.type}
      />
    </AppLayout>
  );
}
