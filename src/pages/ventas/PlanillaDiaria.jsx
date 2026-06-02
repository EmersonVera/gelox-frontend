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
} from '../../services/ventasService';

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

const fechaBadge = () => {
  const d = new Date();
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

  /* ── State ── */
  const [filas, setFilas]                     = useState([]);
  const [filasInicial, setFilasInicial]       = useState([]); // Bug 1: lista completa para restaurar en edición
  const [estadoPlanilla, setEstadoPlanilla]   = useState('NUEVA'); // NUEVA | DESPACHADO | CERRADO
  const [planillaId, setPlanillaId]           = useState(null);
  const [busquedaFila, setBusquedaFila]       = useState('');
  const [editandoMatutino, setEditandoMatutino] = useState(false);
  const [loading, setLoading]                 = useState(true);
  const [errorMsg, setErrorMsg]               = useState('');
  const [enviando, setEnviando]               = useState(false);

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

        const planillaHoy = Array.isArray(lista)
          ? lista.find(p => p.fecha === hoyISO())
          : null;

        if (!planillaHoy) {
          // Obtener saldos del día anterior (unidades_devueltas de la última planilla cerrada)
          const ultimaAnterior = Array.isArray(lista)
            ? lista.find(p => p.cerrada && p.fecha < hoyISO())
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
              precio:         Number(p.precioUnitario ?? p.precio ?? 0),
              disponible:     Number(p.cantidadDisponible ?? 0),
              saldoAnterior:  saldo,
              salida:         saldo > 0 ? saldo : '', // pre-fill con saldo anterior
              entrada:        '',
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
                  precio:     Number(it.precioVenta ?? it.precioUnitario ?? 0),
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
  }, [comerciante?.id]);

  /* ── Handlers de inputs ── */
  const updateSalida = (productoId, value) => {
    setFilas(prev => prev.map(f => {
      if (f.productoId !== productoId) return f;
      const clamped = value === '' ? '' : Math.max(0, Math.min(f.disponible, Number(value) || 0));
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
    !hayErrorEntrada;

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
          precio:        Number(p.precioUnitario ?? p.precio ?? 0),
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

  /* ── Cierre Matutino (despacho) ── */
  const handleCierreMatutino = async () => {
    setEnviando(true);
    setErrorMsg('');
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
            precio:     Number(it.precioVenta ?? it.precioUnitario ?? 0),
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
      if (status === 409) {
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
                  precio:     Number(it.precioVenta ?? it.precioUnitario ?? 0),
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
        setErrorMsg(e?.response?.data?.mensaje ?? 'Error al registrar el despacho. Intenta de nuevo.');
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
      console.log('🧾 filas:', JSON.stringify(filas.map(f => ({ productoId: f.productoId, detalleId: f.detalleId, detalleIds: f.detalleIds })), null, 2));
      console.log('📤 items liquidar:', JSON.stringify(items, null, 2));
      await liquidarPlanilla(planillaId, items);
      navigate(-1);
    } catch (e) {
      setErrorMsg(e?.response?.data?.mensaje ?? 'Error al cerrar la planilla. Intenta de nuevo.');
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
              FECHA: {fechaBadge()}
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
                  TOTAL LIQUIDACIÓN
                </p>
                <p className="font-['Manrope'] font-extrabold text-[22px] sm:text-[26px] text-emerald-600 leading-tight">
                  {formatCOP(totalLiquidacion)}
                </p>
              </div>

              {/* Botones — un solo botón que cambia según el estado */}
              <div className="flex items-center gap-3 shrink-0 flex-wrap">

                {/* Cierre Matutino / Editar Cierre / Guardar Cambios */}
                <button
                  onClick={
                    estadoPlanilla === 'DESPACHADO' && !editandoMatutino
                      ? handleEntrarEdicion
                      : editandoMatutino
                        ? () => {
                            // Restaurar solo ítems despachados con entrada=0 para que el cierre diario funcione
                            setFilas(prev => prev
                              .filter(f => (f.detalleIds?.length ?? 0) > 0)
                              .map(f => ({ ...f, entrada: 0 }))
                            );
                            setEditandoMatutino(false);
                          }
                        : handleCierreMatutino
                  }
                  disabled={
                    enviando ||
                    (estadoPlanilla === 'NUEVA' && !cierreMatutinoHabilitado) ||
                    (editandoMatutino && !cierreMatutinoHabilitado)
                  }
                  className="flex items-center gap-2 bg-[#1b2d4f] hover:bg-[#152240] text-white font-['Manrope'] font-bold text-[13px] sm:text-[14px] rounded-[10px] px-4 sm:px-5 py-2.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {enviando ? <SpinIcon /> : editandoMatutino ? (
                    <CheckIcon />
                  ) : estadoPlanilla === 'DESPACHADO' ? (
                    <svg width="13" height="13" fill="none" viewBox="0 0 14 14"><path d="M9.5 2l2.5 2.5-7 7H2.5V9L9.5 2z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 3.5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  ) : <CheckIcon />}
                  {estadoPlanilla === 'DESPACHADO' && !editandoMatutino
                    ? 'Editar Cierre'
                    : editandoMatutino
                      ? 'Guardar Cambios'
                      : 'Cierre Matutino'}
                </button>

                {/* Cierre Diario */}
                <button
                  onClick={handleCierreDiario}
                  disabled={!cierreDiarioHabilitado || enviando || editandoMatutino}
                  className="flex items-center gap-2 bg-[#9e2016] hover:bg-[#7c0202] text-white font-['Manrope'] font-bold text-[13px] sm:text-[14px] rounded-[10px] px-4 sm:px-5 py-2.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {enviando && estadoPlanilla === 'DESPACHADO' ? <SpinIcon /> : <CheckIcon />}
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
