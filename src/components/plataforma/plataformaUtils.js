// Constantes y formatos compartidos por las pantallas del Superadministrador (RF58, RF59).

export const ESTADOS_DISTRIBUIDORA = {
  ACTIVO:     { label: 'Activo',               badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  PRUEBA:     { label: 'En periodo de prueba', badge: 'bg-blue-50 text-blue-700',       dot: 'bg-blue-500' },
  SUSPENDIDO: { label: 'Suspendido por mora',  badge: 'bg-error-bg text-error-fg',      dot: 'bg-danger' },
  INACTIVO:   { label: 'Inactivo / Archivado', badge: 'bg-border text-faint',           dot: 'bg-muted' },
};

/** Orden de los filtros de la lista (igual al mockup RF59). */
export const ORDEN_ESTADOS = ['ACTIVO', 'PRUEBA', 'SUSPENDIDO', 'INACTIVO'];

/** Máquina de estados de la sección 2.12.2: INACTIVO es final. */
export const TRANSICIONES = {
  PRUEBA:     ['ACTIVO', 'SUSPENDIDO', 'INACTIVO'],
  ACTIVO:     ['SUSPENDIDO', 'INACTIVO'],
  SUSPENDIDO: ['ACTIVO', 'INACTIVO'],
  INACTIVO:   [],
};

export const PLANES = [
  { value: 'BASICO',   label: 'Básico',   descripcion: 'Plan de entrada' },
  { value: 'ESTANDAR', label: 'Estándar', descripcion: 'Plan intermedio' },
  { value: 'PREMIUM',  label: 'Premium',  descripcion: 'Plan completo' },
];

export const etiquetaPlan = (plan) => PLANES.find((p) => p.value === plan)?.label ?? plan ?? '—';

export const SUBDOMINIO_REGEX = /^[a-z0-9-]{3,30}$/;

/** Sugiere un subdominio a partir del nombre comercial: "Frío Express Cúcuta" → "frio-express-cucuta". */
export function sugerirSubdominio(nombre) {
  return String(nombre ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/, '');
}

/** URL pública de la landing de la distribuidora (RF61): mismo despliegue, ruta /tienda/{subdominio}. */
export const urlTienda = (subdominio) => `${window.location.host}/tienda/${subdominio}`;

/** Palabras que no aportan a las iniciales: «Distribuidora La Frontera» → LF. */
const PALABRAS_GENERICAS = new Set(['distribuidora', 'distribuidoras']);

/**
 * Iniciales como en el mockup RF59: se saltan los conectores en minúscula y la palabra
 * genérica «Distribuidora» («Helados del Norte» → HN). Si no queda ninguna, usa todas.
 */
export function iniciales(nombre) {
  if (!nombre) return '?';
  const palabras = nombre.split(/\s+/).filter((w) => /^[\p{L}\d]/u.test(w));
  const relevantes = palabras.filter((w) => /^[\p{Lu}\d]/u.test(w) && !PALABRAS_GENERICAS.has(w.toLowerCase()));
  return (relevantes.length ? relevantes : palabras)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';
}

/**
 * El backend manda LocalDate («2026-11-19») y LocalDateTime («2026-11-19T10:30:00») sin zona.
 * new Date('2026-11-19') se lee como UTC y en Colombia mostraría el 18: una fecha sola se arma en hora local.
 */
function aFecha(iso) {
  if (iso instanceof Date) return iso;
  const s = String(iso);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(s);
}

export function formatoFecha(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(aFecha(iso));
}

export function formatoFechaHora(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(aFecha(iso));
}

/* ══════════ Planes, cuotas y consumo (RF69, RF70) ══════════ */

/**
 * Cuotas de un plan, en el orden de los mockups. campo: nombre en PlanSuscripcion;
 * uso: clave en distribuidora.uso / porDistribuidora[].uso. Una cuota null = sin límite.
 */
export const CUOTAS = [
  { campo: 'maxUsuarios',         uso: 'usuarios',         label: 'Usuarios',         columna: 'Usuarios' },
  { campo: 'maxProductos',        uso: 'productos',        label: 'Productos',        columna: 'Productos' },
  { campo: 'maxComerciantes',     uso: 'comerciantes',     label: 'Comerciantes',     columna: 'Comerciantes' },
  { campo: 'maxAlmacenamientoMb', uso: 'almacenamientoMb', label: 'Almacenamiento',   columna: 'Almacenamiento', mb: true },
  { campo: 'maxLlamadasIaMes',    uso: 'llamadasIaMes',    label: 'Llamadas IA',      columna: 'Llamadas IA / mes' },
];

/** TipoCuota del backend (409 y advertencias: { cuota: 'USUARIOS', … }) → clave de uso. */
export const CLAVE_CUOTA = {
  USUARIOS: 'usuarios',
  PRODUCTOS: 'productos',
  COMERCIANTES: 'comerciantes',
  ALMACENAMIENTO_MB: 'almacenamientoMb',
  LLAMADAS_IA_MES: 'llamadasIaMes',
};

/** A partir de este porcentaje de uso una cuota se marca como «cerca del límite». */
export const UMBRAL_CUOTA = 80;

export const formatoNumero = (n) => Number(n ?? 0).toLocaleString('es-CO');

export const formatoPesos = (n) => `$${Math.round(Number(n ?? 0)).toLocaleString('es-CO')}`;

/** $48.712.000 → «$48,7 M» (tarjetas del panel). */
export function formatoPesosCorto(n) {
  const v = Number(n ?? 0);
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toLocaleString('es-CO', { maximumFractionDigits: 1 })} mil M`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  return formatoPesos(v);
}

/** 620 → «620 MB», 1843 → «1,8 GB», 5120 → «5 GB». */
export function formatoMB(mb) {
  const v = Number(mb ?? 0);
  if (v >= 1024) return `${(v / 1024).toLocaleString('es-CO', { maximumFractionDigits: 1 })} GB`;
  return `${Math.round(v).toLocaleString('es-CO')} MB`;
}

/** Valor de una cuota para mostrar: «Sin límite» cuando es null. */
export function textoCuota(valor, mb = false) {
  if (valor === null || valor === undefined || valor === '') return 'Sin límite';
  return mb ? formatoMB(valor) : formatoNumero(valor);
}

/** Porcentaje usado de { usado, limite }; null si no hay límite. Un límite 0 con uso cuenta como 100 %. */
export function porcentajeUso(uso) {
  if (!uso || uso.limite === null || uso.limite === undefined) return null;
  if (Number(uso.limite) <= 0) return uso.usado > 0 ? 100 : 0;
  return Math.round((Number(uso.usado) / Number(uso.limite)) * 100);
}

/** Clase del relleno de la barra de uso, como en los mockups: gris, ámbar desde 80 %, rojo al 100 %. */
export function colorUso(pct) {
  if (pct === null) return 'bg-[#a8a29e]';
  if (pct >= 100) return 'bg-danger';
  if (pct >= UMBRAL_CUOTA) return 'bg-amber-600';
  return 'bg-[#a8a29e]';
}

/** «4 de 5», «620 MB de 1 GB» o «4 · sin límite». */
export function textoUso(uso, mb = false) {
  const usado = mb ? formatoMB(uso?.usado) : formatoNumero(uso?.usado);
  if (uso?.limite === null || uso?.limite === undefined) return `${usado} · sin límite`;
  return `${usado} de ${textoCuota(uso.limite, mb)}`;
}

/** Nombre del plan de una distribuidora (planNombre desde T191; plan en texto antes). */
export const nombrePlan = (d) => d?.planNombre ?? etiquetaPlan(d?.plan);

/* ══════════ Auditoría (RF71) ══════════ */

/** Rol del usuario como se muestra en el log (el Gerente es ADMINISTRADOR en el backend). */
export const ETIQUETA_ROL = {
  SUPERADMINISTRADOR: 'Superadministrador',
  ADMINISTRADOR: 'Gerente',
  ENCARGADO_VENTAS: 'Ventas',
  ENCARGADO_INVENTARIO: 'Inventarios',
};

/** Etiqueta y color de cada acción auditada (FP-15, arquitectura de gobierno). */
export const ACCIONES_AUDITORIA = {
  DISTRIBUIDORA_APROVISIONAR:    { label: 'Registro de distribuidora', tono: 'act' },
  DISTRIBUIDORA_CAMBIAR_ESTADO:  { label: 'Cambio de estado',          tono: 'sus' },
  DISTRIBUIDORA_REENVIAR_ACCESO:               { label: 'Reenvío de acceso',         tono: 'neu' },
  IDENTIDAD_ACTUALIZAR:          { label: 'Identidad visual',          tono: 'neu' },
  PLAN_CREAR:                    { label: 'Crear plan',                tono: 'pri' },
  PLAN_EDITAR:                   { label: 'Editar plan',               tono: 'pri' },
  PLAN_ASIGNAR:                  { label: 'Cambio de plan',            tono: 'pri' },
  USUARIO_CREAR:                 { label: 'Crear usuario',             tono: 'act' },
  USUARIO_EDITAR:                { label: 'Editar usuario',            tono: 'pru' },
  USUARIO_DESHABILITAR:          { label: 'Deshabilitar usuario',      tono: 'ina' },
  USUARIO_HABILITAR:             { label: 'Habilitar usuario',         tono: 'act' },
  PRODUCTO_CREAR:                { label: 'Crear producto',            tono: 'act' },
  PROVEEDOR_CREAR:               { label: 'Crear proveedor',           tono: 'act' },
  PROVEEDOR_EDITAR:              { label: 'Editar proveedor',          tono: 'pru' },
  PROVEEDOR_ACTIVAR:             { label: 'Activar proveedor',         tono: 'act' },
  PLANTILLA_EXPORTACION_CAMBIAR: { label: 'Plantilla de exportación',  tono: 'neu' },
  CREDITO_POLITICA_CAMBIAR:      { label: 'Cambio de política de crédito', tono: 'neu' },
  ESQUEMA_LIQUIDACION_CAMBIAR:   { label: 'Cambio de esquema de liquidación', tono: 'neu' },
  PLANILLA_LIQUIDAR:             { label: 'Liquidación',               tono: 'neu' },
  ABONO_REGISTRAR:               { label: 'Abono de crédito',          tono: 'neu' },
  SESION_INICIAR:                { label: 'Inicio de sesión',          tono: 'neu' },
  SESION_CERRAR:                 { label: 'Cierre de sesión',          tono: 'neu' },
  CONTRASENA_CAMBIAR:            { label: 'Cambio de contraseña',      tono: 'neu' },
  ACCESO_BLOQUEADO:              { label: 'Acceso bloqueado',          tono: 'sus' },
  TOKEN_INVALIDO:                { label: 'Token inválido',            tono: 'sus' },
  PLANILLA_CAMBIAR_FECHA_LIMITE: { label: 'Prórroga de fecha límite',  tono: 'neu' },
};

export const TONOS_ACCION = {
  act: 'bg-emerald-50 text-emerald-700',
  pru: 'bg-blue-50 text-blue-700',
  sus: 'bg-error-bg text-error-fg',
  ina: 'bg-border text-faint',
  neu: 'bg-surface text-faint',
  pri: 'bg-primary-tint text-primary font-semibold',
};

/** «CREDITO_POLITICA_CAMBIAR» → «Cambiar politica credito» para una acción nueva que aún no tenga etiqueta. */
export function etiquetaAccion(codigo) {
  if (ACCIONES_AUDITORIA[codigo]) return ACCIONES_AUDITORIA[codigo].label;
  const texto = String(codigo ?? '').toLowerCase().replace(/_/g, ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Fecha local YYYY-MM-DD para los filtros (no toISOString: en Colombia cambiaría de día a las 7 p. m.). */
export function fechaISO(fecha = new Date()) {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** «2026-11-19» → «19/11/2026» sin pasar por zonas horarias. */
export function formatoFechaCorta(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** Mensaje legible de un error de axios ({ error } es el formato del backend). */
export function mensajeError(err, porDefecto) {
  if (!err?.response) return 'Sin conexión con el servidor. Intenta de nuevo.';
  const data = err.response.data;
  return data?.error ?? data?.mensaje ?? data?.message ?? porDefecto;
}
