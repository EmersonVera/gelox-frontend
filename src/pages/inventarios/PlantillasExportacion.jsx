// src/pages/inventarios/PlantillasExportacion.jsx — plantilla de exportación de pedidos por proveedor
// (HU-19, RF67, FP-15 §2.18.1). Sigue el mockup «08 Inventarios - Plantilla Exportacion».
// La diseña el Encargado de Inventarios; el Gerente también entra.
import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import SuccessToast from '../../components/SuccessToast';
import { useIdentidad } from '../../context/IdentidadContext';
import { iniciales, mensajeError } from '../../components/inventarios/proveedoresUtils';
import { listarProveedoresActivos } from '../../services/proveedoresService';
import {
  USAR_MOCK, CAMPOS_PLANTILLA,
  obtenerPlantilla, guardarPlantilla, vistaPreviaPlantilla,
} from '../../services/exportacionService';

const MODOS = [
  { value: 'GENERAR_FILAS',     titulo: 'Generar filas',     detalle: 'Archivo nuevo con tus columnas y una fila por producto pedido.' },
  { value: 'RELLENAR_CATALOGO', titulo: 'Rellenar catálogo', detalle: 'Archivo base del proveedor: solo se escribe la cantidad en cada fila.' },
];

const ETIQUETA_CAMPO = {
  CODIGO_PROVEEDOR:  'Código del proveedor',
  SKU:               'SKU de GELOX',
  NOMBRE_PRODUCTO:   'Nombre del producto',
  UNIDAD:            'Unidad de compra (abrev.)',
  CANTIDAD:          'Cantidad pedida',
  CANTIDAD_CAJAS:    'Cantidad en cajas',
  CANTIDAD_UNIDADES: 'Cantidad en unidades',
  PRECIO_UNITARIO:   'Costo unitario',
  SUBTOTAL:          'Subtotal',
  FECHA_PEDIDO:      'Fecha del pedido',
  TEXTO_FIJO:        'Valor fijo',
};

const AYUDA_CAMPO = {
  CODIGO_PROVEEDOR: 'Homologado',
  UNIDAD: 'Ej. CJ',
  CANTIDAD: 'Unidad de la fila',
  CANTIDAD_CAJAS: 'Cajas',
  CANTIDAD_UNIDADES: 'Unidades',
  PRECIO_UNITARIO: 'Sin separadores',
  FECHA_PEDIDO: 'AAAA-MM-DD',
};

const inputClass =
  'w-full bg-white border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3 py-2.5 text-sm text-ink outline-none transition-all duration-200 placeholder:text-faint/50 disabled:bg-surface disabled:text-muted';
const labelClass = 'block text-[11px] font-bold uppercase tracking-widest text-muted mb-1.5';
const botonSecundario =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-white text-sm font-semibold text-ink hover:bg-surface transition active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed';
const botonPrimario =
  'inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition active:scale-[0.97] shadow-[0_2px_8px_rgba(158,32,22,0.25)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none';

let contadorClaves = 0;
const nuevaClave = () => `col-${++contadorClaves}`;
const columnaVacia = () => ({ clave: nuevaClave(), campo: 'CODIGO_PROVEEDOR', encabezado: '', valorFijo: '' });

/** A, B, … Z, AA, AB… */
function letraColumna(indice) {
  let n = indice + 1;
  let letra = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    letra = String.fromCharCode(65 + resto) + letra;
    n = Math.floor((n - 1) / 26);
  }
  return letra;
}

const fechaCorta = (iso) => (iso
  ? new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
  : '');

/** Convierte la respuesta del backend al estado editable del formulario. */
function aFormulario(plantilla) {
  return {
    modo: plantilla.modo ?? 'GENERAR_FILAS',
    formato: plantilla.formato ?? 'XLSX',
    nombreArchivo: plantilla.nombreArchivo ?? '',
    nombreHoja: plantilla.nombreHoja ?? '',
    titulo: plantilla.titulo ?? '',
    archivoBaseUrl: plantilla.archivoBaseUrl ?? '',
    filaEncabezado: plantilla.filaEncabezado ?? 1,
    encabezadoCodigo: plantilla.encabezadoCodigo ?? '',
    encabezadoCantidad: plantilla.encabezadoCantidad ?? '',
    encabezadoUnidad: plantilla.encabezadoUnidad ?? '',
    columnas: (plantilla.columnas ?? [])
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((c) => ({ clave: nuevaClave(), campo: c.campo, encabezado: c.encabezado ?? '', valorFijo: c.valorFijo ?? '' })),
  };
}

const aHomologaciones = (plantilla) =>
  (plantilla.homologaciones ?? []).map((h) => ({ ...h, codigo: h.codigo ?? '' }));

/** Cuerpo que se envía al backend (PUT y vista previa). */
function aCuerpo(form, homologaciones, estado) {
  const base = {
    estado,
    modo: form.modo,
    formato: form.formato,
    nombreArchivo: form.nombreArchivo.trim(),
    nombreHoja: form.nombreHoja.trim(),
    titulo: form.titulo.trim(),
    archivoBaseUrl: form.archivoBaseUrl.trim() || null,
    filaEncabezado: Number(form.filaEncabezado) || 1,
    encabezadoCodigo: form.encabezadoCodigo.trim(),
    encabezadoCantidad: form.encabezadoCantidad.trim(),
    encabezadoUnidad: form.encabezadoUnidad.trim(),
    columnas: [],
    homologaciones: homologaciones.map(({ productoId, codigo }) => ({ productoId, codigo: codigo.trim() })),
  };
  if (form.modo === 'GENERAR_FILAS') {
    base.columnas = form.columnas.map((c, i) => ({
      orden: i + 1,
      campo: c.campo,
      encabezado: c.encabezado.trim(),
      valorFijo: c.campo === 'TEXTO_FIJO' ? c.valorFijo.trim() : null,
    }));
  }
  return base;
}

/** Texto que explica por qué no se puede guardar, o '' si la plantilla está completa. */
function problemaDeValidacion(form) {
  if (!form.nombreArchivo.trim()) return 'Indica el nombre del archivo.';
  if (!(Number(form.filaEncabezado) >= 1)) return 'La fila de encabezados debe ser 1 o mayor.';
  if (form.modo === 'GENERAR_FILAS') {
    if (form.columnas.length === 0) return 'Agrega al menos una columna para poder guardar.';
    if (form.columnas.some((c) => !c.encabezado.trim())) return 'Cada columna necesita un encabezado.';
    if (form.columnas.some((c) => c.campo === 'TEXTO_FIJO' && !c.valorFijo.trim())) {
      return 'Las columnas de valor fijo necesitan su valor.';
    }
    return '';
  }
  if (!form.encabezadoCodigo.trim() || !form.encabezadoCantidad.trim()) {
    return 'Indica los encabezados de código y de cantidad del archivo base.';
  }
  return '';
}

/** Estado visible de un proveedor en la lista: lo guardado en esta sesión o lo que trae el proveedor. */
function estadoDeProveedor(proveedor, locales) {
  const local = locales[proveedor.id];
  if (local) return local;
  const texto = String(proveedor.plantilla ?? '').trim();
  if (!texto) return { estado: null };
  if (/borrador/i.test(texto)) return { estado: 'BORRADOR' };
  return { estado: 'ACTIVA', etiqueta: texto };
}

/* ── Icons ── */
const svgProps = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
const ArrowIcon = ({ abajo }) => (
  <svg {...svgProps} width="12" height="12">
    {abajo
      ? <polyline points="6 9 12 15 18 9" />
      : <polyline points="18 15 12 9 6 15" />}
  </svg>
);
const TrashIcon = () => (
  <svg {...svgProps} strokeWidth="2">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const PlusIcon = () => (
  <svg {...svgProps}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
const PlayIcon = () => (
  <svg {...svgProps} strokeWidth="2"><polygon points="6 4 20 12 6 20 6 4" /></svg>
);
const CheckIcon = () => (
  <svg {...svgProps}><polyline points="20 6 9 17 4 12" /></svg>
);
const AlertIcon = () => (
  <svg {...svgProps} width="16" height="16" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const GripIcon = () => (
  <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">
    <circle cx="3" cy="3" r="1.3" /><circle cx="9" cy="3" r="1.3" />
    <circle cx="3" cy="8" r="1.3" /><circle cx="9" cy="8" r="1.3" />
    <circle cx="3" cy="13" r="1.3" /><circle cx="9" cy="13" r="1.3" />
  </svg>
);

function Tarjeta({ titulo, detalle, derecha, children }) {
  return (
    <section className="bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-6 pt-5 pb-4">
        <div>
          <h2 className="font-display text-lg font-bold text-ink leading-6">{titulo}</h2>
          {detalle && <p className="text-xs text-muted mt-0.5">{detalle}</p>}
        </div>
        {derecha}
      </div>
      {children}
    </section>
  );
}

function InsigniaEstado({ estado }) {
  if (estado === 'ACTIVA') {
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success-bg text-success-fg shrink-0">Activa</span>;
  }
  if (estado === 'BORRADOR') {
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 shrink-0">Borrador</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface text-muted shrink-0">Por defecto</span>;
}

export default function PlantillasExportacion() {
  const { identidad } = useIdentidad();
  const nombreComercial = identidad?.nombreComercial || 'tu distribuidora';

  const [proveedores, setProveedores] = useState([]);
  const [proveedorId, setProveedorId] = useState('');
  const [cargandoProveedores, setCargandoProveedores] = useState(true);
  // `cargadoId`: proveedor cuya plantilla ya llegó. Mientras difiera del elegido, se está cargando.
  const [cargadoId, setCargadoId] = useState('');
  const [guardando, setGuardando] = useState('');           // '' | 'BORRADOR' | 'ACTIVA'
  const [error, setError] = useState('');
  const [errorPrevia, setErrorPrevia] = useState('');
  const [form, setForm] = useState(null);
  const [meta, setMeta] = useState(null);                   // { version, actualizadoEn, actualizadoPor }
  const [homologaciones, setHomologaciones] = useState([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [previa, setPrevia] = useState(null);
  const [cargandoPrevia, setCargandoPrevia] = useState(false);
  const [estadosLocales, setEstadosLocales] = useState({}); // proveedorId → { estado, etiqueta }
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [arrastrando, setArrastrando] = useState(null);
  const peticionPrevia = useRef(0);

  const cargando = !!proveedorId && cargadoId !== proveedorId;

  useEffect(() => {
    let vivo = true;
    listarProveedoresActivos()
      .then((data) => {
        if (!vivo) return;
        setProveedores(data);
        if (data.length > 0) setProveedorId(data[0].id);
      })
      .catch((err) => { if (vivo) setError(mensajeError(err, 'No se pudo cargar la lista de proveedores.')); })
      .finally(() => { if (vivo) setCargandoProveedores(false); });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (!proveedorId) return undefined;
    let vivo = true;
    obtenerPlantilla(proveedorId)
      .then((data) => {
        if (!vivo) return;
        setForm(aFormulario(data));
        setMeta({ version: data.version ?? 0, actualizadoEn: data.actualizadoEn, actualizadoPor: data.actualizadoPor });
        setHomologaciones(aHomologaciones(data));
      })
      .catch((err) => {
        if (!vivo) return;
        setForm(null);
        setMeta(null);
        setHomologaciones([]);
        setError(mensajeError(err, 'No se pudo cargar la plantilla de este proveedor.'));
      })
      .finally(() => { if (vivo) setCargadoId(proveedorId); });
    return () => { vivo = false; };
  }, [proveedorId]);

  const elegirProveedor = (id) => {
    if (id === proveedorId) return;
    setProveedorId(id);
    setError('');
    setPrevia(null);
    setErrorPrevia('');
    setBusquedaProducto('');
  };

  const cambiar = (campos) => setForm((f) => ({ ...f, ...campos }));

  /* ── Columnas (GENERAR_FILAS) ── */
  const cambiarColumna = (clave, campos) =>
    setForm((f) => ({ ...f, columnas: f.columnas.map((c) => (c.clave === clave ? { ...c, ...campos } : c)) }));
  const agregarColumna = () => setForm((f) => ({ ...f, columnas: [...f.columnas, columnaVacia()] }));
  const quitarColumna = (clave) => setForm((f) => ({ ...f, columnas: f.columnas.filter((c) => c.clave !== clave) }));
  const moverColumna = (desde, hasta) =>
    setForm((f) => {
      if (hasta < 0 || hasta >= f.columnas.length || desde === hasta) return f;
      const columnas = [...f.columnas];
      const [movida] = columnas.splice(desde, 1);
      columnas.splice(hasta, 0, movida);
      return { ...f, columnas };
    });

  /* ── Homologación ── */
  const cambiarCodigo = (productoId, codigo) =>
    setHomologaciones((lista) => lista.map((h) => (h.productoId === productoId ? { ...h, codigo } : h)));

  const productosFiltrados = useMemo(() => {
    const q = busquedaProducto.trim().toLowerCase();
    if (!q) return homologaciones;
    return homologaciones.filter((h) =>
      h.nombreProducto?.toLowerCase().includes(q) || h.sku?.toLowerCase().includes(q) || h.codigo.toLowerCase().includes(q));
  }, [homologaciones, busquedaProducto]);

  const pendientes = homologaciones.filter((h) => !h.codigo.trim()).length;
  const problema = form ? problemaDeValidacion(form) : '';
  const ocupado = !!guardando || cargando;

  /* ── Acciones ── */
  const probar = async () => {
    if (!form || problema) return;
    const id = ++peticionPrevia.current;
    setCargandoPrevia(true);
    setErrorPrevia('');
    try {
      const data = await vistaPreviaPlantilla(proveedorId, aCuerpo(form, homologaciones, null));
      if (id === peticionPrevia.current) setPrevia(data);
    } catch (err) {
      if (id === peticionPrevia.current) {
        setPrevia(null);
        setErrorPrevia(mensajeError(err, 'No se pudo generar la vista previa.'));
      }
    } finally {
      if (id === peticionPrevia.current) setCargandoPrevia(false);
    }
  };

  const guardar = async (estado) => {
    if (!form || problema) return;
    setGuardando(estado);
    setError('');
    try {
      const data = await guardarPlantilla(proveedorId, aCuerpo(form, homologaciones, estado));
      setForm(aFormulario(data));
      setMeta({ version: data.version ?? 0, actualizadoEn: data.actualizadoEn, actualizadoPor: data.actualizadoPor });
      setHomologaciones(aHomologaciones(data));
      setEstadosLocales((e) => ({
        ...e,
        [proveedorId]: { estado: data.estado, etiqueta: `Plantilla v${data.version}` },
      }));
      setToast({
        show: true,
        msg: estado === 'ACTIVA' ? 'Plantilla activada.' : 'Borrador guardado.',
        type: 'success',
      });
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar la plantilla.'));
    } finally {
      setGuardando('');
    }
  };

  const proveedor = proveedores.find((p) => p.id === proveedorId);
  const ultimaColumna = letraColumna(Math.max((form?.modo === 'GENERAR_FILAS' ? form.columnas.length : 4) - 1, 0));
  const filasTitulo = form ? Math.max(Number(form.filaEncabezado) - 1, 0) : 0;
  const sustituir = (texto) => String(texto ?? '')
    .replaceAll('{nombreComercial}', nombreComercial)
    .replaceAll('{fecha}', new Date().toISOString().slice(0, 10));

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 animate-fade-in-up">
          <div>
            <p className="text-xs text-muted mb-1">
              Proveedores › <span className="text-primary font-semibold">Plantillas de exportación</span>
            </p>
            <h1 className="font-display text-2xl font-extrabold text-ink tracking-tight">Plantilla de exportación de pedidos</h1>
            <p className="text-sm text-muted mt-1">
              Configura el archivo que exige cada proveedor. Se genera automáticamente al cerrar un pedido de abastecimiento.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <button type="button" onClick={probar} disabled={!form || !!problema || cargandoPrevia || ocupado} className={botonSecundario}>
              <PlayIcon /> {cargandoPrevia ? 'Probando…' : 'Probar con un pedido'}
            </button>
            <button type="button" onClick={() => guardar('BORRADOR')} disabled={!form || !!problema || ocupado} className={botonSecundario}>
              {guardando === 'BORRADOR' ? 'Guardando…' : 'Guardar borrador'}
            </button>
            <button
              type="button"
              onClick={() => guardar('ACTIVA')}
              disabled={!form || !!problema || ocupado}
              title={pendientes > 0 ? `Se activará con ${pendientes} productos pendientes de homologar (FP-15 §2.18.1)` : undefined}
              className={botonPrimario}
            >
              <CheckIcon /> {guardando === 'ACTIVA' ? 'Activando…' : 'Activar plantilla'}
            </button>
          </div>
        </div>

        {USAR_MOCK && (
          <div className="rounded-xl bg-surface border border-border px-4 py-2.5 text-xs text-muted">
            Modo demostración: los cambios se guardan solo en esta pestaña.
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-xl bg-error-bg border border-danger/20 text-error-fg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {cargandoProveedores ? (
          <p className="text-sm text-muted">Cargando proveedores…</p>
        ) : proveedores.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-10 text-center">
            <p className="font-display font-bold text-ink">No hay proveedores activos</p>
            <p className="text-sm text-muted mt-1">Registra un proveedor en la sección Proveedores para configurar su plantilla.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)] gap-6 items-start">

            {/* Lista de proveedores */}
            <aside className="flex flex-col gap-4">
              <nav aria-label="Proveedores" className="bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-3">
                <p className="px-2 pt-1 pb-2 text-[10px] uppercase tracking-widest font-bold text-muted">Proveedores</p>
                <ul className="flex flex-col gap-1">
                  {proveedores.map((p) => {
                    const { estado, etiqueta } = estadoDeProveedor(p, estadosLocales);
                    const seleccionado = p.id === proveedorId;
                    const subtitulo = estado === 'ACTIVA' ? `${etiqueta} · activa`
                      : estado === 'BORRADOR' ? 'Borrador'
                        : 'Sin plantilla';
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => elegirProveedor(p.id)}
                          aria-current={seleccionado ? 'true' : undefined}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition border-l-4 ${
                            seleccionado ? 'bg-primary-tint/40 border-primary' : 'border-transparent hover:bg-surface'
                          }`}
                        >
                          <span className="w-9 h-9 rounded-full bg-surface text-xs font-bold text-muted flex items-center justify-center shrink-0">
                            {iniciales(p.nombreComercial)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-sm font-semibold truncate ${seleccionado ? 'text-primary' : 'text-ink'}`}>
                              {p.nombreComercial}
                            </span>
                            <span className="block text-xs text-muted truncate">{subtitulo}</span>
                          </span>
                          <InsigniaEstado estado={estado} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
              <p className="rounded-xl bg-blue-50 text-blue-800 text-xs px-4 py-3">
                Sin plantilla, el pedido se exporta en el formato estándar de GELOX.
              </p>
            </aside>

            {/* Editor */}
            <div className="flex flex-col gap-6 min-w-0">
              {cargando && <p className="text-sm text-muted">Cargando plantilla…</p>}

              {form && !cargando && (
                <>
                  <Tarjeta
                    titulo={`Archivo · ${proveedor?.nombreComercial ?? ''}`}
                    derecha={meta?.version > 0 && (
                      <p className="text-xs text-muted sm:text-right">
                        Última versión · v{meta.version} · {fechaCorta(meta.actualizadoEn)}
                        {meta.actualizadoPor ? ` por ${meta.actualizadoPor}` : ''}
                      </p>
                    )}
                  >
                    <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-[auto_minmax(0,1fr)_14rem] gap-x-5 gap-y-4">
                      <fieldset className="md:col-span-3" disabled={ocupado}>
                        <legend className={labelClass}>Modo de exportación</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {MODOS.map((m) => {
                            const activo = form.modo === m.value;
                            return (
                              <label
                                key={m.value}
                                className={`cursor-pointer rounded-xl border px-4 py-2.5 transition ${
                                  activo ? 'border-primary bg-primary-tint/40' : 'border-border hover:bg-surface'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="modo-plantilla"
                                  value={m.value}
                                  checked={activo}
                                  onChange={() => { cambiar({ modo: m.value }); setPrevia(null); }}
                                  className="sr-only"
                                />
                                <span className="block text-sm font-bold text-ink">{m.titulo}</span>
                                <span className="block text-xs text-muted mt-0.5">{m.detalle}</span>
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>

                      <div>
                        <span className={labelClass} id="etiqueta-formato">Formato</span>
                        <div role="group" aria-labelledby="etiqueta-formato" className="inline-flex gap-1 bg-surface rounded-xl p-1">
                          {['XLSX', 'CSV'].map((f) => (
                            <button
                              key={f}
                              type="button"
                              aria-pressed={form.formato === f}
                              onClick={() => cambiar({ formato: f })}
                              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                                form.formato === f ? 'bg-white text-primary font-bold shadow-sm' : 'text-muted hover:text-ink'
                              }`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label htmlFor="nombre-archivo" className={labelClass}>Nombre del archivo</label>
                        <input
                          id="nombre-archivo"
                          value={form.nombreArchivo}
                          onChange={(e) => cambiar({ nombreArchivo: e.target.value })}
                          placeholder="Pedido_{nombreComercial}_{fecha}"
                          className={`${inputClass} font-mono`}
                        />
                      </div>
                      <div>
                        <label htmlFor="nombre-hoja" className={labelClass}>Nombre de la hoja</label>
                        <input
                          id="nombre-hoja"
                          value={form.nombreHoja}
                          onChange={(e) => cambiar({ nombreHoja: e.target.value })}
                          disabled={form.formato === 'CSV'}
                          placeholder="Pedido"
                          className={inputClass}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label htmlFor="titulo-archivo" className={labelClass}>Título (celdas combinadas)</label>
                        <input
                          id="titulo-archivo"
                          value={form.titulo}
                          onChange={(e) => cambiar({ titulo: e.target.value })}
                          placeholder="Formato de pedido masivo — {nombreComercial}"
                          className={inputClass}
                        />
                        <p className="text-xs text-primary mt-1.5">
                          {filasTitulo > 0 ? `Rango A1:${ultimaColumna}${filasTitulo} · ` : 'Sin filas de título · '}
                          usa {'{nombreComercial}'} y {'{fecha}'} como variables
                        </p>
                      </div>
                      <div>
                        <label htmlFor="fila-encabezado" className={labelClass}>Fila de encabezados</label>
                        <input
                          id="fila-encabezado"
                          type="number"
                          min={1}
                          value={form.filaEncabezado}
                          onChange={(e) => cambiar({ filaEncabezado: e.target.value })}
                          className={inputClass}
                        />
                        <p className="text-xs text-primary mt-1.5">
                          Los datos inician en la fila {(Number(form.filaEncabezado) || 1) + 1}
                        </p>
                      </div>
                    </div>
                  </Tarjeta>

                  {form.modo === 'RELLENAR_CATALOGO' ? (
                    <Tarjeta
                      titulo="Archivo base del proveedor"
                      detalle="Ubica los encabezados donde se escribe el código y la cantidad. No se agregan filas."
                    >
                      <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                          <label htmlFor="archivo-base" className={labelClass}>Archivo base</label>
                          <input
                            id="archivo-base"
                            value={form.archivoBaseUrl}
                            onChange={(e) => cambiar({ archivoBaseUrl: e.target.value })}
                            placeholder="Vacío = catálogo estándar de Nutresa (templates/catalogo.xlsx)"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label htmlFor="enc-codigo" className={labelClass}>Encabezado del código</label>
                          <input id="enc-codigo" value={form.encabezadoCodigo} onChange={(e) => cambiar({ encabezadoCodigo: e.target.value })} placeholder="Producto/SKU" className={inputClass} />
                        </div>
                        <div>
                          <label htmlFor="enc-cantidad" className={labelClass}>Encabezado de la cantidad</label>
                          <input id="enc-cantidad" value={form.encabezadoCantidad} onChange={(e) => cambiar({ encabezadoCantidad: e.target.value })} placeholder="Cantidad" className={inputClass} />
                        </div>
                        <div>
                          <label htmlFor="enc-unidad" className={labelClass}>Encabezado de la unidad</label>
                          <input id="enc-unidad" value={form.encabezadoUnidad} onChange={(e) => cambiar({ encabezadoUnidad: e.target.value })} placeholder="Unidad de Medida" className={inputClass} />
                        </div>
                      </div>
                    </Tarjeta>
                  ) : (
                    <Tarjeta
                      titulo="Columnas"
                      detalle="Arrastra para cambiar el orden. Cada columna toma un campo de GELOX o un valor fijo."
                      derecha={(
                        <button type="button" onClick={agregarColumna} className={botonSecundario}>
                          <PlusIcon /> Agregar columna
                        </button>
                      )}
                    >
                      {form.columnas.length === 0 ? (
                        <div className="mx-6 mb-6 rounded-xl border border-dashed border-border px-4 py-8 text-center">
                          <p className="text-sm font-semibold text-ink">Aún no hay columnas</p>
                          <p className="text-xs text-muted mt-1">Agrega al menos una columna para poder guardar la plantilla.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm min-w-[40rem]">
                            <thead>
                              <tr className="bg-surface text-left text-[11px] font-bold uppercase tracking-widest text-muted">
                                <th className="pl-6 pr-2 py-3 w-16" aria-label="Orden" />
                                <th className="px-2 py-3 w-12">Col.</th>
                                <th className="px-2 py-3">Encabezado en el archivo</th>
                                <th className="px-2 py-3">Campo de GELOX</th>
                                <th className="px-2 py-3">Formato / valor</th>
                                <th className="pl-2 pr-6 py-3 w-12" aria-label="Quitar" />
                              </tr>
                            </thead>
                            <tbody>
                              {form.columnas.map((c, i) => (
                                <tr
                                  key={c.clave}
                                  onDragOver={(e) => { if (arrastrando !== null) e.preventDefault(); }}
                                  onDrop={() => { if (arrastrando !== null) moverColumna(arrastrando, i); setArrastrando(null); }}
                                  className={`border-t border-border ${arrastrando === i ? 'opacity-50' : ''}`}
                                >
                                  <td className="pl-6 pr-2 py-2">
                                    <div className="flex items-center gap-1">
                                      <span
                                        draggable
                                        onDragStart={() => setArrastrando(i)}
                                        onDragEnd={() => setArrastrando(null)}
                                        className="cursor-grab text-faint/50 hover:text-muted"
                                        aria-hidden="true"
                                      >
                                        <GripIcon />
                                      </span>
                                      <span className="flex flex-col">
                                        <button type="button" onClick={() => moverColumna(i, i - 1)} disabled={i === 0} aria-label={`Subir la columna ${letraColumna(i)}`} className="text-muted hover:text-ink disabled:opacity-25">
                                          <ArrowIcon />
                                        </button>
                                        <button type="button" onClick={() => moverColumna(i, i + 1)} disabled={i === form.columnas.length - 1} aria-label={`Bajar la columna ${letraColumna(i)}`} className="text-muted hover:text-ink disabled:opacity-25">
                                          <ArrowIcon abajo />
                                        </button>
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-2 py-2">
                                    <span className="inline-flex w-7 h-7 items-center justify-center rounded-md bg-surface font-mono text-xs font-bold text-muted">
                                      {letraColumna(i)}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2">
                                    <input
                                      value={c.encabezado}
                                      onChange={(e) => cambiarColumna(c.clave, { encabezado: e.target.value })}
                                      aria-label={`Encabezado de la columna ${letraColumna(i)}`}
                                      placeholder="Ej. Cajas"
                                      className={inputClass}
                                    />
                                  </td>
                                  <td className="px-2 py-2">
                                    <select
                                      value={c.campo}
                                      onChange={(e) => cambiarColumna(c.clave, { campo: e.target.value })}
                                      aria-label={`Campo de la columna ${letraColumna(i)}`}
                                      className={inputClass}
                                    >
                                      {CAMPOS_PLANTILLA.map((campo) => (
                                        <option key={campo} value={campo}>{ETIQUETA_CAMPO[campo] ?? campo}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-2 py-2">
                                    {c.campo === 'TEXTO_FIJO' ? (
                                      <input
                                        value={c.valorFijo}
                                        onChange={(e) => cambiarColumna(c.clave, { valorFijo: e.target.value })}
                                        aria-label={`Valor fijo de la columna ${letraColumna(i)}`}
                                        placeholder="Ej. código de cliente"
                                        className={inputClass}
                                      />
                                    ) : (
                                      <span className="text-xs text-muted">{AYUDA_CAMPO[c.campo] ?? ''}</span>
                                    )}
                                  </td>
                                  <td className="pl-2 pr-6 py-2 text-right">
                                    <button type="button" onClick={() => quitarColumna(c.clave)} aria-label={`Quitar la columna ${letraColumna(i)}`} className="p-2 rounded-lg text-danger hover:bg-error-bg transition">
                                      <TrashIcon />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </Tarjeta>
                  )}

                  {problema && (
                    <p role="status" className="text-sm text-error-fg bg-error-bg rounded-xl px-4 py-2.5">{problema}</p>
                  )}

                  {/* Vista previa */}
                  <Tarjeta
                    titulo="Vista previa del archivo"
                    detalle="Con los datos de un pedido de ejemplo. Pulsa «Probar con un pedido» para actualizarla."
                  >
                    <div className="px-6 pb-6">
                      {errorPrevia && (
                        <p role="alert" className="text-sm text-error-fg bg-error-bg rounded-xl px-4 py-2.5 mb-3">{errorPrevia}</p>
                      )}
                      {!previa ? (
                        <p className="text-sm text-muted">Aún no hay vista previa.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-surface text-muted">
                                <th className="w-12 border border-border px-2 py-1.5" />
                                {previa.encabezados.map((_, i) => (
                                  <th key={i} className="border border-border px-2 py-1.5 font-semibold">{letraColumna(i)}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {previa.filaEncabezado > 1 && (
                                <tr>
                                  <td className="border border-border bg-surface text-center text-muted px-2 py-2">
                                    {previa.filaEncabezado > 2 ? `1–${previa.filaEncabezado - 1}` : '1'}
                                  </td>
                                  <td colSpan={previa.encabezados.length} className="border border-border text-center font-bold text-ink px-2 py-3 text-sm">
                                    {sustituir(previa.titulo)}
                                  </td>
                                </tr>
                              )}
                              <tr>
                                <td className="border border-border bg-surface text-center text-muted px-2 py-2">{previa.filaEncabezado}</td>
                                {previa.encabezados.map((e, i) => (
                                  <td key={i} className="border border-border font-bold text-ink px-2 py-2 whitespace-nowrap">{e}</td>
                                ))}
                              </tr>
                              {previa.filas.map((fila, i) => (
                                <tr key={i}>
                                  <td className="border border-border bg-surface text-center text-muted px-2 py-2">{previa.filaEncabezado + 1 + i}</td>
                                  {fila.map((valor, j) => {
                                    const esCantidad = form.modo === 'GENERAR_FILAS'
                                      ? form.columnas[j]?.campo?.startsWith('CANTIDAD')
                                      : j === fila.length - 1;
                                    return (
                                      <td key={j} className={`border border-border px-2 py-2 whitespace-nowrap ${esCantidad ? 'bg-amber-100' : ''}`}>
                                        {String(valor ?? '')}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </Tarjeta>

                  {/* Homologación */}
                  <Tarjeta
                    titulo="Códigos de homologación"
                    detalle="SKU de GELOX → código del proveedor"
                    derecha={(
                      <div className="flex items-center gap-3 flex-wrap">
                        <input
                          type="search"
                          value={busquedaProducto}
                          onChange={(e) => setBusquedaProducto(e.target.value)}
                          placeholder="Buscar producto o código"
                          aria-label="Buscar producto o código"
                          className={`${inputClass} sm:w-56`}
                        />
                        {pendientes > 0 && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-error-bg text-error-fg whitespace-nowrap">
                            {pendientes} {pendientes === 1 ? 'pendiente' : 'pendientes'}
                          </span>
                        )}
                      </div>
                    )}
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[36rem]">
                        <thead>
                          <tr className="bg-surface text-left text-[11px] font-bold uppercase tracking-widest text-muted">
                            <th className="px-6 py-3">SKU</th>
                            <th className="px-2 py-3">Producto</th>
                            <th className="px-2 py-3 w-56">Código prov.</th>
                            <th className="pl-2 pr-6 py-3 w-36">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productosFiltrados.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-6 text-center text-muted">No hay productos que coincidan.</td></tr>
                          ) : productosFiltrados.map((h) => {
                            const pendiente = !h.codigo.trim();
                            return (
                              <tr key={h.productoId} className="border-t border-border">
                                <td className="px-6 py-3 font-mono text-xs text-muted">{h.sku}</td>
                                <td className="px-2 py-3 text-ink">{h.nombreProducto}</td>
                                <td className="px-2 py-2">
                                  <input
                                    value={h.codigo}
                                    onChange={(e) => cambiarCodigo(h.productoId, e.target.value)}
                                    aria-label={`Código de ${h.nombreProducto}`}
                                    placeholder="Sin código"
                                    className={`${inputClass} ${pendiente ? 'border-danger/60 ring-1 ring-danger/20' : ''}`}
                                  />
                                </td>
                                <td className="pl-2 pr-6 py-3">
                                  {pendiente ? (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-error-bg text-error-fg">Pendiente</span>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-success-bg text-success-fg">Homologado</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {pendientes > 0 && (
                      <p className="mx-6 mb-6 mt-2 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3">
                        <AlertIcon />
                        Hay {pendientes} {pendientes === 1 ? 'producto' : 'productos'} sin código de homologación. La plantilla se puede activar; al exportar un pedido con estos productos se generará una advertencia para completarlos (FP-15 §2.18.1).
                      </p>
                    )}
                  </Tarjeta>
                </>
              )}
            </div>
          </div>
        )}
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
