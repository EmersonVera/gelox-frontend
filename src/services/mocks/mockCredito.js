// Datos simulados de crédito de comerciantes y esquema de liquidación (RF65, RF66).
// Los datos de partida salen de credito.json (reemplazable por el JSON de Juan); este
// módulo guarda el estado en memoria mientras la pestaña siga abierta.
//
// Cada comerciante, la primera vez que se consulta, recibe una copia de
// ejemploComerciante (excepción de crédito, 4 planillas con saldo, 2 de ellas vencidas
// y un abono), para poder probar la sección Crédito con cualquier comerciante real.
import datos from './credito.json';
import { hoyISO, sumarDias, distribuirAbono, MAX_DIAS_PRORROGA, diasEntre } from '../../components/ventas/creditoUtils';

const DEMORA_MS = 350;

const esperar = (valor) =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(valor)), DEMORA_MS));

const errorHttp = (status, mensaje, extra = {}) =>
  Object.assign(new Error(mensaje), { response: { status, data: { error: mensaje, ...extra } } });

let politicaDefecto = { ...datos.politicaDefecto };
let esquema = { ...datos.esquema };
const comerciantes = new Map();   // comercianteId → { excepcion, planillas, abonos }
const fechasLimite = new Map();   // planillaId real → fecha límite prorrogada

function estadoDe(comercianteId) {
  if (!comerciantes.has(comercianteId)) {
    const hoy = hoyISO();
    const ej = datos.ejemploComerciante;
    comerciantes.set(comercianteId, {
      excepcion: ej.excepcion ? { ...ej.excepcion } : null,
      planillas: ej.planillas.map((p) => ({
        planillaId: `mock-${p.codigo}`,
        codigo: p.codigo,
        fecha: sumarDias(hoy, -p.haceDias),
        fechaLimitePago: sumarDias(hoy, p.venceEnDias),
        valor: p.valor,
        saldo: p.saldo,
      })),
      abonos: ej.abonos.map((a, i) => ({
        id: `mock-abono-${i + 1}`,
        fecha: sumarDias(hoy, -a.haceDias),
        valor: a.valor,
        observacion: a.observacion,
        usuarioNombre: a.usuarioNombre,
      })),
    });
  }
  return comerciantes.get(comercianteId);
}

function vista(comercianteId) {
  const e = estadoDe(comercianteId);
  const politica = e.excepcion ?? politicaDefecto;
  const deudaActual = e.planillas.reduce((s, p) => s + p.saldo, 0);
  return {
    comercianteId,
    origen: e.excepcion ? 'EXCEPCION' : 'DEFECTO',
    cupo: politica.cupo,
    plazoDias: politica.plazoDias,
    politica: politica.politica,
    politicaDefecto: { ...politicaDefecto },
    deudaActual,
    cupoDisponible: Math.max(0, politica.cupo - deudaActual),
    planillas: e.planillas.filter((p) => p.saldo > 0),
    abonos: [...e.abonos].sort((a, b) => b.fecha.localeCompare(a.fecha)),
  };
}

function validarPolitica({ cupo, plazoDias, politica }) {
  if (!(Number(cupo) >= 0)) return 'El cupo no puede ser negativo';
  if (!(Number.isInteger(Number(plazoDias)) && Number(plazoDias) >= 0)) return 'El plazo debe ser un número entero de días, 0 o más';
  if (!['BLOQUEAR', 'SOLO_ALERTA'].includes(politica)) return 'Política ante vencimiento no válida';
  return null;
}

/* ── Crédito por comerciante ── */

export function obtenerCredito(comercianteId) {
  return esperar(vista(comercianteId));
}

export function guardarCredito(comercianteId, politica) {
  const invalido = validarPolitica(politica);
  if (invalido) return Promise.reject(errorHttp(400, invalido));
  estadoDe(comercianteId).excepcion = {
    cupo: Number(politica.cupo), plazoDias: Number(politica.plazoDias), politica: politica.politica,
  };
  return esperar(vista(comercianteId));
}

export function usarPoliticaDefecto(comercianteId) {
  estadoDe(comercianteId).excepcion = null;
  return esperar(vista(comercianteId));
}

export function registrarAbono(comercianteId, { valor, observacion }) {
  const monto = Number(valor);
  if (!(monto > 0)) return Promise.reject(errorHttp(400, 'El valor del abono debe ser mayor a 0'));
  const e = estadoDe(comercianteId);
  const deuda = e.planillas.reduce((s, p) => s + p.saldo, 0);
  if (monto > deuda) return Promise.reject(errorHttp(400, 'El abono supera la deuda actual'));
  const { aplicado } = distribuirAbono(e.planillas, monto);
  aplicado.forEach(({ planilla, saldoRestante }) => {
    e.planillas.find((p) => p.planillaId === planilla.planillaId).saldo = saldoRestante;
  });
  e.abonos.push({
    id: crypto.randomUUID(), fecha: hoyISO(), valor: monto,
    observacion: observacion?.trim() || null, usuarioNombre: 'Tú (modo simulado)',
  });
  return esperar(vista(comercianteId));
}

/* ── Política por defecto y esquema de la distribuidora ── */

export function obtenerPoliticaDefecto() {
  return esperar(politicaDefecto);
}

export function guardarPoliticaDefecto(politica) {
  const invalido = validarPolitica(politica);
  if (invalido) return Promise.reject(errorHttp(400, invalido));
  politicaDefecto = { cupo: Number(politica.cupo), plazoDias: Number(politica.plazoDias), politica: politica.politica };
  return esperar(politicaDefecto);
}

export function obtenerEsquema() {
  return esperar(esquema);
}

export function guardarEsquema({ tipo, valor }) {
  if (!['MARGEN', 'COMISION', 'TARIFA_FIJA'].includes(tipo)) return Promise.reject(errorHttp(400, 'Tipo de esquema no válido'));
  const v = valor == null || valor === '' ? null : Number(valor);
  if (tipo === 'COMISION' && !(v > 0 && v <= 100)) return Promise.reject(errorHttp(400, 'La comisión debe estar entre 0 y 100 %'));
  if (tipo === 'TARIFA_FIJA' && !(v >= 0)) return Promise.reject(errorHttp(400, 'La tarifa no puede ser negativa'));
  esquema = { tipo, valor: tipo === 'MARGEN' ? null : v, vigenteDesde: new Date().toISOString() };
  return esperar(esquema);
}

/* ── Prórroga de la fecha límite de una planilla ── */

export function extenderFechaLimite(planillaId, { fechaLimitePago, motivo, fechaLimiteActual }) {
  if (!motivo?.trim()) return Promise.reject(errorHttp(400, 'El motivo es obligatorio'));
  const planillaMock = [...comerciantes.values()].flatMap((e) => e.planillas).find((p) => p.planillaId === planillaId);
  const actual = planillaMock?.fechaLimitePago ?? fechasLimite.get(planillaId) ?? fechaLimiteActual ?? hoyISO();
  const dias = diasEntre(actual, fechaLimitePago);
  if (dias <= 0) return Promise.reject(errorHttp(400, 'La nueva fecha debe ser posterior a la actual'));
  if (dias > MAX_DIAS_PRORROGA) return Promise.reject(errorHttp(400, `Máximo ${MAX_DIAS_PRORROGA} días adicionales`));
  if (planillaMock) planillaMock.fechaLimitePago = fechaLimitePago;
  else fechasLimite.set(planillaId, fechaLimitePago);
  return esperar({ planillaId, fechaLimitePago, motivo: motivo.trim() });
}
