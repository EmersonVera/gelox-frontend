// Datos simulados del panel del Superadministrador (RF58, RF59).
// Respeta la forma del contrato de /api/plataforma/distribuidoras (T117).
// Guarda el estado en memoria mientras la pestaña siga abierta, para que crear
// una distribuidora o cambiar su estado se refleje en la lista y en el detalle.
//
// Distribuidora:
//   { id, razonSocial, nit, nombreComercial, subdominio, nombreGerente, correoGerente,
//     telefono, direccion, plan, estado, motivoEstado, fechaEstado, createdAt,
//     usuariosActivos, historialEstados: [{ estadoAnterior, estadoNuevo, motivo, fecha }] }
//
// Casos para probar a mano:
//   - NIT, subdominio o correo de una distribuidora existente → 409.
//   - Correo del gerente que contenga "fallo" (ej. gerente.fallo@prueba.co) →
//     se crea, pero responde correoEnviado = false (aviso + «Reenviar acceso»).

const DEMORA_MS = 400;

const esperar = (valor) =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(valor)), DEMORA_MS));

const errorHttp = (status, mensaje, extra = {}) =>
  Object.assign(new Error(mensaje), { response: { status, data: { error: mensaje, ...extra } } });

const TRANSICIONES = {
  PRUEBA:     ['ACTIVO', 'SUSPENDIDO', 'INACTIVO'],
  ACTIVO:     ['SUSPENDIDO', 'INACTIVO'],
  SUSPENDIDO: ['ACTIVO', 'INACTIVO'],
  INACTIVO:   [],
};

const haceDias = (dias, hora = 9) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(hora, 12, 0, 0);
  return d.toISOString();
};

const registro = (dias) => ({ estadoAnterior: null, estadoNuevo: 'PRUEBA', motivo: 'Alta en la plataforma.', fecha: haceDias(dias, 16) });

const store = new Map();

[
  {
    id: '00000000-0000-0000-0000-000000000001',
    razonSocial: 'Mágico Sabor S.A.S.', nit: '901.245.318-2', nombreComercial: 'Mágico Sabor',
    subdominio: 'magicosabor', nombreGerente: 'Ayde Arévalo', correoGerente: 'ayde.arevalo@magicosabor.co',
    telefono: '+57 312 409 9628', direccion: 'Calle 0 Av 9 #9-36, Carora, Cúcuta', plan: 'ESTANDAR',
    estado: 'ACTIVO', usuariosActivos: 6, creada: 253,
    historial: [{ estadoAnterior: 'PRUEBA', estadoNuevo: 'ACTIVO', motivo: 'Distribuidora piloto de GELOX.', dias: 252 }],
  },
  {
    id: '7a1d4c2e-8f3c-41a7-9b2e-5d6f0a1b2c3d',
    razonSocial: 'Helados del Norte S.A.S.', nit: '900.876.112-5', nombreComercial: 'Helados del Norte',
    subdominio: 'helados-del-norte', nombreGerente: 'Diana Patricia Rojas', correoGerente: 'gerencia@heladosdelnorte.co',
    telefono: '+57 317 520 4418', direccion: 'Calle 10 # 4-62, Centro, Cúcuta', plan: 'BASICO',
    estado: 'ACTIVO', usuariosActivos: 4, creada: 50,
    historial: [{ estadoAnterior: 'PRUEBA', estadoNuevo: 'ACTIVO', motivo: 'Pago del plan Básico confirmado.', dias: 20 }],
  },
  {
    id: 'c4e8a2f1-3b5d-4c6e-8a9b-1d2e3f4a5b6c',
    razonSocial: 'Frío Express Distribuciones S.A.S.', nit: '901.552.047-9', nombreComercial: 'Frío Express Cúcuta',
    subdominio: 'frio-express', nombreGerente: 'Luis Fernando Contreras', correoGerente: 'gerencia@frioexpress.co',
    telefono: '+57 315 284 6120', direccion: 'Av. 7 # 12-45, La Playa, Cúcuta', plan: 'BASICO',
    estado: 'PRUEBA', usuariosActivos: 2, creada: 13, historial: [],
  },
  {
    id: 'e2b7c9d4-6a1f-4e3b-9c8d-7f6e5d4c3b2a',
    razonSocial: 'La Frontera Comercializadora Ltda.', nit: '900.334.981-1', nombreComercial: 'Distribuidora La Frontera',
    subdominio: 'la-frontera', nombreGerente: 'Jorge Iván Peñaloza', correoGerente: 'jorge.penaloza@lafrontera.co',
    telefono: '+57 310 778 2290', direccion: 'Av. Libertadores # 15-30, Villa del Rosario', plan: 'ESTANDAR',
    estado: 'SUSPENDIDO', usuariosActivos: 5, creada: 155,
    historial: [
      { estadoAnterior: 'PRUEBA', estadoNuevo: 'ACTIVO', motivo: 'Pago del plan Estándar confirmado.', dias: 140 },
      { estadoAnterior: 'ACTIVO', estadoNuevo: 'SUSPENDIDO', motivo: 'Mensualidad de septiembre sin pagar 15 días después del vencimiento.', dias: 8 },
    ],
  },
  {
    id: '9f8e7d6c-5b4a-4392-8a1b-0c9d8e7f6a5b',
    razonSocial: 'Polo Andino S.A.S.', nit: '901.009.776-4', nombreComercial: 'Polo Andino',
    subdominio: 'polo-andino', nombreGerente: 'Camila Andrea Suárez', correoGerente: 'camila.suarez@poloandino.co',
    telefono: '+57 318 902 1145', direccion: 'Calle 13 # 3-21, Pamplona', plan: 'BASICO',
    estado: 'INACTIVO', usuariosActivos: 0, creada: 223,
    historial: [
      { estadoAnterior: 'PRUEBA', estadoNuevo: 'INACTIVO', motivo: 'No continuó después del periodo de prueba.', dias: 190 },
    ],
  },
].forEach(({ creada, historial, ...d }) => {
  const historialEstados = [
    registro(creada),
    ...historial.map(({ dias, ...h }) => ({ ...h, fecha: haceDias(dias) })),
  ];
  const ultimo = historialEstados[historialEstados.length - 1];
  store.set(d.id, {
    ...d,
    motivoEstado: ultimo.motivo,
    fechaEstado: ultimo.fecha,
    createdAt: historialEstados[0].fecha,
    historialEstados,
  });
});

const normalizar = (texto) =>
  String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const soloDigitos = (nit) => String(nit ?? '').replace(/\D/g, '');

/* ── Funciones simuladas (misma firma que plataformaService) ── */

export function listar({ estado, q } = {}) {
  const busqueda = normalizar(q);
  const lista = [...store.values()]
    .filter((d) => !estado || d.estado === estado)
    .filter((d) => !busqueda || [d.nombreComercial, d.razonSocial, d.nit, d.subdominio]
      .some((campo) => normalizar(campo).includes(busqueda)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return esperar(lista);
}

export function obtener(id) {
  const d = store.get(id);
  if (!d) return Promise.reject(errorHttp(404, 'Distribuidora no encontrada'));
  return esperar(d);
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

  const ahora = new Date().toISOString();
  const nueva = {
    ...datos,
    id: crypto.randomUUID(),
    estado: 'PRUEBA',
    motivoEstado: 'Alta en la plataforma.',
    fechaEstado: ahora,
    createdAt: ahora,
    usuariosActivos: 1,
    historialEstados: [{ estadoAnterior: null, estadoNuevo: 'PRUEBA', motivo: 'Alta en la plataforma.', fecha: ahora }],
  };
  store.set(nueva.id, nueva);
  return esperar({ ...nueva, correoEnviado: !normalizar(datos.correoGerente).includes('fallo') });
}

export function cambiarEstado(id, { estado, motivo }) {
  const d = store.get(id);
  if (!d) return Promise.reject(errorHttp(404, 'Distribuidora no encontrada'));
  if (!motivo || !motivo.trim()) return Promise.reject(errorHttp(400, 'El motivo es obligatorio'));
  if (!TRANSICIONES[d.estado].includes(estado)) {
    return Promise.reject(errorHttp(409, 'Transición no válida'));
  }

  const fecha = new Date().toISOString();
  d.historialEstados.push({ estadoAnterior: d.estado, estadoNuevo: estado, motivo: motivo.trim(), fecha });
  d.estado = estado;
  d.motivoEstado = motivo.trim();
  d.fechaEstado = fecha;
  return esperar(d);
}

export function reenviarAcceso(id) {
  const d = store.get(id);
  if (!d) return Promise.reject(errorHttp(404, 'Distribuidora no encontrada'));
  if (d.estado === 'INACTIVO') {
    return Promise.reject(errorHttp(409, 'La distribuidora está inactiva'));
  }
  return esperar({ correoEnviado: true, correoGerente: d.correoGerente });
}

/* ── Simulador de bloqueo (solo desarrollo con mock) ──
 * Expone en la consola del navegador:
 *   geloxSimularBloqueo('DISTRIBUIDORA_SUSPENDIDA')
 *   geloxSimularBloqueo('DISTRIBUIDORA_INACTIVA')
 *   geloxSimularBloqueo('USUARIO_INACTIVO')   → 403 normal: no debe redirigir
 * La respuesta pasa por los interceptores reales de axiosConfig, igual que una
 * respuesta del backend (T111-BE2).
 */
const RESPUESTAS_BLOQUEO = {
  DISTRIBUIDORA_SUSPENDIDA: { error: 'La distribuidora está suspendida', distribuidora: 'Helados del Norte' },
  DISTRIBUIDORA_INACTIVA:   { error: 'La distribuidora está inactiva', distribuidora: 'Polo Andino' },
  USUARIO_INACTIVO:         { error: 'Usuario inactivo' },
};

const CONTACTO_SOPORTE = { correo: 'soporte@gelox.co', whatsapp: '573001234567' };

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
