// src/pages/ventas/PlanillaDiaria.jsx — RF39
// Vista editable de planilla del día para un comerciante específico.
// Comerciante recibido vía location.state desde InformacionComerciante.
import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import {
  getProductosEnStock,
  getDatosPlanillaImpresion,
  getPlanillasComerciante,
  registrarDespacho,
  liquidarPlanilla,
  actualizarDespacho,
} from '../../services/ventasService';
import { obtenerCreditoComerciante, obtenerEsquemaLiquidacion } from '../../services/creditoService';
import {
  calcularLiquidacion, resumenCredito, etiquetaEsquema, formatoFecha, sumarDias, parseISO,
} from '../../components/ventas/creditoUtils';

/* RF65 — advertencias que el backend puede devolver al despachar */
const ADVERTENCIAS_CREDITO = {
  CUPO_SUPERADO:    'El despacho supera el cupo de crédito del comerciante.',
  PLANILLA_VENCIDA: 'El comerciante tiene planillas vencidas.',
};

/** advertencias: ['CUPO_SUPERADO'] | [{ codigo, mensaje }] → [{ codigo, mensaje }] */
function normalizarAdvertencias(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.map((a) => (typeof a === 'string'
    ? { codigo: a, mensaje: ADVERTENCIAS_CREDITO[a] ?? a }
    : { codigo: a.codigo, mensaje: a.mensaje ?? a.error ?? ADVERTENCIAS_CREDITO[a.codigo] ?? a.codigo }));
}

/* ── Utilidades ─────────────────────────────────────────────────────────── */
const MESES = [
  'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE',
];

const formatCOP = (n) =>
  '$' + Number(n ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 0 });

// Usa la fecha LOCAL del usuario (no UTC) para evitar desfase en timezone Colombia (UTC-5)
const hoyISO = () => {
  const d   = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const fechaBadge = (iso) => {
  const d = iso ? parseISO(iso) : new Date();
  return `${d.getDate()} ${MESES[d.getMonth()]}, ${d.getFullYear()}`;
};

/* ── Iconos SVG inline ──────────────────────────────────────────────────── */
function SpinIcon() {
  return (
    <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
      <path d="M2 7l3.5 3.5L12 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════ COMPONENTE PRINCIPAL ══════════════════════════════ */
export default function PlanillaDiaria() {
  const location               = useLocation();
  const navigate               = useNavigate();
  const { id: comercianteIdUrl } = useParams();

  // Bug 2: persistir el comerciante en sessionStorage para sobrevivir la navegación
  const comerciante = useMemo(() => {
    const fromState = location.state?.comerciante;
    if (fromState) {
      try { sessionStorage.setItem(`planilla_com_${fromState.id}`, JSON.stringify(fromState)); } catch {}
      return fromState;
    }
    try {
      const cached = sessionStorage.getItem(`planilla_com_${comercianteIdUrl}`);
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  }, [location.state?.comerciante, comercianteIdUrl]);

  const planillaSolicitada = location.state?.planillaId ?? null;

  /* ── State ── */
  const [fechaPlanilla, setFechaPlanilla]     = useState(null); // null mientras sea una planilla nueva de hoy
  const [filas, setFilas]                     = useState([]);
  const [filasInicial, setFilasInicial]       = useState([]); // Bug 1: lista completa para restaurar en edición
  const [estadoPlanilla, setEstadoPlanilla]   = useState('NUEVA'); // NUEVA | DESPACHADO | CERRADO
  const [planillaId, setPlanillaId]           = useState(null);
  const [busquedaFila, setBusquedaFila]       = useState('');
  const [editandoMatutino, setEditandoMatutino] = useState(false);
  const [loading, setLoading]                 = useState(true);
  const [errorMsg, setErrorMsg]               = useState('');
  const [enviando, setEnviando]               = useState(false);

  /* ── RF65 / RF66: crédito, esquema y liquidación ── */
  const [credito, setCredito]                 = useState(null);
  const [esquema, setEsquema]                 = useState(null);
  const [errorEsquema, setErrorEsquema]       = useState(false);
  const [intentoEsquema, setIntentoEsquema]   = useState(0);    // "Reintentar" vuelve a pedir el esquema
  // { tipo: 'BLOQUEADO' | 'ADVERTENCIA', titulo, mensajes: [] } — respuesta del despacho
  const [avisoDespacho, setAvisoDespacho]     = useState(null);
  const [efectivo, setEfectivo]               = useState('');
  const [efectivoTocado, setEfectivoTocado]   = useState(false);

  useEffect(() => {
    if (!comerciante?.id) return undefined;
    let vivo = true;
    obtenerCreditoComerciante(comerciante.id).then((c) => { if (vivo) setCredito(c); }).catch(() => {});
    return () => { vivo = false; };
  }, [comerciante?.id]);

  // Sin el esquema vigente no se puede liquidar: nunca se asume MARGEN.
  useEffect(() => {
    if (!comerciante?.id) return undefined;
    let vivo = true;
    obtenerEsquemaLiquidacion()
      .then((e) => {
        if (!vivo) return;
        if (e?.tipo) setEsquema(e);
        else setErrorEsquema(true);
      })
      .catch(() => { if (vivo) setErrorEsquema(true); });
    return () => { vivo = false; };
  }, [comerciante?.id, intentoEsquema]);

  const reintentarEsquema = () => {
    setErrorEsquema(false);
    setIntentoEsquema((n) => n + 1);
  };

  /* ── Carga inicial ── */
  useEffect(() => {
    if (!comerciante?.id) {
      setLoading(false);
      return;
    }
    let vivo = true;

    async function cargar() {
      setLoading(true);
      setErrorMsg('');
      try {
        const lista = await getPlanillasComerciante(comerciante.id);
        if (!vivo) return;

        // Desde el detalle se puede pedir una planilla concreta (p. ej. una abierta de otro día)
        const planillaHoy = Array.isArray(lista)
          ? lista.find(p => (planillaSolicitada ? p.planillaId === planillaSolicitada : p.fecha === hoyISO()))
          : null;

        if (planillaSolicitada && !planillaHoy) {
          setErrorMsg('No se encontró la planilla solicitada.');
          return;
        }
        if (planillaHoy) setFechaPlanilla(planillaHoy.fecha);

        if (!planillaHoy) {
          // Obtener saldos del día anterior (unidades_devueltas de la última planilla cerrada)
          // Última planilla CERRADA (la más reciente de todas, sin importar la fecha)
          const ultimaAnterior = Array.isArray(lista)
            ? lista.find(p => p.cerrada)
            : null;
          const saldosAnteriores = {}; // { productoId → { saldo, nombre, precio } }
          if (ultimaAnterior) {
            try {
              const detalleAnterior = await getDatosPlanillaImpresion(ultimaAnterior.planillaId);
              const itemsAnt = detalleAnterior?.items ?? [];
              itemsAnt.forEach(it => {
                if ((it.unidadesDevueltas ?? 0) > 0) {
                  saldosAnteriores[it.productoId] = {
                    saldo:  it.unidadesDevueltas,
                    nombre: it.productoNombre ?? it.nombre,
                    precio: Number(it.precioVenta ?? it.precioUnitario ?? 0),
                  };
                }
              });
            } catch { /* sin planilla anterior: continuar sin saldos */ }
          }

          const productos = await getProductosEnStock();
          if (!vivo) return;

          // Mapa de productos en stock para merge con saldos anteriores
          const productosMap = {};
          productos.forEach(p => { productosMap[p.id] = p; });

          // Productos con saldo anterior que ya no están en stock general (devueltos)
          Object.entries(saldosAnteriores).forEach(([pid, datos]) => {
            if (!productosMap[pid]) {
              productosMap[pid] = {
                id: pid, nombre: datos.nombre,
                precioUnitario: datos.precio, cantidadDisponible: 0,
              };
            }
          });

          const nuevasFilas = Object.values(productosMap).map(p => {
            const saldoInfo = saldosAnteriores[p.id];
            const saldo = saldoInfo?.saldo ?? 0;
            return {
              productoId:     p.id,
              nombre:         p.nombre,
              precio:         Number(p.precioComerciente ?? p.precioUnitario ?? p.precio ?? 0),
              disponible:     Number(p.cantidadDisponible ?? 0),
              saldoAnterior:  saldo,
              salida:         saldo > 0 ? saldo : 0, // pre-fill con saldo anterior, 0 si no hay
              entrada:        0,
            };
          });

          setFilas(nuevasFilas);
          setFilasInicial(nuevasFilas); // guardar lista completa para restaurar en edición
          setEstadoPlanilla('NUEVA');
        } else if (planillaHoy.cerrada) {
          setPlanillaId(planillaHoy.planillaId);
          setEstadoPlanilla('CERRADO');
        } else {
          setPlanillaId(planillaHoy.planillaId);
          setEstadoPlanilla('DESPACHADO');
          try {
            const detalle = await getDatosPlanillaImpresion(planillaHoy.planillaId);
            if (!vivo) return;
            const rawItems = detalle?.items ?? detalle?.detalles ?? detalle?.productos ?? [];
            const agrupado = {};
            rawItems.forEach(it => {
              const pid = it.productoId;
              if (!agrupado[pid]) {
                agrupado[pid] = {
                  productoId: pid,
                  detalleIds: [],
                  nombre:     it.productoNombre ?? it.nombre ?? '—',
                  precio:     Number(it.precioVenta ?? it.precioUnitario ?? 0), precioPublico: it.precioPublico ?? null,
                  disponible: 0,
                  salida:     0,
                  entrada:    0,
                };
              }
              agrupado[pid].detalleIds.push(it.id ?? it.detalleId);
              agrupado[pid].disponible += Number(it.unidadesDespachadas ?? it.unidades ?? 0);
              agrupado[pid].salida     += Number(it.unidadesDespachadas ?? it.unidades ?? 0);
            });
            console.log('✅ agrupado:', JSON.stringify(Object.values(agrupado).map(f => ({ productoId: f.productoId, detalleIds: f.detalleIds })), null, 2));
            setFilas(Object.values(agrupado));
          } catch {
            if (vivo) setErrorMsg('No se pudieron cargar los detalles del despacho.');
          }
        }
      } catch {
        if (vivo) setErrorMsg('No se pudieron cargar los datos. Intenta de nuevo.');
      } finally {
        if (vivo) setLoading(false);
      }
    }

    cargar();
    return () => { vivo = false; };
  }, [comerciante?.id, planillaSolicitada]);

  /* ── Handlers de inputs ── */
  const updateSalida = (productoId, value) => {
    setFilas(prev => prev.map(f => {
      if (f.productoId !== productoId) return f;
      // En modo edición no hay límite superior (el backend valida el stock disponible)
      const max = editandoMatutino ? Infinity : f.disponible;
      const clamped = value === '' ? '' : Math.max(0, Math.min(max, Number(value) || 0));
      return { ...f, salida: clamped };
    }));
  };

  const updateEntrada = (productoId, value) => {
    setFilas(prev => prev.map(f => {
      if (f.productoId !== productoId) return f;
      const num = value === '' ? 0 : Math.max(0, Number(value) || 0);
      return { ...f, entrada: num };
    }));
  };

  /* ── Cálculos en tiempo real ── */
  const totalLiquidacion = useMemo(
    () => filas.reduce((acc, f) => {
      const salida  = Number(f.salida)  || 0;
      const entrada = Number(f.entrada) || 0;
      return acc + Math.max(0, salida - entrada) * f.precio;
    }, 0),
    [filas]
  );

  const hayErrorEntrada = filas.some(
    f => Number(f.entrada) > Number(f.salida)
  );

  /* RF66 — liquidación con el esquema vigente (solo el precio público guardado en la planilla) */
  const liquidacion = useMemo(
    () => calcularLiquidacion(
      filas.map(f => ({
        vendidas:          Math.max(0, (Number(f.salida) || 0) - (Number(f.entrada) || 0)),
        precioComerciante: f.precio,
        precioPublico:     f.precioPublico,
      })),
      esquema,
    ),
    [filas, esquema],
  );

  // Por defecto el efectivo recibido es el monto cobrado, hasta que el usuario lo cambie.
  const efectivoNum   = efectivoTocado ? (efectivo === '' ? NaN : Number(efectivo)) : liquidacion.montoCobrado;
  const errorEfectivo = !Number.isFinite(efectivoNum) || efectivoNum < 0
    ? 'Escribe el efectivo recibido (0 o más).'
    : efectivoNum > liquidacion.montoCobrado
      ? 'No puede superar el monto a cobrar. Registra el excedente como abono en el crédito del comerciante.'
      : Math.abs(efectivoNum * 100 - Math.round(efectivoNum * 100)) > 1e-6
        ? 'Usa máximo 2 decimales.'
        : '';
  const saldoPendiente = Number.isFinite(efectivoNum)
    ? Math.max(0, Math.round((liquidacion.montoCobrado - efectivoNum) * 100) / 100)
    : 0;
  const creditoResumen = credito ? resumenCredito(credito) : null;
  // El plazo se cuenta desde la fecha de la planilla
  const fechaLimiteSaldo = credito ? sumarDias(fechaPlanilla ?? hoyISO(), credito.plazoDias ?? 0) : null;
  const esDeOtroDia = fechaPlanilla != null && fechaPlanilla !== hoyISO();

  /* ── Filtro de búsqueda ── */
  const filasFiltradas = busquedaFila.trim()
    ? filas.filter(f => f.nombre?.toLowerCase().includes(busquedaFila.toLowerCase()))
    : filas;

  /* ── Habilitación de botones ── */
  const cierreMatutinoHabilitado =
    (estadoPlanilla === 'NUEVA' || editandoMatutino) &&
    filas.length > 0 &&
    filas.every(f => f.salida !== '') &&
    filas.some(f => Number(f.salida) > 0);

  const cierreDiarioHabilitado =
    estadoPlanilla === 'DESPACHADO' &&
    filas.length > 0 &&
    filas.every(f => f.entrada !== '' && Number(f.entrada) >= 0) &&
    !hayErrorEntrada &&
    !!esquema &&
    !errorEfectivo;

  /* ── Entrar a modo edición: muestra planilla completa con cantidades reales ── */
  const handleEntrarEdicion = async () => {
    // Los ítems despachados son la fuente de verdad (preservar su salida)
    const despachadoMap = Object.fromEntries(filas.map(f => [f.productoId, f]));
    const despachadoIds = new Set(filas.map(f => f.productoId));

    // Cargar productos no despachados (del catálogo con stock)
    let noDespachadosBase = filasInicial.filter(f => !despachadoIds.has(f.productoId));
    if (filasInicial.length === 0) {
      try {
        const productos = await getProductosEnStock();
        const todos = productos.map(p => ({
          productoId:    p.id,
          nombre:        p.nombre,
          precio:        Number(p.precioComerciente ?? p.precioUnitario ?? p.precio ?? 0),
          disponible:    Number(p.cantidadDisponible ?? 0),
          saldoAnterior: 0,
          salida:        '',
          entrada:       '',
        }));
        setFilasInicial(todos);
        noDespachadosBase = todos.filter(f => !despachadoIds.has(f.productoId));
      } catch { noDespachadosBase = []; }
    }

    // Resultado = despachados (con su salida real) + no despachados (con salida 0)
    const resultado = [
      ...filas.map(f => ({ ...f, entrada: '' })),          // despachados: salida intacta
      ...noDespachadosBase.map(f => ({ ...f, salida: 0, detalleIds: [], entrada: '' })),
    ];

    setFilas(resultado);
    setEditandoMatutino(true);
  };

  /* ── Guardar edición del cierre matutino → llama al backend ── */
  const handleGuardarEdicion = async () => {
    setEnviando(true);
    setErrorMsg('');
    try {
      const items = filas
        .filter(f => (f.detalleIds?.length ?? 0) > 0)
        .map(f => ({
          productoId: f.productoId,
          unidades:   Number(f.salida) || 0,
        }));

      await actualizarDespacho(planillaId, items);

      // Recargar los ítems desde el servidor para confirmar que los cambios se aplicaron
      const detalle = await getDatosPlanillaImpresion(planillaId);
      const rawItems = detalle?.items ?? [];
      const agrupado = {};
      rawItems.forEach(it => {
        const pid = it.productoId;
        if (!agrupado[pid]) {
          agrupado[pid] = {
            productoId: pid,
            detalleIds: [],
            nombre:     it.productoNombre ?? it.nombre ?? '—',
            precio:     Number(it.precioVenta ?? it.precioUnitario ?? 0), precioPublico: it.precioPublico ?? null,
            disponible: 0,
            salida:     0,
            entrada:    0,
          };
        }
        agrupado[pid].detalleIds.push(it.id ?? it.detalleId);
        agrupado[pid].disponible += Number(it.unidadesDespachadas ?? 0);
        agrupado[pid].salida     += Number(it.unidadesDespachadas ?? 0);
      });
      setFilas(Object.values(agrupado));
      setEditandoMatutino(false);
    } catch (e) {
      const msg = e?.response?.data?.error
        ?? e?.response?.data?.mensaje
        ?? e?.response?.data?.message
        ?? '';
      setErrorMsg(msg || 'No se pudo guardar la edición. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  /* ── Cierre Matutino (despacho) ── */
  const handleCierreMatutino = async () => {
    setEnviando(true);
    setErrorMsg('');
    setAvisoDespacho(null);
    try {
      // Solo enviar ítems con salida > 0. saldoAnterior indica unidades ya con el comerciante
      const items = filas
        .filter(f => Number(f.salida) > 0)
        .map(f => ({
          productoId:     f.productoId,
          unidades:       Number(f.salida),
          precioUnitario: Math.max(f.precio, 0.01),
          saldoAnterior:  Math.min(f.saldoAnterior ?? 0, Number(f.salida)), // no puede superar la salida
        }));
      const totalGanancia = filas.reduce(
        (acc, f) => acc + (Number(f.salida) || 0) * f.precio, 0
      );
      const result = await registrarDespacho({
        comercianteId: comerciante.id,
        fecha:         hoyISO(),
        items,
        totalGanancia,
      });
      const nuevoPlanillaId = result.id ?? result.planillaId;
      setPlanillaId(nuevoPlanillaId);
      setEstadoPlanilla('DESPACHADO');
      // RF65 — política SOLO_ALERTA: la planilla se crea, pero con advertencias de crédito
      const advertencias = normalizarAdvertencias(result.advertencias);
      if (advertencias.length > 0) {
        setAvisoDespacho({
          tipo:     'ADVERTENCIA',
          titulo:   'Despacho registrado con alerta de crédito',
          mensajes: advertencias.map(a => a.mensaje),
        });
      }
      // Cargar ítems desde imprimir para obtener los detalleIds reales
      const detalle = await getDatosPlanillaImpresion(nuevoPlanillaId);
      const rawItems = detalle?.items ?? detalle?.detalles ?? detalle?.productos ?? [];
      const agrupado = {};
      rawItems.forEach(it => {
        const pid = it.productoId;
        if (!agrupado[pid]) {
          agrupado[pid] = {
            productoId: pid,
            detalleIds: [],
            nombre:     it.productoNombre ?? it.nombre ?? '—',
            precio:     Number(it.precioVenta ?? it.precioUnitario ?? 0), precioPublico: it.precioPublico ?? null,
            disponible: 0,
            salida:     0,
            entrada:    0,
          };
        }
        agrupado[pid].detalleIds.push(it.id ?? it.detalleId);
        agrupado[pid].disponible += Number(it.unidadesDespachadas ?? it.unidades ?? 0);
        agrupado[pid].salida     += Number(it.unidadesDespachadas ?? it.unidades ?? 0);
      });
      setFilas(Object.values(agrupado));
    } catch (e) {
      const status = e?.response?.status;
      const data   = e?.response?.data ?? {};
      if (status === 409 && data.codigo === 'CREDITO_BLOQUEADO') {
        // RF65 — política BLOQUEAR: la planilla no se crea
        const detalle = normalizarAdvertencias(data.advertencias ?? data.motivos).map(a => a.mensaje);
        setAvisoDespacho({
          tipo:     'BLOQUEADO',
          titulo:   'Despacho bloqueado',
          mensajes: [
            data.error ?? data.mensaje ?? `${comerciante.nombre} tiene el crédito bloqueado por su política ante vencimiento.`,
            ...detalle,
          ],
        });
      } else if (status === 409) {
        // La planilla ya existe (desfase de zona horaria o doble envío).
        // Cargar la planilla existente en vez de mostrar error.
        try {
          const lista = await getPlanillasComerciante(comerciante.id);
          const planillaExistente = Array.isArray(lista)
            ? lista.find(p => p.fecha === hoyISO() && !p.cerrada)
            : null;
          if (planillaExistente) {
            setPlanillaId(planillaExistente.planillaId);
            setEstadoPlanilla('DESPACHADO');
            const detalle = await getDatosPlanillaImpresion(planillaExistente.planillaId);
            const rawItems = detalle?.items ?? detalle?.detalles ?? detalle?.productos ?? [];
            const agrupado = {};
            rawItems.forEach(it => {
              const pid = it.productoId;
              if (!agrupado[pid]) {
                agrupado[pid] = {
                  productoId: pid, detalleIds: [],
                  nombre:     it.productoNombre ?? it.nombre ?? '—',
                  precio:     Number(it.precioVenta ?? it.precioUnitario ?? 0), precioPublico: it.precioPublico ?? null,
                  disponible: 0, salida: 0, entrada: 0,
                };
              }
              agrupado[pid].detalleIds.push(it.id ?? it.detalleId);
              agrupado[pid].disponible += Number(it.unidadesDespachadas ?? it.unidades ?? 0);
              agrupado[pid].salida     += Number(it.unidadesDespachadas ?? it.unidades ?? 0);
            });
            setFilas(Object.values(agrupado));
          } else {
            setErrorMsg('La planilla ya fue registrada hoy. Recarga la página.');
          }
        } catch {
          setErrorMsg('La planilla ya fue registrada. Recarga la página para verla.');
        }
      } else {
        const msg = e?.response?.data?.error ?? e?.response?.data?.mensaje ?? e?.response?.data?.message ?? '';
        setErrorMsg(msg || 'Error al registrar el despacho. Intenta de nuevo.');
      }
    } finally {
      setEnviando(false);
    }
  };

  /* ── Cierre Diario (liquidación) ── */
  const handleCierreDiario = async () => {
    setEnviando(true);
    setErrorMsg('');
    try {
      // Si la fila tiene múltiples detalleIds (agrupados), poner todas las
      // devoluciones en el primero y 0 en el resto
      const items = filas.flatMap(f => {
        const devueltas = Number(f.entrada) || 0;
        const ids = f.detalleIds?.length ? f.detalleIds : [f.detalleId];
        return ids.map((id, i) => ({
          detalleId:         id,
          unidadesDevueltas: i === 0 ? devueltas : 0,
        }));
      });
      // Si el usuario no cambió el efectivo no se envía: el backend toma el total que él calcule.
      const respuesta = await liquidarPlanilla(planillaId, items, {
        efectivoRecibido: efectivoTocado ? efectivoNum : undefined,
      });
      // Comprobante: solo valores del backend (un null significa "no aplica", no se rellena aquí).
      navigate(`/ventas/planilla/${planillaId}`, {
        replace: true,
        state: { comercianteId: comerciante.id, planillaId, liquidacion: respuesta },
      });
    } catch (e) {
      const msg = e?.response?.data?.error ?? e?.response?.data?.mensaje ?? e?.response?.data?.message ?? '';
      setErrorMsg(msg || 'Error al cerrar la planilla. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  /* ══════════════════════ GUARD — sin comerciante ════════════════════════ */
  if (!comerciante) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="font-['Inter'] text-[15px] text-[#78716c]">
            Información no disponible.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="bg-[#9e2016] hover:bg-[#7c0202] text-white font-['Manrope'] font-bold px-5 py-2.5 rounded-[10px] transition-colors cursor-pointer"
          >
            Volver
          </button>
        </div>
      </AppLayout>
    );
  }

  const iniciales = comerciante.nombre
    ?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() ?? '?';

  /* ══════════════════════ ESTADO CERRADO ══════════════════════════════════ */
  if (estadoPlanilla === 'CERRADO' && !loading) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-4 animate-fade-in-up">
          
          <div className="flex items-center justify-center py-16">
            <div className="bg-white border border-[#f5f5f4] rounded-2xl shadow-sm p-8 w-full max-w-md text-center flex flex-col items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" className="text-emerald-600">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h3 className="font-['Manrope'] font-bold text-[18px] text-[#1b1b1c] mb-2">
                  Planilla ya cerrada
                </h3>
                <p className="font-['Inter'] text-[14px] text-[#78716c] leading-relaxed">
                  Esta planilla ya fue cerrada.<br />
                  Puedes verla en el historial del comerciante.
                </p>
              </div>
              <button
                onClick={() => navigate(-1)}
                className="bg-[#1b1b1c] hover:bg-[#3b3b3b] text-white font-['Manrope'] font-bold text-[14px] rounded-[10px] px-6 py-3 transition-colors cursor-pointer"
              >
                Ver en historial
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  /* ══════════════════════ RENDER PRINCIPAL ════════════════════════════════ */
  return (
    <AppLayout>
      <div className="flex flex-col gap-5 animate-fade-in-up">

        {/* ── Volver al comerciante ── */}
        <button
          onClick={() => navigate(`/ventas/comerciantes/${comerciante.id}/informacion`, { state: { comerciante } })}
          className="flex items-center gap-1.5 text-[#78716c] hover:text-[#1b1b1c] transition-colors w-fit font-['Inter'] text-[13px] cursor-pointer"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Volver a {comerciante.nombre}
        </button>

        

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-['Manrope'] font-extrabold text-[26px] sm:text-[32px] text-[#1b1b1c] leading-tight">
              Cierre de Jornada - Mano a Mano
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {comerciante.fotoUrl ? (
                <img
                  src={comerciante.fotoUrl}
                  alt={comerciante.nombre}
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#f6f3f3] flex items-center justify-center shrink-0">
                  <span className="font-['Manrope'] font-bold text-[10px] text-[#9e2016]">
                    {iniciales}
                  </span>
                </div>
              )}
              <span className="font-['Manrope'] font-bold text-[15px] text-[#1b1b1c]">
                {comerciante.nombre}
              </span>
              <span className="font-['Inter'] text-[13px] text-[#a8a29e]">
                ID: {comerciante.id ?? '—'}
              </span>
            </div>
          </div>

          {/* Badge fecha */}
          <div className="shrink-0">
            <span className="inline-flex items-center bg-[#9e2016] text-white font-['Manrope'] font-bold text-[11px] sm:text-[12px] px-4 py-2 rounded-full uppercase tracking-[0.5px]">
              FECHA: {fechaBadge(fechaPlanilla)}
            </span>
          </div>
        </div>

        {/* ── Error ── */}
        {errorMsg && (
          <div className="bg-[#fff1f0] border border-[#ffc1c1] rounded-[12px] px-4 py-3 flex items-center justify-between gap-3">
            <p className="font-['Inter'] text-[13px] text-[#9e2016] flex-1">{errorMsg}</p>
            <button
              onClick={() => setErrorMsg('')}
              className="text-[#9e2016] hover:text-[#7c0202] shrink-0 cursor-pointer"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
                <path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        {/* ── RF65: respuesta del despacho (bloqueo o advertencias) ── */}
        {avisoDespacho && (
          <div
            role="alert"
            className={`rounded-[12px] px-4 py-3 flex items-start gap-3 border ${
              avisoDespacho.tipo === 'BLOQUEADO'
                ? 'bg-[#fef2f2] border-[#fca5a5] text-[#991b1b]'
                : 'bg-[#fffbeb] border-[#fcd34d] text-[#92400e]'
            }`}
          >
            <svg width="16" height="16" className="shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div className="flex-1 font-['Inter'] text-[13px]">
              <p className="font-bold">{avisoDespacho.titulo}</p>
              {avisoDespacho.mensajes.map((m, i) => <p key={i} className="mt-0.5">{m}</p>)}
              {avisoDespacho.tipo === 'BLOQUEADO' && (
                <p className="mt-1">La planilla no se creó. El comerciante debe ponerse al día o el Gerente debe ajustar su crédito.</p>
              )}
            </div>
            <button onClick={() => setAvisoDespacho(null)} aria-label="Cerrar aviso" className="opacity-60 hover:opacity-100 cursor-pointer">✕</button>
          </div>
        )}

        {/* ── RF65: estado del crédito al abrir la planilla ── */}
        {!avisoDespacho && creditoResumen && estadoPlanilla !== 'CERRADO'
          && (creditoResumen.vencidas.length > 0 || creditoResumen.usoCupo >= 80) && (
          <div className={`rounded-[12px] px-4 py-3 border font-['Inter'] text-[13px] ${
            credito.politica === 'BLOQUEAR' && creditoResumen.vencidas.length > 0
              ? 'bg-[#fef2f2] border-[#fca5a5] text-[#991b1b]'
              : 'bg-[#fffbeb] border-[#fcd34d] text-[#92400e]'
          }`}>
            {creditoResumen.vencidas.length > 0 ? (
              <>
                {comerciante.nombre} tiene <strong>{creditoResumen.vencidas.length} planilla{creditoResumen.vencidas.length === 1 ? '' : 's'} vencida{creditoResumen.vencidas.length === 1 ? '' : 's'} por {formatCOP(creditoResumen.totalVencido)}</strong>.{' '}
                {credito.politica === 'BLOQUEAR'
                  ? 'Su política no permite crear el despacho mientras tenga planillas vencidas.'
                  : 'Su política permite despachar con alerta; el saldo de esta planilla se sumará a su deuda.'}
              </>
            ) : (
              <>
                Deuda de <strong>{formatCOP(creditoResumen.deuda)}</strong> sobre un cupo de {formatCOP(creditoResumen.cupo)}
                {' '}({Math.round(creditoResumen.usoCupo)} %). Cupo disponible: {formatCOP(creditoResumen.cupoDisponible)}.
              </>
            )}
          </div>
        )}

        {/* ── Loading ── */}
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3">
            <SpinIcon />
            <span className="font-['Inter'] text-[14px] text-[#78716c]">Cargando planilla…</span>
          </div>
        ) : (
          <>
            {/* ══ Búsqueda ══ */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29e]" width="15" height="15" fill="none" viewBox="0 0 16 16">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <input
                value={busquedaFila}
                onChange={e => setBusquedaFila(e.target.value)}
                placeholder="Buscar producto en la planilla..."
                className="bg-white border border-[#e7e5e4] rounded-[10px] pl-9 pr-4 py-2.5 w-full font-['Inter'] text-[14px] text-[#1b1b1c] outline-none focus:ring-2 focus:ring-[#9e2016]/20 focus:border-[#9e2016]"
              />
              {busquedaFila && (
                <button onClick={() => setBusquedaFila('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a8a29e] hover:text-[#78716c] cursor-pointer">✕</button>
              )}
            </div>

            {/* ══ Tabla ══ */}
            <div className="bg-white rounded-[16px] border border-[#f5f5f4] overflow-hidden shadow-sm">
              {filas.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="font-['Inter'] text-[14px] text-[#a8a29e]">
                    No hay productos en stock disponibles.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead>
                      <tr className="bg-[#f6f3f3]">
                        {['Producto','Saldo ant.','Salida (und)','Entrada (und)','Vendidas','Precio Unitario','Total ($)'].map((h, i) => (
                          <th
                            key={h}
                            className={`px-5 py-3 font-['Inter'] font-bold text-[10px] uppercase tracking-[0.8px] text-[#a8a29e] ${
                              i === 0 ? 'text-left' : i >= 3 ? 'text-right' : 'text-center'
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5f5f4]">
                      {filasFiltradas.map(fila => {
                        const salida   = Number(fila.salida)  || 0;
                        const entrada  = Number(fila.entrada) || 0;
                        const vendidas = Math.max(0, salida - entrada);
                        const total    = vendidas * fila.precio;
                        const errFila  = estadoPlanilla === 'DESPACHADO' && entrada > salida;

                        return (
                          <tr key={fila.productoId} className="hover:bg-[#fafaf9] transition-colors">

                            {/* PRODUCTO */}
                            <td className="px-5 py-3.5">
                              <span className="font-['Inter'] text-[14px] text-[#1b1b1c]">
                                {fila.nombre}
                              </span>
                            </td>

                            {/* SALDO ANTERIOR */}
                            <td className="px-5 py-3.5 text-center">
                              {(fila.saldoAnterior ?? 0) > 0 ? (
                                <span className="font-['Manrope'] font-bold text-[14px] text-[#9e2016]">
                                  {fila.saldoAnterior}
                                </span>
                              ) : (
                                <span className="font-['Inter'] text-[13px] text-[#d6d3d1]">—</span>
                              )}
                            </td>

                            {/* SALIDA */}
                            <td className="px-5 py-3.5">
                              <div className="flex justify-center">
                                {estadoPlanilla === 'NUEVA' || editandoMatutino ? (
                                  <input
                                    type="number"
                                    min="0"
                                    max={fila.disponible}
                                    value={fila.salida}
                                    onChange={e => updateSalida(fila.productoId, e.target.value)}
                                    placeholder="0"
                                    className="w-20 border border-[#e1bfb9] rounded-[8px] px-2 py-1.5 text-center font-['Manrope'] font-bold text-[15px] text-[#9e2016] outline-none focus:border-[#9e2016] focus:ring-2 focus:ring-[#9e2016]/20 transition-all"
                                  />
                                ) : (
                                  <span className="font-['Manrope'] font-bold text-[15px] text-[#9e2016] w-20 text-center inline-block">
                                    {fila.salida}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* ENTRADA */}
                            <td className="px-5 py-3.5">
                              <div className="flex flex-col items-center gap-1">
                                {estadoPlanilla === 'DESPACHADO' ? (
                                  <>
                                    <input
                                      type="number"
                                      min="0"
                                      value={fila.entrada}
                                      onChange={e => updateEntrada(fila.productoId, e.target.value)}
                                      className={`w-20 rounded-[8px] px-2 py-1.5 text-center font-['Inter'] text-[14px] text-[#1b1b1c] outline-none transition-all ${
                                        errFila
                                          ? 'border border-[#9e2016] bg-[#fff1f0] focus:ring-2 focus:ring-[#9e2016]/20'
                                          : 'border border-transparent bg-[#f6f3f3] focus:border-[#9e2016] focus:ring-2 focus:ring-[#9e2016]/20'
                                      }`}
                                    />
                                    {errFila && (
                                      <p className="font-['Inter'] text-[10px] text-[#9e2016] text-center leading-tight">
                                        No puede superar lo despachado
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <span className="font-['Inter'] text-[14px] text-[#a8a29e]">—</span>
                                )}
                              </div>
                            </td>

                            {/* VENDIDAS */}
                            <td className="px-5 py-3.5 text-right">
                              <span className="font-['Inter'] text-[14px] text-[#78716c]">
                                {vendidas}
                              </span>
                            </td>

                            {/* PRECIO UNITARIO */}
                            <td className="px-5 py-3.5 text-right">
                              <span className="font-['Inter'] text-[14px] text-[#1b1b1c]">
                                {formatCOP(fila.precio)}
                              </span>
                            </td>

                            {/* TOTAL */}
                            <td className="px-5 py-3.5 text-right">
                              <span className="font-['Manrope'] font-bold text-[14px] text-[#1b1b1c]">
                                {formatCOP(total)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ══ RF66 — Liquidación (al cerrar la jornada) ══ */}
            {estadoPlanilla === 'DESPACHADO' && !editandoMatutino && filas.length > 0 && (
              <div className="bg-white rounded-[16px] border border-[#f5f5f4] shadow-sm">
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#f5f5f4]">
                  <div>
                    <h2 className="font-['Manrope'] font-bold text-[16px] text-[#1b1b1c]">Liquidación</h2>
                    <p className="font-['Inter'] text-[12px] text-[#a8a29e]">
                      Esquema: {esquema ? etiquetaEsquema(esquema.tipo, esquema.valor) : errorEsquema ? 'no disponible' : 'cargando…'}
                    </p>
                  </div>
                  {esquema && (
                    <span className="font-['Inter'] font-semibold text-[11px] px-2.5 py-1 rounded-full bg-[#eff6ff] text-[#1d4ed8]">Calculado</span>
                  )}
                </div>

                {!esquema ? (
                  errorEsquema ? (
                    <div role="alert" className="flex items-center justify-between gap-3 flex-wrap px-5 py-4 font-['Inter'] text-[13px] text-[#dc2626]">
                      <p>No se pudo cargar el esquema de liquidación. Sin él no se puede hacer el cierre diario.</p>
                      <button type="button" onClick={reintentarEsquema} className="font-semibold text-[#9e2016] hover:underline cursor-pointer">
                        Reintentar
                      </button>
                    </div>
                  ) : (
                    <p className="px-5 py-4 font-['Inter'] text-[13px] text-[#a8a29e]">Cargando el esquema de liquidación…</p>
                  )
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 px-5 py-4">
                  <dl className="flex flex-col gap-2 font-['Inter'] text-[14px]">
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#78716c]">Total vendido (precio público)</dt>
                      <dd className="text-[#1b1b1c]">{formatCOP(liquidacion.totalPublico)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#78716c]">Ganancia del comerciante</dt>
                      <dd className="text-[#16a34a]">{liquidacion.ganancia == null ? '—' : `− ${formatCOP(liquidacion.ganancia)}`}</dd>
                    </div>
                    <div className="flex justify-between gap-3 pt-2 border-t border-dashed border-[#e7e5e4]">
                      <dt className="font-['Manrope'] font-bold text-[#1b1b1c]">Monto a cobrar</dt>
                      <dd className="font-['Manrope'] font-extrabold text-[20px] text-[#1b1b1c]">{formatCOP(liquidacion.montoCobrado)}</dd>
                    </div>
                    {liquidacion.sinPrecioPublico && (
                      <p className="text-[11px] text-[#a8a29e]">
                        Algunos productos no tienen precio público registrado: para ellos se usa el precio al comerciante.
                      </p>
                    )}
                  </dl>

                  <div className="flex flex-col gap-3">
                    <div>
                      <label htmlFor="efectivo-recibido" className="block font-['Inter'] font-semibold text-[12px] text-[#1b1b1c] mb-1.5">
                        Efectivo recibido *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-[#a8a29e]">$</span>
                        <input
                          id="efectivo-recibido"
                          type="number"
                          min="0"
                          step="any"
                          value={efectivoTocado ? efectivo : liquidacion.montoCobrado}
                          onChange={e => { setEfectivoTocado(true); setEfectivo(e.target.value); }}
                          className={`w-full rounded-[10px] pl-7 pr-3.5 py-2.5 font-['Manrope'] font-bold text-[16px] text-[#1b1b1c] outline-none border transition-all ${
                            errorEfectivo
                              ? 'border-[#dc2626] bg-[#fff1f0] focus:ring-2 focus:ring-[#dc2626]/20'
                              : 'border-[#e7e5e4] focus:border-[#9e2016] focus:ring-2 focus:ring-[#9e2016]/20'
                          }`}
                        />
                      </div>
                      {errorEfectivo ? (
                        <p className="font-['Inter'] text-[11px] text-[#dc2626] mt-1">{errorEfectivo}</p>
                      ) : efectivoTocado ? (
                        <button
                          type="button"
                          onClick={() => { setEfectivoTocado(false); setEfectivo(''); }}
                          className="font-['Inter'] text-[11px] text-[#9e2016] hover:underline mt-1 cursor-pointer"
                        >
                          Usar el monto a cobrar ({formatCOP(liquidacion.montoCobrado)})
                        </button>
                      ) : (
                        <p className="font-['Inter'] text-[11px] text-[#a8a29e] mt-1">Por defecto, el monto a cobrar completo.</p>
                      )}
                    </div>

                    {saldoPendiente > 0 && !errorEfectivo ? (
                      <div className="rounded-[12px] bg-[#fef2f2] px-4 py-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-['Manrope'] font-bold text-[14px] text-[#1b1b1c]">Saldo pendiente</span>
                          <span className="font-['Manrope'] font-extrabold text-[20px] text-[#dc2626]">{formatCOP(saldoPendiente)}</span>
                        </div>
                        <p className="font-['Inter'] text-[11px] text-[#78716c] mt-1">
                          Se carga al crédito del comerciante
                          {fechaLimiteSaldo && <> · fecha límite de pago {formatoFecha(fechaLimiteSaldo)}</>}
                          {creditoResumen && <> · cupo disponible después: {formatCOP(Math.max(0, creditoResumen.cupoDisponible - saldoPendiente))}</>}
                        </p>
                        {creditoResumen && saldoPendiente > creditoResumen.cupoDisponible && (
                          <p className="font-['Inter'] font-semibold text-[11px] text-[#dc2626] mt-1">
                            El saldo supera el cupo disponible del comerciante.
                          </p>
                        )}
                      </div>
                    ) : !errorEfectivo && (
                      <div className="rounded-[12px] bg-[#f0fdf4] px-4 py-3 font-['Inter'] text-[13px] text-[#166534]">
                        Sin saldo pendiente: la planilla queda pagada.
                      </div>
                    )}

                    <p className="font-['Inter'] text-[11px] text-[#92400e] bg-[#fffbeb] rounded-[10px] px-3 py-2">
                      Al hacer el cierre diario la planilla queda bloqueada con este esquema y estos montos.
                    </p>
                  </div>
                </div>
                )}
              </div>
            )}

            {/* ══ Footer bar ══ */}
            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-[16px] px-5 sm:px-6 py-4 flex items-center gap-4 flex-wrap">

              {/* Ícono verde */}
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <svg width="18" height="18" fill="none" viewBox="0 0 18 18" className="text-emerald-600">
                  <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M6 1v3M12 1v3M2 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M6 11h6M6 13.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>

              {/* Total */}
              <div className="flex-1 min-w-0">
                <p className="font-['Inter'] font-bold text-[10px] uppercase tracking-[0.6px] text-[#78716c]">
                  {estadoPlanilla === 'DESPACHADO' && !editandoMatutino ? 'MONTO A COBRAR' : 'TOTAL LIQUIDACIÓN'}
                </p>
                <p className="font-['Manrope'] font-extrabold text-[22px] sm:text-[26px] text-emerald-600 leading-tight">
                  {estadoPlanilla === 'DESPACHADO' && !editandoMatutino
                    ? (esquema ? formatCOP(liquidacion.montoCobrado) : '—')
                    : formatCOP(totalLiquidacion)}
                </p>
              </div>

              {/* Botones — un solo botón que cambia según el estado */}
              <div className="flex items-center gap-3 shrink-0 flex-wrap">

                {/* Cierre Matutino / Editar Cierre / Guardar Cambios (una planilla de otro día solo se liquida) */}
                {!esDeOtroDia && (
                <button
                  onClick={
                    estadoPlanilla === 'DESPACHADO' && !editandoMatutino
                      ? handleEntrarEdicion
                      : editandoMatutino
                        ? handleGuardarEdicion
                        : handleCierreMatutino
                  }
                  disabled={
                    enviando ||
                    (estadoPlanilla === 'NUEVA' && !cierreMatutinoHabilitado) ||
                    (editandoMatutino && !cierreMatutinoHabilitado)
                  }
                  className="flex items-center gap-2 bg-[#1b2d4f] hover:bg-[#152240] text-white font-['Manrope'] font-bold text-[13px] sm:text-[14px] rounded-[10px] px-4 sm:px-5 py-2.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {/* Caja fija de 16 px: el spinner (16 px) y los íconos (13–14 px) no cambian el ancho del botón */}
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    {enviando ? <SpinIcon /> : editandoMatutino ? (
                      <CheckIcon />
                    ) : estadoPlanilla === 'DESPACHADO' ? (
                      <svg width="13" height="13" fill="none" viewBox="0 0 14 14"><path d="M9.5 2l2.5 2.5-7 7H2.5V9L9.5 2z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 3.5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    ) : <CheckIcon />}
                  </span>
                  {estadoPlanilla === 'DESPACHADO' && !editandoMatutino
                    ? 'Editar Cierre'
                    : editandoMatutino
                      ? 'Guardar Cambios'
                      : 'Cierre Matutino'}
                </button>
                )}

                {/* Cierre Diario */}
                <button
                  onClick={handleCierreDiario}
                  disabled={!cierreDiarioHabilitado || enviando || editandoMatutino}
                  className="flex items-center gap-2 bg-[#9e2016] hover:bg-[#7c0202] text-white font-['Manrope'] font-bold text-[13px] sm:text-[14px] rounded-[10px] px-4 sm:px-5 py-2.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    {enviando && estadoPlanilla === 'DESPACHADO' ? <SpinIcon /> : <CheckIcon />}
                  </span>
                  Cierre Diario
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
