// Datos simulados del panel del Superadministrador (RF58, RF59, RF69, RF70, RF71).
// Respeta la forma del contrato de /api/plataforma/... (T117, T185, T191). El backend
// toma de aquí los nombres de campo (plan de la Iteración 3, tareas 185 y 191).
// Nombres alineados con FP-15 §2.14.1 y §2.16 (versión del 23/11/2026).
// Guarda el estado en memoria mientras la pestaña siga abierta: crear una distribuidora,
// cambiar su estado, crear o editar un plan o asignarlo se refleja en todas las pantallas
// y deja su fila en el log de auditoría.
//
// ── Contrato ─────────────────────────────────────────────────────────────────────────
// Cuota (en el plan): número entero ≥ 0, o null = sin límite.
// Uso de una cuota:   { usado, limite }   (limite null = sin límite)
//
// PlanSuscripcion (GET/POST/PUT /api/plataforma/planes):
//   { id, nombre, descripcion, precioMensual,
//     maxUsuarios, maxProductos, maxComerciantes, maxAlmacenamientoMb, maxLlamadasIaMes,
//     totalDistribuidoras,
//     distribuidoras: [{ id, nombreComercial, estado,
//                        uso: { usuarios, productos, comerciantes, almacenamientoMb, llamadasIaMes } }] }
//   (en distribuidoras[].uso van solo los números usados, para avisar al bajar una cuota)
//
// Distribuidora (GET /api/plataforma/distribuidoras/{id}):
//   { id, razonSocial, nit, nombreComercial, subdominio, nombreGerente, correoGerente,
//     telefono, direccion, planId, planNombre, plan (= planNombre, compatibilidad), fechaPlan,
//     estado, motivoEstado, fechaEstado, createdAt, usuariosActivos,
//     uso: { usuarios, productos, comerciantes, almacenamientoMb, llamadasIaMes }  ← { usado, limite }
//     historialEstados: [{ estadoAnterior, estadoNuevo, motivo, fecha }] }
//
// PATCH /api/plataforma/distribuidoras/{id}/plan  { planId, motivo } → Distribuidora
// POST  /api/plataforma/distribuidoras            { ..., planId }      (antes: plan en texto)
//
// Panel (GET /api/plataforma/panel?desde=YYYY-MM-DD&hasta=YYYY-MM-DD):
//   { desde, hasta, generadoEn,
//     distribuidoras: { total, porEstado: { ACTIVO, PRUEBA, SUSPENDIDO, INACTIVO } },
//     usuarios:       { registrados, habilitados, nuevos },
//     ventas:         { valor, transacciones },
//     pedidosProveedor: { cantidad, valor },
//     planillasLiquidadas,
//     almacenamiento: { usadoMb, asignadoMb },
//     ia:             { llamadas, voz, recomendaciones },
//     porDistribuidora: [{ distribuidoraId, nombreComercial, razonSocial, planId, planNombre, estado,
//                          ventas: { valor, transacciones }, llamadasIa, uso: (igual que en Distribuidora) }],
//     serie: [{ fecha, ventas, transacciones, llamadasIa, usuariosNuevos }] }
//   La serie es por día y cubre por lo menos los 6 meses que terminan en «hasta»
//   (desde el día 1 del quinto mes anterior), o desde «desde» si el periodo es más largo.
//
// Auditoría (GET /api/plataforma/auditoria?page&size&distribuidoraId&usuarioId&desde&hasta&accion):
//   Página de Spring: { content, totalElements, totalPages, number, size }, ordenada por fechaHora desc.
//   Fila: { id, fechaHora, ip, tenantId, distribuidoraNombre (null = plataforma),
//           usuarioId, usuarioNombre, usuarioCorreo, usuarioRol, accion, entidad, entidadId, detalle }
//   accion: códigos AccionAuditoria de FP-15 §2.16.3 (estilo ENTIDAD_VERBO: USUARIO_CREAR, PLAN_ASIGNAR…).
//   detalle: JSON guardado como texto. Formas que usa este mock:
//     DISTRIBUIDORA_CAMBIAR_ESTADO {estadoAnterior, estadoNuevo, motivo} · DISTRIBUIDORA_APROVISIONAR {plan, correoGerente}
//     DISTRIBUIDORA_REENVIAR_ACCESO {correoGerente} · PLAN_ASIGNAR {planAnterior, planNuevo, motivo}
//     PLAN_CREAR {plan, precioMensual, cuotas} · PLAN_EDITAR {plan, cambios: [{campo, antes, despues}]}
//     USUARIO_* {nombre, correo, rol} (editar: cambios) · PRODUCTO_CREAR {nombre, sku, proveedor}
//     PLANILLA_LIQUIDAR {totalCobrado, efectivoRecibido, esquema} · CREDITO_POLITICA_CAMBIAR {comerciante, antes, despues}
//     ABONO_REGISTRAR {comerciante, valor} · SESION_* {rol} · CONTRASENA_CAMBIAR {} · ACCESO_BLOQUEADO {estado}
// GET /api/plataforma/auditoria/acciones  → ['USUARIO_CREAR', 'PLAN_ASIGNAR', 'DISTRIBUIDORA_CAMBIAR_ESTADO', ...] (FP-15 §2.16.3)
// GET /api/plataforma/auditoria/usuarios?distribuidoraId → [{ id, nombre, correo, rol, distribuidoraNombre }]
//
// ── Casos para probar a mano ─────────────────────────────────────────────────────────
//   - NIT, subdominio o correo de una distribuidora existente → 409.
//   - Correo del gerente que contenga "fallo" (ej. gerente.fallo@prueba.co) →
//     se crea, pero responde correoEnviado = false (aviso + «Reenviar acceso»).
//   - Plan con un nombre que ya existe → 409. Cuota negativa → 400.
//   - Bajar a 500 la cuota de productos del plan Estándar: Mágico Sabor ya tiene 534 (aviso).

const DEMORA_MS = 400;

const esperar = (valor, demora = DEMORA_MS) =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(valor)), demora));

const errorHttp = (status, mensaje, extra = {}) =>
  Object.assign(new Error(mensaje), { response: { status, data: { error: mensaje, ...extra } } });

const TRANSICIONES = {
  PRUEBA:     ['ACTIVO', 'SUSPENDIDO', 'INACTIVO'],
  ACTIVO:     ['SUSPENDIDO', 'INACTIVO'],
  SUSPENDIDO: ['ACTIVO', 'INACTIVO'],
  INACTIVO:   [],
};

const haceDias = (dias, hora = 9, minuto = 12) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(hora, minuto, 0, 0);
  return d.toISOString();
};

/** Fecha local YYYY-MM-DD (no toISOString: en Colombia el día cambiaría a las 7 p. m.). */
const claveDia = (fecha) => {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const desdeClave = (clave) => {
  const [y, m, d] = clave.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const sumarDias = (fecha, dias) => {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
};

/** Número pseudoaleatorio estable en [0, 1) para una semilla de texto: la misma fecha da siempre el mismo dato. */
function azar(semilla) {
  let h = 2166136261;
  for (let i = 0; i < semilla.length; i += 1) {
    h ^= semilla.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h += h << 13; h ^= h >>> 7; h += h << 3; h ^= h >>> 17; h += h << 5;
  return ((h >>> 0) % 100000) / 100000;
}

const normalizar = (texto) =>
  String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const soloDigitos = (nit) => String(nit ?? '').replace(/\D/g, '');

/* ══════════════════════════ Planes de suscripción (RF70) ══════════════════════════ */

const CUOTAS = ['maxUsuarios', 'maxProductos', 'maxComerciantes', 'maxAlmacenamientoMb', 'maxLlamadasIaMes'];
const cuotasDe = (p) => Object.fromEntries(CUOTAS.map((c) => [c, p[c] ?? null]));

const planes = new Map();

[
  {
    id: '3f6a9c1e-1b2d-4e5f-8a9b-0c1d2e3f4a51', nombre: 'Básico', descripcion: 'Plan de entrada', precioMensual: 149000,
    maxUsuarios: 5, maxProductos: 150, maxComerciantes: 30, maxAlmacenamientoMb: 1024, maxLlamadasIaMes: 500,
  },
  {
    id: '3f6a9c1e-1b2d-4e5f-8a9b-0c1d2e3f4a52', nombre: 'Estándar', descripcion: 'Plan intermedio', precioMensual: 289000,
    maxUsuarios: 15, maxProductos: 600, maxComerciantes: 120, maxAlmacenamientoMb: 5120, maxLlamadasIaMes: 2000,
  },
  {
    id: '3f6a9c1e-1b2d-4e5f-8a9b-0c1d2e3f4a53', nombre: 'Premium', descripcion: 'Plan completo', precioMensual: 499000,
    maxUsuarios: 40, maxProductos: 2000, maxComerciantes: null, maxAlmacenamientoMb: 20480, maxLlamadasIaMes: 8000,
  },
].forEach((p) => planes.set(p.id, p));

const planPorNombre = (nombre) => [...planes.values()].find((p) => normalizar(p.nombre) === normalizar(nombre));

/* ══════════════════════════ Distribuidoras (RF58, RF59) ══════════════════════════ */

const registro = (dias) => ({ estadoAnterior: null, estadoNuevo: 'PRUEBA', motivo: 'Alta en la plataforma.', fecha: haceDias(dias, 16, 40) });

const store = new Map();

/*
 * Además de los datos de RF58, cada distribuidora simulada trae:
 *   usoBase:   lo que tiene hoy (usuarios habilitados, productos, comerciantes, MB).
 *   ritmo:     ventas por día, llamadas a la IA por día y usuarios deshabilitados,
 *              para generar la serie diaria del panel de forma estable.
 */
[
  {
    id: '00000000-0000-0000-0000-000000000001',
    razonSocial: 'Mágico Sabor S.A.S.', nit: '901245318', nombreComercial: 'Mágico Sabor',
    subdominio: 'magicosabor', nombreGerente: 'Ayde Arévalo', correoGerente: 'ayde.arevalo@magicosabor.co',
    telefono: '+57 312 409 9628', direccion: 'Calle 0 Av 9 #9-36, Carora, Cúcuta', planNombre: 'Estándar',
    estado: 'ACTIVO', creada: 253,
    usoBase: { usuarios: 9, productos: 534, comerciantes: 64, almacenamientoMb: 1843 },
    ritmo: { ventasDia: 2150000, iaDia: 74, deshabilitados: 2 },
    historial: [{ estadoAnterior: 'PRUEBA', estadoNuevo: 'ACTIVO', motivo: 'Distribuidora piloto de GELOX.', dias: 252 }],
  },
  {
    id: '7a1d4c2e-8f3c-41a7-9b2e-5d6f0a1b2c3d',
    razonSocial: 'Helados del Norte S.A.S.', nit: '900876112', nombreComercial: 'Helados del Norte',
    subdominio: 'helados-del-norte', nombreGerente: 'Diana Patricia Rojas', correoGerente: 'gerencia@heladosdelnorte.co',
    telefono: '+57 317 520 4418', direccion: 'Calle 10 # 4-62, Centro, Cúcuta', planNombre: 'Básico',
    estado: 'ACTIVO', creada: 80,
    usoBase: { usuarios: 4, productos: 112, comerciantes: 22, almacenamientoMb: 620 },
    ritmo: { ventasDia: 320000, iaDia: 19, deshabilitados: 0 },
    historial: [{ estadoAnterior: 'PRUEBA', estadoNuevo: 'ACTIVO', motivo: 'Pago del plan Básico confirmado.', dias: 50 }],
  },
  {
    id: 'c4e8a2f1-3b5d-4c6e-8a9b-1d2e3f4a5b6c',
    razonSocial: 'Frío Express Distribuciones S.A.S.', nit: '901552047', nombreComercial: 'Frío Express Cúcuta',
    subdominio: 'frio-express', nombreGerente: 'Luis Fernando Contreras', correoGerente: 'gerencia@frioexpress.co',
    telefono: '+57 315 284 6120', direccion: 'Av. 7 # 12-45, La Playa, Cúcuta', planNombre: 'Básico',
    estado: 'PRUEBA', creada: 13,
    usoBase: { usuarios: 3, productos: 48, comerciantes: 9, almacenamientoMb: 140 },
    ritmo: { ventasDia: 62000, iaDia: 4.5, deshabilitados: 0 },
    historial: [],
  },
  {
    id: 'e2b7c9d4-6a1f-4e3b-9c8d-7f6e5d4c3b2a',
    razonSocial: 'La Frontera Comercializadora Ltda.', nit: '900334981', nombreComercial: 'Distribuidora La Frontera',
    subdominio: 'la-frontera', nombreGerente: 'Jorge Iván Peñaloza', correoGerente: 'jorge.penaloza@lafrontera.co',
    telefono: '+57 310 778 2290', direccion: 'Av. Libertadores # 15-30, Villa del Rosario', planNombre: 'Estándar',
    estado: 'SUSPENDIDO', creada: 155,
    usoBase: { usuarios: 6, productos: 210, comerciantes: 41, almacenamientoMb: 980 },
    ritmo: { ventasDia: 880000, iaDia: 28, deshabilitados: 1 },
    historial: [
      { estadoAnterior: 'PRUEBA', estadoNuevo: 'ACTIVO', motivo: 'Pago del plan Estándar confirmado.', dias: 140 },
      { estadoAnterior: 'ACTIVO', estadoNuevo: 'SUSPENDIDO', motivo: 'Mensualidad de octubre sin pagar 15 días después del vencimiento.', dias: 8 },
    ],
  },
  {
    id: '9f8e7d6c-5b4a-4392-8a1b-0c9d8e7f6a5b',
    razonSocial: 'Polo Andino S.A.S.', nit: '901009776', nombreComercial: 'Polo Andino',
    subdominio: 'polo-andino', nombreGerente: 'Camila Andrea Suárez', correoGerente: 'camila.suarez@poloandino.co',
    telefono: '+57 318 902 1145', direccion: 'Calle 13 # 3-21, Pamplona', planNombre: 'Básico',
    estado: 'INACTIVO', creada: 223,
    usoBase: { usuarios: 2, productos: 60, comerciantes: 12, almacenamientoMb: 310 },
    ritmo: { ventasDia: 150000, iaDia: 0, deshabilitados: 1 },
    historial: [
      { estadoAnterior: 'PRUEBA', estadoNuevo: 'INACTIVO', motivo: 'No continuó después del periodo de prueba.', dias: 190 },
    ],
  },
].forEach(({ creada, historial, planNombre, ...d }) => {
  const historialEstados = [
    registro(creada),
    ...historial.map(({ dias, ...h }) => ({ ...h, fecha: haceDias(dias) })),
  ];
  const ultimo = historialEstados[historialEstados.length - 1];
  const plan = planPorNombre(planNombre);
  store.set(d.id, {
    ...d,
    planId: plan.id,
    planNombre: plan.nombre,
    plan: plan.nombre,
    fechaPlan: historialEstados[0].fecha,
    usuariosActivos: d.usoBase.usuarios,
    motivoEstado: ultimo.motivo,
    fechaEstado: ultimo.fecha,
    createdAt: historialEstados[0].fecha,
    historialEstados,
  });
});

/* ── Serie diaria simulada (ventas, IA, usuarios nuevos) ── */

const TICKET_PROMEDIO = 34000;
const cacheDias = new Map(); // `${id}|${clave}` → día

/** Último día en que la distribuidora operó: hoy, o el día en que pasó a Suspendido / Inactivo. */
function finOperacion(d) {
  if (d.estado !== 'SUSPENDIDO' && d.estado !== 'INACTIVO') return new Date();
  return new Date(d.fechaEstado);
}

function diaDe(d, fecha) {
  const clave = claveDia(fecha);
  const llave = `${d.id}|${clave}`;
  if (cacheDias.has(llave)) return cacheDias.get(llave);

  const dia = desdeClave(clave);
  const inicio = desdeClave(claveDia(d.createdAt));
  const fin = desdeClave(claveDia(finOperacion(d)));
  let resultado = { ventas: 0, transacciones: 0, llamadasIa: 0, pedidos: 0, valorPedidos: 0, planillas: 0, usuariosNuevos: 0 };

  if (dia >= inicio && dia <= fin) {
    const { ventasDia, iaDia } = d.ritmo ?? { ventasDia: 0, iaDia: 0 };
    // Crecimiento suave en los últimos 6 meses y menos ventas los domingos.
    const diasAtras = Math.max(0, Math.round((new Date() - dia) / 86400000));
    const tendencia = 1 - Math.min(diasAtras, 180) / 180 * 0.3;
    const semana = dia.getDay() === 0 ? 0.55 : 1;
    const ruido = 0.75 + azar(`${llave}|v`) * 0.5;
    const ventas = Math.round(ventasDia * tendencia * semana * ruido / 100) * 100;
    const llamadasIa = Math.round(iaDia * (0.7 + azar(`${llave}|ia`) * 0.6));
    const pedidos = ventasDia > 0 && dia.getDay() === 1 ? 1 : 0;
    resultado = {
      ventas,
      transacciones: Math.round(ventas / TICKET_PROMEDIO),
      llamadasIa,
      pedidos,
      valorPedidos: pedidos ? Math.round(ventasDia * 7 * 0.68 / 1000) * 1000 : 0,
      planillas: ventasDia > 1000000 ? Math.round(2 + azar(`${llave}|p`) * 3) : (ventasDia > 300000 && azar(`${llave}|p`) > 0.5 ? 1 : 0),
      usuariosNuevos: 0,
    };
  }
  cacheDias.set(llave, resultado);
  return resultado;
}

/** Fechas de alta de los usuarios: repartidas entre el registro de la distribuidora y hoy. */
function altasUsuarios(d) {
  const total = (d.usoBase?.usuarios ?? 0) + (d.ritmo?.deshabilitados ?? 0);
  const inicio = new Date(d.createdAt);
  const fin = finOperacion(d);
  const span = Math.max(1, fin - inicio);
  return Array.from({ length: total }, (_, i) => claveDia(new Date(inicio.getTime() + (span * (i === 0 ? 0 : i / total) * 0.9))));
}

function recorrerDias(desde, hasta, fn) {
  for (let dia = desdeClave(desde); dia <= desdeClave(hasta); dia = sumarDias(dia, 1)) fn(dia, claveDia(dia));
}

function llamadasIaDelMes(d) {
  const hoy = new Date();
  let total = 0;
  recorrerDias(claveDia(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), claveDia(hoy), (dia) => { total += diaDe(d, dia).llamadasIa; });
  return total;
}

/* ── Uso de cuotas ── */

function usadoDe(d) {
  return {
    usuarios: d.usoBase?.usuarios ?? 0,
    productos: d.usoBase?.productos ?? 0,
    comerciantes: d.usoBase?.comerciantes ?? 0,
    almacenamientoMb: d.usoBase?.almacenamientoMb ?? 0,
    llamadasIaMes: llamadasIaDelMes(d),
  };
}

function usoDe(d) {
  const plan = planes.get(d.planId) ?? {};
  const usado = usadoDe(d);
  return {
    usuarios:         { usado: usado.usuarios,         limite: plan.maxUsuarios ?? null },
    productos:        { usado: usado.productos,        limite: plan.maxProductos ?? null },
    comerciantes:     { usado: usado.comerciantes,     limite: plan.maxComerciantes ?? null },
    almacenamientoMb: { usado: usado.almacenamientoMb, limite: plan.maxAlmacenamientoMb ?? null },
    llamadasIaMes:    { usado: usado.llamadasIaMes,    limite: plan.maxLlamadasIaMes ?? null },
  };
}

const conUso = (d) => ({ ...d, uso: usoDe(d) });

/** Lo que el backend no expone (datos internos del mock). */
const publica = ({ usoBase, ritmo, ...d }) => d; // eslint-disable-line no-unused-vars

/* ══════════════════════════ Auditoría (RF71) ══════════════════════════ */

const SUPERADMIN = { id: 'b1e0c7a2-0000-4000-8000-000000000001', nombre: 'Equipo RESET', correo: 'reset@gelox.app', rol: 'SUPERADMINISTRADOR' };
const IP_SUPERADMIN = '181.53.12.40';

const USUARIOS_DISTRIBUIDORA = {
  '00000000-0000-0000-0000-000000000001': {
    ip: '190.85.44.120',
    usuarios: [
      { id: 'a0000000-0000-4000-8000-000000000101', nombre: 'Ayde Arévalo', correo: 'ayde.arevalo@magicosabor.co', rol: 'ADMINISTRADOR' },
      { id: 'a0000000-0000-4000-8000-000000000102', nombre: 'Carlos Pérez', correo: 'carlos.perez@magicosabor.co', rol: 'ENCARGADO_VENTAS' },
      { id: 'a0000000-0000-4000-8000-000000000103', nombre: 'Sofía Duarte', correo: 'sofia.duarte@magicosabor.co', rol: 'ENCARGADO_INVENTARIO' },
    ],
  },
  '7a1d4c2e-8f3c-41a7-9b2e-5d6f0a1b2c3d': {
    ip: '191.95.140.18',
    usuarios: [
      { id: 'a0000000-0000-4000-8000-000000000201', nombre: 'Diana Patricia Rojas', correo: 'gerencia@heladosdelnorte.co', rol: 'ADMINISTRADOR' },
      { id: 'a0000000-0000-4000-8000-000000000202', nombre: 'Pedro Lizcano', correo: 'pedro.lizcano@heladosdelnorte.co', rol: 'ENCARGADO_INVENTARIO' },
    ],
  },
  'c4e8a2f1-3b5d-4c6e-8a9b-1d2e3f4a5b6c': {
    ip: '186.29.7.211',
    usuarios: [
      { id: 'a0000000-0000-4000-8000-000000000301', nombre: 'Luis Fernando Contreras', correo: 'gerencia@frioexpress.co', rol: 'ADMINISTRADOR' },
      { id: 'a0000000-0000-4000-8000-000000000302', nombre: 'Marta Gómez', correo: 'marta.gomez@frioexpress.co', rol: 'ENCARGADO_VENTAS' },
    ],
  },
  'e2b7c9d4-6a1f-4e3b-9c8d-7f6e5d4c3b2a': {
    ip: '179.32.86.5',
    usuarios: [
      { id: 'a0000000-0000-4000-8000-000000000401', nombre: 'Jorge Iván Peñaloza', correo: 'jorge.penaloza@lafrontera.co', rol: 'ADMINISTRADOR' },
    ],
  },
};

/** Acciones que audita el backend (FP-15, arquitectura de gobierno, tarea 173). */
const ACCIONES = [
  'DISTRIBUIDORA_APROVISIONAR', 'DISTRIBUIDORA_CAMBIAR_ESTADO', 'DISTRIBUIDORA_REENVIAR_ACCESO', 'IDENTIDAD_ACTUALIZAR',
  'PLAN_CREAR', 'PLAN_EDITAR', 'PLAN_ASIGNAR',
  'USUARIO_CREAR', 'USUARIO_EDITAR', 'USUARIO_DESHABILITAR', 'USUARIO_HABILITAR',
  'PRODUCTO_CREAR', 'PROVEEDOR_CREAR', 'PROVEEDOR_EDITAR', 'PROVEEDOR_ACTIVAR', 'PLANTILLA_EXPORTACION_CAMBIAR',
  'CREDITO_POLITICA_CAMBIAR', 'ESQUEMA_LIQUIDACION_CAMBIAR', 'PLANILLA_LIQUIDAR', 'ABONO_REGISTRAR',
  'SESION_INICIAR', 'SESION_CERRAR', 'CONTRASENA_CAMBIAR', 'ACCESO_BLOQUEADO', 'PLANILLA_CAMBIAR_FECHA_LIMITE',
];

const COMERCIANTES_EJEMPLO = ['Tienda La Esquina', 'Supermercado El Ahorro', 'Tienda Don Pepe', 'Minimercado La 10', 'Heladería Sol', 'Tienda Mi Barrio'];
const PRODUCTOS_EJEMPLO = [['Paleta de mango', 'PAL-031'], ['Cono doble chocolate', 'CON-114'], ['Familiar vainilla 2 L', 'FAM-207'], ['Vaso de mora', 'VAS-052'], ['Paleta de coco', 'PAL-044']];
const NOMBRES_EJEMPLO = ['Marta Gómez', 'Jorge Ruiz', 'Sofía Duarte', 'Andrés Villamizar', 'Laura Jaimes', 'Kevin Ortega'];

const auditoria = [];
let secuenciaAuditoria = 0;

function registrarAuditoria({ fechaHora = new Date().toISOString(), distribuidora = null, usuario = SUPERADMIN, ip = IP_SUPERADMIN, accion, entidad, entidadId = null, detalle }) {
  secuenciaAuditoria += 1;
  auditoria.push({
    id: secuenciaAuditoria,
    fechaHora,
    ip,
    tenantId: distribuidora?.id ?? null,
    distribuidoraNombre: distribuidora?.nombreComercial ?? null,
    usuarioId: usuario.id,
    usuarioNombre: usuario.nombre,
    usuarioCorreo: usuario.correo,
    usuarioRol: usuario.rol,
    accion,
    entidad,
    entidadId,
    // FP-15 §2.14.1: auditoria.detalle es JSON guardado como texto.
    detalle: typeof detalle === 'string' ? detalle : JSON.stringify(detalle ?? {}),
  });
}

/** Una operación de un usuario de la distribuidora, según su rol. */
function eventoDeUsuario(u, d, semilla) {
  const r = azar(semilla);
  const elegir = (lista, k = 'x') => lista[Math.floor(azar(`${semilla}|${k}`) * lista.length)];
  if (u.rol === 'ADMINISTRADOR') {
    if (r < 0.28) {
      const n = Math.round(10 + azar(`${semilla}|n`) * 14);
      return { accion: 'PLANILLA_LIQUIDAR', entidad: 'PlanillaComerciante', detalle: { comerciantes: n, totalCobrado: Math.round(n * (150000 + azar(`${semilla}|v`) * 60000) / 1000) * 1000, esquema: 'MARGEN' } };
    }
    if (r < 0.4) {
      const antes = 400000 + Math.round(azar(`${semilla}|c`) * 8) * 100000;
      return { accion: 'CREDITO_POLITICA_CAMBIAR', entidad: 'PoliticaCredito', detalle: { comerciante: elegir(COMERCIANTES_EJEMPLO), antes: { cupo: antes, plazoDias: 0, politica: 'SOLO_ALERTA' }, despues: { cupo: antes + 400000, plazoDias: 0, politica: 'SOLO_ALERTA' } } };
    }
    if (r < 0.5) {
      const rol = elegir(['ENCARGADO_VENTAS', 'ENCARGADO_INVENTARIO'], 'r');
      return { accion: 'USUARIO_CREAR', entidad: 'Usuario', detalle: { nombre: elegir(NOMBRES_EJEMPLO), correo: `${elegir(['marta', 'jorge', 'sofia', 'andres'], 'u')}@${d.subdominio}.co`, rol } };
    }
    if (r < 0.57) {
      return { accion: 'USUARIO_EDITAR', entidad: 'Usuario', detalle: { nombre: elegir(NOMBRES_EJEMPLO), cambios: [{ campo: 'rol', antes: 'ENCARGADO_VENTAS', despues: 'ENCARGADO_INVENTARIO' }] } };
    }
    if (r < 0.62) {
      return { accion: 'USUARIO_DESHABILITAR', entidad: 'Usuario', detalle: { nombre: elegir(NOMBRES_EJEMPLO), rol: 'ENCARGADO_VENTAS' } };
    }
    if (r < 0.66) {
      return { accion: 'ESQUEMA_LIQUIDACION_CAMBIAR', entidad: 'EsquemaLiquidacion', detalle: { antes: { tipo: 'MARGEN', valor: null }, despues: { tipo: 'COMISION', valor: 12 } } };
    }
    if (r < 0.7) {
      return { accion: 'IDENTIDAD_ACTUALIZAR', entidad: 'IdentidadDistribuidora', detalle: { campos: ['logo', 'colorPrimario'] } };
    }
    if (r < 0.73) return { accion: 'CONTRASENA_CAMBIAR', entidad: 'Usuario', detalle: {} };
    return { accion: 'SESION_INICIAR', entidad: 'Usuario', detalle: { rol: u.rol } };
  }
  if (u.rol === 'ENCARGADO_INVENTARIO') {
    if (r < 0.35) {
      const [nombre, sku] = elegir(PRODUCTOS_EJEMPLO);
      return { accion: 'PRODUCTO_CREAR', entidad: 'Producto', detalle: { nombre, sku, proveedor: 'Nutresa' } };
    }
    if (r < 0.45) return { accion: 'PROVEEDOR_CREAR', entidad: 'Proveedor', detalle: { proveedor: 'Lácteos del Oriente', tiempoEntregaDias: 3, montoMinimoPedido: 500000 } };
    if (r < 0.55) return { accion: 'PLANTILLA_EXPORTACION_CAMBIAR', entidad: 'PlantillaExportacion', detalle: { proveedor: 'Nutresa', modo: 'RELLENAR_CATALOGO' } };
    return { accion: 'SESION_INICIAR', entidad: 'Usuario', detalle: { rol: u.rol } };
  }
  if (r < 0.4) {
    return { accion: 'ABONO_REGISTRAR', entidad: 'AbonoComerciante', detalle: { comerciante: elegir(COMERCIANTES_EJEMPLO), valor: 100000 + Math.round(azar(`${semilla}|a`) * 6) * 50000 } };
  }
  if (r < 0.5) return { accion: 'SESION_CERRAR', entidad: 'Usuario', detalle: { rol: u.rol } };
  return { accion: 'SESION_INICIAR', entidad: 'Usuario', detalle: { rol: u.rol } };
}

/* Log inicial: últimos 45 días de operaciones de cada distribuidora y del Superadministrador. */
(function sembrarAuditoria() {
  const distribuidoras = [...store.values()];

  // Altas y cambios de estado del historial de cada distribuidora.
  distribuidoras.forEach((d) => {
    d.historialEstados.forEach((h) => {
      if (!h.estadoAnterior) {
        registrarAuditoria({
          fechaHora: h.fecha, distribuidora: d, accion: 'DISTRIBUIDORA_APROVISIONAR', entidad: 'Distribuidora', entidadId: d.id,
          detalle: { plan: d.planNombre, correoGerente: d.correoGerente },
        });
      } else {
        registrarAuditoria({
          fechaHora: h.fecha, distribuidora: d, accion: 'DISTRIBUIDORA_CAMBIAR_ESTADO', entidad: 'Distribuidora', entidadId: d.id,
          detalle: { estadoAnterior: h.estadoAnterior, estadoNuevo: h.estadoNuevo, motivo: h.motivo },
        });
      }
    });
  });

  // Operaciones diarias de los usuarios de cada distribuidora mientras operó.
  for (let dias = 45; dias >= 0; dias -= 1) {
    distribuidoras.forEach((d) => {
      const datos = USUARIOS_DISTRIBUIDORA[d.id];
      if (!datos) return;
      const fecha = new Date(haceDias(dias));
      if (fecha < new Date(d.createdAt) || fecha > finOperacion(d)) return;
      datos.usuarios.forEach((u, iu) => {
        const semilla = `${d.id}|${dias}|${iu}`;
        const veces = azar(`${semilla}|veces`) < (u.rol === 'ADMINISTRADOR' ? 0.55 : 0.35) ? 1 : 0;
        for (let k = 0; k < veces; k += 1) {
          const hora = 7 + Math.floor(azar(`${semilla}|h${k}`) * 12);
          const minuto = Math.floor(azar(`${semilla}|m${k}`) * 60);
          registrarAuditoria({
            fechaHora: haceDias(dias, hora, minuto), distribuidora: d, usuario: u, ip: datos.ip,
            ...eventoDeUsuario(u, d, `${semilla}|${k}`),
          });
        }
      });
    });
  }

  // La Frontera quedó suspendida: sus intentos de entrar quedan como acceso bloqueado.
  const frontera = store.get('e2b7c9d4-6a1f-4e3b-9c8d-7f6e5d4c3b2a');
  [6, 3, 1].forEach((dias) => registrarAuditoria({
    fechaHora: haceDias(dias, 8, 4 + dias), distribuidora: frontera, usuario: USUARIOS_DISTRIBUIDORA[frontera.id].usuarios[0],
    ip: USUARIOS_DISTRIBUIDORA[frontera.id].ip, accion: 'ACCESO_BLOQUEADO', entidad: 'Distribuidora', entidadId: frontera.id,
    detalle: { estado: 'SUSPENDIDO' },
  }));

  // Operaciones del Superadministrador.
  registrarAuditoria({
    fechaHora: haceDias(6, 17, 12), accion: 'PLAN_EDITAR', entidad: 'PlanSuscripcion', entidadId: planPorNombre('Estándar').id,
    detalle: { plan: 'Estándar', cambios: [{ campo: 'maxProductos', antes: 500, despues: 600 }] },
  });
  registrarAuditoria({
    fechaHora: haceDias(12, 10, 30), accion: 'PLAN_CREAR', entidad: 'PlanSuscripcion', entidadId: planPorNombre('Premium').id,
    detalle: { plan: 'Premium', precioMensual: 499000, cuotas: cuotasDe(planPorNombre('Premium')) },
  });
  registrarAuditoria({
    fechaHora: haceDias(13, 11, 2), distribuidora: store.get('c4e8a2f1-3b5d-4c6e-8a9b-1d2e3f4a5b6c'), accion: 'DISTRIBUIDORA_REENVIAR_ACCESO',
    entidad: 'Distribuidora', entidadId: 'c4e8a2f1-3b5d-4c6e-8a9b-1d2e3f4a5b6c', detalle: { correoGerente: 'gerencia@frioexpress.co' },
  });
  for (let dias = 30; dias >= 0; dias -= 3) {
    registrarAuditoria({ fechaHora: haceDias(dias, 8, 1 + (dias % 7)), usuario: SUPERADMIN, accion: 'SESION_INICIAR', entidad: 'Usuario', detalle: { rol: 'SUPERADMINISTRADOR' } });
  }
}());

/* ══════════════════════════ Funciones simuladas (misma firma que plataformaService) ══════════════════════════ */

/* ── Distribuidoras ── */

export function listar({ estado, q } = {}) {
  const busqueda = normalizar(q);
  const lista = [...store.values()]
    .filter((d) => !estado || d.estado === estado)
    .filter((d) => !busqueda || [d.nombreComercial, d.razonSocial, d.nit, d.subdominio]
      .some((campo) => normalizar(campo).includes(busqueda)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(publica);
  return esperar(lista);
}

export function obtener(id) {
  const d = store.get(id);
  if (!d) return Promise.reject(errorHttp(404, 'Distribuidora no encontrada'));
  return esperar(publica(conUso(d)));
}

export function crear(datos) {
  const existentes = [...store.values()];
  if (existentes.some((d) => soloDigitos(d.nit) === soloDigitos(datos.nit))) {
    return Promise.reject(errorHttp(409, 'Ya existe una distribuidora con ese NIT', { campo: 'nit' }));
  }
  if (existentes.some((d) => d.subdominio === datos.subdominio)) {
    return Promise.reject(errorHttp(409, 'El subdominio ya está en uso', { campo: 'subdominio' }));
  }
  if (existentes.some((d) => normalizar(d.correoGerente) === normalizar(datos.correoGerente))) {
    return Promise.reject(errorHttp(409, 'El correo del gerente ya está registrado', { campo: 'correoGerente' }));
  }
  const plan = planes.get(datos.planId);
  if (!plan) return Promise.reject(errorHttp(400, 'Selecciona un plan válido', { campo: 'planId' }));

  const ahora = new Date().toISOString();
  const nueva = {
    ...datos,
    id: crypto.randomUUID(),
    planId: plan.id,
    planNombre: plan.nombre,
    plan: plan.nombre,
    fechaPlan: ahora,
    estado: 'PRUEBA',
    motivoEstado: 'Alta en la plataforma.',
    fechaEstado: ahora,
    createdAt: ahora,
    usuariosActivos: 1,
    usoBase: { usuarios: 1, productos: 0, comerciantes: 0, almacenamientoMb: 0 },
    ritmo: { ventasDia: 0, iaDia: 0, deshabilitados: 0 },
    historialEstados: [{ estadoAnterior: null, estadoNuevo: 'PRUEBA', motivo: 'Alta en la plataforma.', fecha: ahora }],
  };
  store.set(nueva.id, nueva);
  registrarAuditoria({
    distribuidora: nueva, accion: 'DISTRIBUIDORA_APROVISIONAR', entidad: 'Distribuidora', entidadId: nueva.id,
    detalle: { plan: plan.nombre, correoGerente: nueva.correoGerente },
  });
  return esperar({ ...publica(conUso(nueva)), correoEnviado: !normalizar(datos.correoGerente).includes('fallo') });
}

export function cambiarEstado(id, { estado, motivo }) {
  const d = store.get(id);
  if (!d) return Promise.reject(errorHttp(404, 'Distribuidora no encontrada'));
  if (!motivo || !motivo.trim()) return Promise.reject(errorHttp(400, 'El motivo es obligatorio'));
  if (!TRANSICIONES[d.estado].includes(estado)) {
    return Promise.reject(errorHttp(409, 'Transición no válida'));
  }

  const fecha = new Date().toISOString();
  registrarAuditoria({
    fechaHora: fecha, distribuidora: d, accion: 'DISTRIBUIDORA_CAMBIAR_ESTADO', entidad: 'Distribuidora', entidadId: d.id,
    detalle: { estadoAnterior: d.estado, estadoNuevo: estado, motivo: motivo.trim() },
  });
  d.historialEstados.push({ estadoAnterior: d.estado, estadoNuevo: estado, motivo: motivo.trim(), fecha });
  d.estado = estado;
  d.motivoEstado = motivo.trim();
  d.fechaEstado = fecha;
  cacheDias.clear();
  return esperar(publica(conUso(d)));
}

export function reenviarAcceso(id) {
  const d = store.get(id);
  if (!d) return Promise.reject(errorHttp(404, 'Distribuidora no encontrada'));
  if (d.estado === 'INACTIVO') {
    return Promise.reject(errorHttp(409, 'La distribuidora está inactiva'));
  }
  registrarAuditoria({
    distribuidora: d, accion: 'DISTRIBUIDORA_REENVIAR_ACCESO', entidad: 'Distribuidora', entidadId: d.id,
    detalle: { correoGerente: d.correoGerente },
  });
  return esperar({ correoEnviado: true, correoGerente: d.correoGerente });
}

/** PATCH /distribuidoras/{id}/plan — aplica de inmediato; el consumo no se reinicia. */
export function asignarPlan(id, { planId, motivo }) {
  const d = store.get(id);
  if (!d) return Promise.reject(errorHttp(404, 'Distribuidora no encontrada'));
  if (d.estado === 'INACTIVO') return Promise.reject(errorHttp(409, 'La distribuidora está inactiva: no admite cambios de plan'));
  const plan = planes.get(planId);
  if (!plan) return Promise.reject(errorHttp(404, 'Plan no encontrado'));
  if (!motivo || !motivo.trim()) return Promise.reject(errorHttp(400, 'El motivo es obligatorio'));
  if (plan.id === d.planId) return Promise.reject(errorHttp(409, 'La distribuidora ya tiene ese plan'));

  const anterior = planes.get(d.planId);
  registrarAuditoria({
    distribuidora: d, accion: 'PLAN_ASIGNAR', entidad: 'Distribuidora', entidadId: d.id,
    detalle: { planAnterior: anterior?.nombre ?? d.planNombre, planNuevo: plan.nombre, motivo: motivo.trim() },
  });
  d.planId = plan.id;
  d.planNombre = plan.nombre;
  d.plan = plan.nombre;
  d.fechaPlan = new Date().toISOString();
  return esperar(publica(conUso(d)));
}

/* ── Planes ── */

function planConDistribuidoras(p) {
  const asignadas = [...store.values()]
    .filter((d) => d.planId === p.id)
    // Las que operan primero (por antigüedad) y las inactivas al final.
    .sort((a, b) => (a.estado === 'INACTIVO') - (b.estado === 'INACTIVO') || a.createdAt.localeCompare(b.createdAt))
    .map((d) => ({ id: d.id, nombreComercial: d.nombreComercial, estado: d.estado, uso: usadoDe(d) }));
  return { ...p, totalDistribuidoras: asignadas.length, distribuidoras: asignadas };
}

export function listarPlanes() {
  const lista = [...planes.values()]
    .sort((a, b) => a.precioMensual - b.precioMensual)
    .map(planConDistribuidoras);
  return esperar(lista);
}

export function obtenerPlan(id) {
  const p = planes.get(id);
  if (!p) return Promise.reject(errorHttp(404, 'Plan no encontrado'));
  return esperar(planConDistribuidoras(p));
}

function validarPlan(datos, idActual) {
  const nombre = String(datos.nombre ?? '').trim();
  if (!nombre) return errorHttp(400, 'El nombre del plan es obligatorio', { campo: 'nombre' });
  if ([...planes.values()].some((p) => p.id !== idActual && normalizar(p.nombre) === normalizar(nombre))) {
    return errorHttp(409, 'Ya existe un plan con ese nombre', { campo: 'nombre' });
  }
  if (!(Number(datos.precioMensual) >= 0)) return errorHttp(400, 'El precio no puede ser negativo', { campo: 'precioMensual' });
  const negativa = CUOTAS.find((c) => datos[c] != null && Number(datos[c]) < 0);
  if (negativa) return errorHttp(400, 'Las cuotas no pueden ser negativas', { campo: negativa });
  return null;
}

const limpiarPlan = (datos) => ({
  nombre: String(datos.nombre).trim(),
  descripcion: String(datos.descripcion ?? '').trim(),
  precioMensual: Number(datos.precioMensual),
  ...Object.fromEntries(CUOTAS.map((c) => [c, datos[c] == null || datos[c] === '' ? null : Number(datos[c])])),
});


export function crearPlan(datos) {
  const error = validarPlan(datos);
  if (error) return Promise.reject(error);
  const plan = { id: crypto.randomUUID(), ...limpiarPlan(datos) };
  planes.set(plan.id, plan);
  registrarAuditoria({
    accion: 'PLAN_CREAR', entidad: 'PlanSuscripcion', entidadId: plan.id,
    detalle: { plan: plan.nombre, precioMensual: plan.precioMensual, cuotas: cuotasDe(plan) },
  });
  return esperar(planConDistribuidoras(plan));
}

export function editarPlan(id, datos) {
  const actual = planes.get(id);
  if (!actual) return Promise.reject(errorHttp(404, 'Plan no encontrado'));
  const error = validarPlan(datos, id);
  if (error) return Promise.reject(error);
  const nuevo = { ...actual, ...limpiarPlan(datos) };

  const cambios = ['nombre', 'descripcion', 'precioMensual', ...CUOTAS]
    .filter((campo) => (nuevo[campo] ?? null) !== (actual[campo] ?? null))
    .map((campo) => ({ campo, antes: actual[campo] ?? null, despues: nuevo[campo] ?? null }));
  planes.set(id, nuevo);
  // El nombre del plan se repite en cada distribuidora (DistribuidoraDTO.planNombre).
  store.forEach((d) => { if (d.planId === id) { d.planNombre = nuevo.nombre; d.plan = nuevo.nombre; } });
  if (cambios.length) {
    registrarAuditoria({
      accion: 'PLAN_EDITAR', entidad: 'PlanSuscripcion', entidadId: id,
      detalle: { plan: actual.nombre, cambios },
    });
  }
  return esperar(planConDistribuidoras(nuevo));
}

/* ── Panel (RF69) ── */

const CLAVE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function panel({ desde, hasta } = {}) {
  const hoy = claveDia(new Date());
  const fin = CLAVE_FECHA.test(hasta ?? '') ? hasta : hoy;
  const inicio = CLAVE_FECHA.test(desde ?? '') ? desde : `${fin.slice(0, 7)}-01`;
  if (inicio > fin) return Promise.reject(errorHttp(400, 'La fecha inicial no puede ser posterior a la final'));

  const distribuidoras = [...store.values()];
  const porEstado = { ACTIVO: 0, PRUEBA: 0, SUSPENDIDO: 0, INACTIVO: 0 };
  distribuidoras.forEach((d) => { porEstado[d.estado] += 1; });

  const finSerie = desdeClave(fin);
  const inicioSeis = claveDia(new Date(finSerie.getFullYear(), finSerie.getMonth() - 5, 1));
  const inicioSerie = inicio < inicioSeis ? inicio : inicioSeis;

  const serie = new Map();
  recorrerDias(inicioSerie, fin, (_, clave) => serie.set(clave, { fecha: clave, ventas: 0, transacciones: 0, llamadasIa: 0, usuariosNuevos: 0 }));

  const totales = { valor: 0, transacciones: 0, pedidos: 0, valorPedidos: 0, planillas: 0, llamadas: 0 };
  let registrados = 0;
  let habilitados = 0;
  let nuevos = 0;
  let usadoMb = 0;
  let asignadoMb = 0;

  const porDistribuidora = distribuidoras.map((d) => {
    let valor = 0;
    let transacciones = 0;
    let llamadasIa = 0;
    recorrerDias(inicioSerie, fin, (dia, clave) => {
      const x = diaDe(d, dia);
      const punto = serie.get(clave);
      punto.ventas += x.ventas;
      punto.transacciones += x.transacciones;
      punto.llamadasIa += x.llamadasIa;
      if (clave >= inicio) {
        valor += x.ventas;
        transacciones += x.transacciones;
        llamadasIa += x.llamadasIa;
        totales.pedidos += x.pedidos;
        totales.valorPedidos += x.valorPedidos;
        totales.planillas += x.planillas;
      }
    });
    altasUsuarios(d).forEach((clave) => {
      if (serie.has(clave)) serie.get(clave).usuariosNuevos += 1;
      if (clave >= inicio && clave <= fin) nuevos += 1;
    });
    totales.valor += valor;
    totales.transacciones += transacciones;
    totales.llamadas += llamadasIa;
    const uso = usoDe(d);
    registrados += uso.usuarios.usado + (d.ritmo?.deshabilitados ?? 0);
    if (d.estado !== 'INACTIVO') habilitados += uso.usuarios.usado;
    usadoMb += uso.almacenamientoMb.usado;
    asignadoMb += uso.almacenamientoMb.limite ?? 0;
    return {
      distribuidoraId: d.id,
      nombreComercial: d.nombreComercial,
      razonSocial: d.razonSocial,
      planId: d.planId,
      planNombre: d.planNombre,
      estado: d.estado,
      ventas: { valor, transacciones },
      llamadasIa,
      uso,
    };
  }).sort((a, b) => b.ventas.valor - a.ventas.valor);

  const voz = Math.round(totales.llamadas * 0.7);
  return esperar({
    desde: inicio,
    hasta: fin,
    generadoEn: new Date().toISOString(),
    distribuidoras: { total: distribuidoras.length, porEstado },
    usuarios: { registrados, habilitados, nuevos },
    ventas: { valor: totales.valor, transacciones: totales.transacciones },
    pedidosProveedor: { cantidad: totales.pedidos, valor: totales.valorPedidos },
    planillasLiquidadas: totales.planillas,
    almacenamiento: { usadoMb, asignadoMb },
    ia: { llamadas: totales.llamadas, voz, recomendaciones: totales.llamadas - voz },
    porDistribuidora,
    serie: [...serie.values()],
  }, 550);
}

/* ── Auditoría (RF71) ── */

function filtrarAuditoria({ distribuidoraId, usuarioId, desde, hasta, accion } = {}) {
  return auditoria
    .filter((a) => !distribuidoraId || a.tenantId === distribuidoraId)
    .filter((a) => !usuarioId || a.usuarioId === usuarioId)
    .filter((a) => !accion || a.accion === accion)
    .filter((a) => !desde || claveDia(a.fechaHora) >= desde)
    .filter((a) => !hasta || claveDia(a.fechaHora) <= hasta);
}

export function listarAuditoria({ page = 0, size = 10, ...filtros } = {}) {
  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    return Promise.reject(errorHttp(400, 'La fecha inicial no puede ser posterior a la final'));
  }
  const filas = filtrarAuditoria(filtros).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora) || b.id - a.id);
  const tam = Math.max(1, Number(size) || 10);
  const totalPages = Math.max(1, Math.ceil(filas.length / tam));
  const numero = Math.min(Math.max(0, Number(page) || 0), totalPages - 1);
  return esperar({
    content: filas.slice(numero * tam, (numero + 1) * tam),
    totalElements: filas.length,
    totalPages,
    number: numero,
    size: tam,
  });
}

export function listarAccionesAuditoria() {
  return esperar([...ACCIONES], 200);
}

export function listarUsuariosAuditoria({ distribuidoraId } = {}) {
  const vistos = new Map();
  auditoria
    .filter((a) => !distribuidoraId || a.tenantId === distribuidoraId)
    .forEach((a) => {
      if (!vistos.has(a.usuarioId)) {
        vistos.set(a.usuarioId, {
          id: a.usuarioId, nombre: a.usuarioNombre, correo: a.usuarioCorreo, rol: a.usuarioRol, distribuidoraNombre: a.distribuidoraNombre,
        });
      }
    });
  return esperar([...vistos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), 200);
}

/* ── Simulador de bloqueo (solo desarrollo con mock) ──
 * Expone en la consola del navegador:
 *   geloxSimularBloqueo('DISTRIBUIDORA_SUSPENDIDA')
 *   geloxSimularBloqueo('DISTRIBUIDORA_INACTIVA')
 *   geloxSimularBloqueo('USUARIO_INACTIVO')   → 403 normal: no debe redirigir
 * La respuesta pasa por los interceptores reales de axiosConfig, igual que una
 * respuesta del backend (T111-BE2).
 */
// Forma y valores del ejemplo de respuesta del FP-15 (sección 2.9.5).
const RESPUESTAS_BLOQUEO = {
  DISTRIBUIDORA_SUSPENDIDA: { error: 'El acceso de esta distribuidora está suspendido.', distribuidora: 'Helados del Norte' },
  DISTRIBUIDORA_INACTIVA:   { error: 'Esta distribuidora ya no está activa.', distribuidora: 'Polo Andino' },
  USUARIO_INACTIVO:         { error: 'Usuario inactivo' },
};

const CONTACTO_SOPORTE = { correo: 'soporte@gelox.app', whatsapp: '+57 300 000 0000' };

export function instalarSimuladorBloqueo(api) {
  window.geloxSimularBloqueo = (codigo = 'DISTRIBUIDORA_SUSPENDIDA') => {
    const base = RESPUESTAS_BLOQUEO[codigo] ?? { error: 'Acceso denegado' };
    const data = codigo.startsWith('DISTRIBUIDORA_') ? { ...base, codigo, contacto: CONTACTO_SOPORTE } : { ...base, codigo };
    return api
      .get('/__mock/bloqueo', {
        adapter: (config) => Promise.reject(Object.assign(new Error(data.error), {
          isAxiosError: true,
          config,
          response: { status: 403, statusText: 'Forbidden', data, headers: {}, config },
        })),
      })
      .catch((err) => {
        console.info('[mock] 403 simulado:', err.response?.data);
      });
  };
}
