// Cálculos y formatos de crédito y liquidación de comerciantes (RF65, RF66).

export const POLITICAS_VENCIMIENTO = {
  BLOQUEAR: {
    label: 'Bloquear nuevos despachos a crédito',
    corto: 'Bloquear al vencer',
    descripcion: 'El comerciante solo puede recibir mercancía de contado hasta ponerse al día.',
  },
  SOLO_ALERTA: {
    label: 'Permitir despacho con alerta',
    corto: 'Solo alerta',
    descripcion: 'El Encargado de Ventas ve una alerta al despachar; el Gerente recibe una notificación.',
  },
};

export const ESQUEMAS = {
  MARGEN: {
    label: 'Margen por producto',
    descripcion: 'El comerciante compra a precio de comerciante y vende a precio público; gana la diferencia por unidad.',
    formula: 'Ganancia = Σ vendidas × (PVP − precio comerciante)',
    conValor: false,
  },
  COMISION: {
    label: 'Comisión porcentual',
    descripcion: 'El comerciante gana un porcentaje fijo sobre el total vendido en la jornada.',
    formula: 'Ganancia = Total vendido × % comisión',
    conValor: true,
    unidad: '%',
  },
  TARIFA_FIJA: {
    label: 'Tarifa fija',
    descripcion: 'El comerciante recibe un valor fijo por cada planilla liquidada, sin importar lo vendido.',
    formula: 'Ganancia = valor fijo por planilla',
    conValor: true,
    unidad: '$',
  },
};

/** Máximo de días que el Gerente puede correr la fecha límite de una planilla. */
export const MAX_DIAS_PRORROGA = 15;

export const formatoCOP = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');

const pad = (n) => String(n).padStart(2, '0');

/** Fecha local de hoy (no UTC) en ISO: evita el desfase de Colombia (UTC-5). */
export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function aISO(fecha) {
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
}

export function parseISO(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function sumarDias(iso, dias) {
  const f = parseISO(iso) ?? new Date();
  f.setDate(f.getDate() + Number(dias || 0));
  return aISO(f);
}

/** Días de iso1 a iso2 (positivo si iso2 es posterior). */
export function diasEntre(iso1, iso2) {
  const a = parseISO(iso1);
  const b = parseISO(iso2);
  if (!a || !b) return 0;
  return Math.round((b - a) / 86400000);
}

export function formatoFecha(iso) {
  const f = parseISO(iso);
  return f ? `${pad(f.getDate())}/${pad(f.getMonth() + 1)}/${f.getFullYear()}` : '—';
}

/**
 * Estado de una planilla con saldo según su fecha límite de pago:
 * PAGADA · VENCIDA (diasMora) · POR_VENCER (≤ 5 días) · AL_DIA.
 */
export function estadoPlanilla(planilla, hoy = hoyISO()) {
  if (Number(planilla.saldo) <= 0) return { codigo: 'PAGADA', label: 'Pagada', clase: 'bg-[#f0fdf4] text-[#16a34a]' };
  const dias = diasEntre(hoy, planilla.fechaLimitePago);
  if (planilla.vencida || dias < 0) {
    const mora = planilla.diasMora ?? Math.abs(dias);
    return { codigo: 'VENCIDA', label: `Vencida · ${mora} d`, diasMora: mora, clase: 'bg-[#fef2f2] text-[#dc2626]' };
  }
  if (dias <= 5) {
    return { codigo: 'POR_VENCER', label: dias === 0 ? 'Vence hoy' : `Vence en ${dias} d`, clase: 'bg-[#fffbeb] text-[#d97706]' };
  }
  return { codigo: 'AL_DIA', label: 'Al día', clase: 'bg-[#f5f5f4] text-[#57534e]' };
}

/** Resumen del crédito de un comerciante a partir de lo que devuelve el backend. */
export function resumenCredito(credito, hoy = hoyISO()) {
  const planillas = (credito?.planillas ?? []).filter((p) => Number(p.saldo) > 0);
  const deuda = credito?.deudaActual ?? planillas.reduce((s, p) => s + Number(p.saldo), 0);
  const cupo = Number(credito?.cupo ?? 0);
  const vencidas = planillas.filter((p) => estadoPlanilla(p, hoy).codigo === 'VENCIDA');
  const pendientes = planillas
    .filter((p) => estadoPlanilla(p, hoy).codigo !== 'VENCIDA')
    .sort((a, b) => String(a.fechaLimitePago).localeCompare(String(b.fechaLimitePago)));
  return {
    deuda,
    cupo,
    cupoDisponible: credito?.cupoDisponible ?? Math.max(0, cupo - deuda),
    usoCupo: cupo > 0 ? Math.min(100, (deuda / cupo) * 100) : (deuda > 0 ? 100 : 0),
    vencidas,
    totalVencido: vencidas.reduce((s, p) => s + Number(p.saldo), 0),
    moraMaxima: vencidas.reduce((m, p) => Math.max(m, estadoPlanilla(p, hoy).diasMora ?? 0), 0),
    proxima: pendientes[0] ?? null,
    planillas,
  };
}

/** Un abono se aplica primero a las planillas más antiguas. */
export function distribuirAbono(planillas, monto) {
  let restante = Math.max(0, Number(monto) || 0);
  const orden = [...planillas]
    .filter((p) => Number(p.saldo) > 0)
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  const aplicado = [];
  for (const p of orden) {
    if (restante <= 0) break;
    const valor = Math.min(restante, Number(p.saldo));
    restante -= valor;
    aplicado.push({ planilla: p, valor, saldoRestante: Number(p.saldo) - valor });
  }
  return { aplicado, sobrante: restante };
}

/**
 * Liquidación de una planilla con el esquema vigente.
 * lineas: [{ vendidas, precioComerciante, precioPublico? }]
 *   totalPublico  = Σ vendidas × PVP (lo que vendió el comerciante)
 *   ganancia      = según el esquema
 *   montoCobrado  = totalPublico − ganancia (lo que el comerciante entrega a la distribuidora)
 * Con MARGEN el monto cobrado es Σ vendidas × precio comerciante, igual que en la Iteración 2.
 */
export function calcularLiquidacion(lineas, esquema) {
  const tipo = esquema?.tipo ?? 'MARGEN';
  const valor = Number(esquema?.valor) || 0;
  let totalPublico = 0;
  let totalComerciante = 0;
  let unidades = 0;
  let sinPrecioPublico = false;
  for (const l of lineas) {
    const vendidas = Math.max(0, Number(l.vendidas) || 0);
    const pc = Number(l.precioComerciante) || 0;
    const pvp = l.precioPublico != null ? Number(l.precioPublico) : null;
    if (vendidas > 0 && pvp == null) sinPrecioPublico = true;
    unidades += vendidas;
    totalComerciante += vendidas * pc;
    totalPublico += vendidas * (pvp ?? pc);
  }
  let ganancia;
  if (tipo === 'COMISION') ganancia = totalPublico * (valor / 100);
  else if (tipo === 'TARIFA_FIJA') ganancia = unidades > 0 ? valor : 0;
  else ganancia = totalPublico - totalComerciante;
  ganancia = Math.max(0, Math.min(ganancia, totalPublico));
  return {
    tipo,
    valor: esquema?.valor ?? null,
    unidades,
    totalPublico,
    ganancia,
    montoCobrado: Math.max(0, totalPublico - ganancia),
    sinPrecioPublico,
  };
}

export function etiquetaEsquema(tipo, valor) {
  const e = ESQUEMAS[tipo];
  if (!e) return tipo ?? '—';
  if (tipo === 'COMISION' && valor != null) return `${e.label} · ${Number(valor).toLocaleString('es-CO')} %`;
  if (tipo === 'TARIFA_FIJA' && valor != null) return `${e.label} · ${formatoCOP(valor)}`;
  return e.label;
}

/** Mensaje legible de un error de axios: { error } | { mensaje } | { campo: mensaje }. */
export function mensajeError(err, porDefecto) {
  if (!err?.response) return 'Sin conexión con el servidor. Intenta de nuevo.';
  if (err.response.status === 403) return 'No tienes permiso para esta acción.';
  const data = err.response.data;
  if (typeof data === 'string' && data.trim()) return data;
  const validacion = data && typeof data === 'object' ? Object.values(data).find((v) => typeof v === 'string') : null;
  return data?.error ?? data?.mensaje ?? data?.message ?? validacion ?? porDefecto;
}
