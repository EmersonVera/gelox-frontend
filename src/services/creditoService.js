import api from '../api/axiosConfig';
import * as mock from './mocks/mockCredito';

// Crédito de comerciantes (RF65) y esquema de liquidación (RF66).
// Usa la API real. Los datos simulados (mocks/mockCredito.js y mocks/credito.json) solo
// se activan con VITE_USAR_MOCK_CREDITO=true en el .env.
export const USAR_MOCK = import.meta.env.VITE_USAR_MOCK_CREDITO === 'true';

/*
 * Crédito de un comerciante (GET /api/comerciantes/{id}/credito):
 *   { comercianteId, origen: 'DEFECTO' | 'EXCEPCION', cupo, plazoDias,
 *     politica: 'BLOQUEAR' | 'SOLO_ALERTA', politicaDefecto: { cupo, plazoDias, politica },
 *     deudaActual, cupoDisponible,
 *     planillas: [{ planillaId, codigo?, fecha, fechaLimitePago, valor, saldo, vencida?, diasMora? }],
 *     abonos:    [{ id, fecha, valor, observacion, usuarioNombre }] }
 *
 * Esquema (GET /api/liquidacion/esquema): { tipo: 'MARGEN' | 'COMISION' | 'TARIFA_FIJA', valor, vigenteDesde }
 */

/* ── Crédito por comerciante ── */

export async function obtenerCreditoComerciante(comercianteId) {
  if (USAR_MOCK) return mock.obtenerCredito(comercianteId);
  const { data } = await api.get(`/api/comerciantes/${comercianteId}/credito`);
  return data;
}

/** Excepción para el comerciante (solo ADMINISTRADOR; 403 para Encargado de Ventas). */
export async function guardarCreditoComerciante(comercianteId, { cupo, plazoDias, politica }) {
  if (USAR_MOCK) return mock.guardarCredito(comercianteId, { cupo, plazoDias, politica });
  const { data } = await api.put(`/api/comerciantes/${comercianteId}/credito`, { cupo, plazoDias, politica });
  return data;
}

/** Quita la excepción: el comerciante vuelve a la política por defecto. */
export async function usarPoliticaDefecto(comercianteId) {
  if (USAR_MOCK) return mock.usarPoliticaDefecto(comercianteId);
  const { data } = await api.delete(`/api/comerciantes/${comercianteId}/credito`);
  return data;
}

/** El abono se aplica primero a las planillas más antiguas. Devuelve el crédito actualizado. */
export async function registrarAbono(comercianteId, { valor, observacion }) {
  if (USAR_MOCK) return mock.registrarAbono(comercianteId, { valor, observacion });
  const { data } = await api.post(`/api/comerciantes/${comercianteId}/abonos`, { valor, observacion });
  return data;
}

/* ── Política por defecto de la distribuidora ── */

export async function obtenerPoliticaDefecto() {
  if (USAR_MOCK) return mock.obtenerPoliticaDefecto();
  const { data } = await api.get('/api/credito/politica');
  return data;
}

export async function guardarPoliticaDefecto({ cupo, plazoDias, politica }) {
  if (USAR_MOCK) return mock.guardarPoliticaDefecto({ cupo, plazoDias, politica });
  const { data } = await api.put('/api/credito/politica', { cupo, plazoDias, politica });
  return data;
}

/* ── Esquema de liquidación ── */

export async function obtenerEsquemaLiquidacion() {
  if (USAR_MOCK) return mock.obtenerEsquema();
  const { data } = await api.get('/api/liquidacion/esquema');
  return data;
}

export async function guardarEsquemaLiquidacion({ tipo, valor }) {
  if (USAR_MOCK) return mock.guardarEsquema({ tipo, valor });
  const { data } = await api.put('/api/liquidacion/esquema', { tipo, valor });
  return data;
}

/* ── Prórroga de la fecha límite de pago de una planilla (solo ADMINISTRADOR) ── */

export async function extenderFechaLimite(planillaId, { fechaLimitePago, motivo, fechaLimiteActual }) {
  if (USAR_MOCK) return mock.extenderFechaLimite(planillaId, { fechaLimitePago, motivo, fechaLimiteActual });
  const { data } = await api.patch(`/api/planillas/${planillaId}/fecha-limite`, { fechaLimitePago, motivo });
  return data;
}
