// src/pages/inventarios/HistorialRecomendaciones.jsx — RF57: Historial y métricas de recomendaciones
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import FiltroPeriodo from '../../components/FiltroPeriodo';
import Pagination from '../../components/ui/Pagination';
import { formatoCOP, formatoPct } from '../../components/voz/formato';
import {
  ESTADOS_RECOMENDACION, formatoFechaHora, mensajeError,
} from '../../components/inventarios/recomendaciones/recomendacionUtils';
import { USAR_MOCK, listarHistorial, obtenerMetricas } from '../../services/recomendacionService';

const TAMANO_PAGINA = 8;

/** El backend envía fracciones (0–1); null se muestra como «—». */
const aPct = (v) => (v == null ? null : Math.round(v * 1000) / 10);

const isoLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Traduce la selección de FiltroPeriodo a un rango { desde, hasta } en fecha local. */
function rangoDe({ tipo, desde, hasta }) {
  const hoy = new Date();
  const inicio = new Date(hoy);
  switch (tipo) {
    case 'rango':
      return { desde, hasta };
    case 'semana':
      inicio.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7)); // lunes
      break;
    case 'mes':
      inicio.setDate(1);
      break;
    case 'anio':
      inicio.setMonth(0, 1);
      break;
    default: // 'dia'
      break;
  }
  return { desde: isoLocal(inicio), hasta: isoLocal(hoy) };
}

function Metrica({ titulo, valor, detalle }) {
  return (
    <div className="bg-white rounded-[12px] border border-[#f5f5f4] p-5 flex flex-col gap-2">
      <p className="font-['Inter'] font-bold text-[11px] uppercase tracking-[0.55px] text-[#78716c]">{titulo}</p>
      <p className="font-['Manrope'] font-bold text-[26px] text-[#1b1b1c] leading-none">{valor}</p>
      <p className="font-['Inter'] text-[12px] text-[#78716c]">{detalle}</p>
    </div>
  );
}

export default function HistorialRecomendaciones() {
  const [rango, setRango] = useState(() => rangoDe({ tipo: 'mes' }));
  const [pagina, setPagina] = useState(1);
  const [metricas, setMetricas] = useState(null);
  const [lista, setLista] = useState({ content: [], totalPages: 1, totalElements: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    Promise.all([
      obtenerMetricas(rango.desde, rango.hasta),
      listarHistorial({ desde: rango.desde, hasta: rango.hasta, page: pagina - 1, size: TAMANO_PAGINA }),
    ])
      .then(([m, l]) => {
        if (!vivo) return;
        setMetricas(m);
        setLista(l);
      })
      .catch((err) => { if (vivo) setError(mensajeError(err, 'No se pudo cargar el historial de recomendaciones.')); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [rango, pagina]);

  const iniciarCarga = () => {
    setCargando(true);
    setError('');
  };

  const cambiarPeriodo = (seleccion) => {
    iniciarCarga();
    setRango(rangoDe(seleccion));
    setPagina(1);
  };

  const cambiarPagina = (n) => {
    if (n === pagina) return;
    iniciarCarga();
    setPagina(n);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="font-['Inter'] font-bold text-[11px] uppercase tracking-[0.55px] text-[#9e2016] flex items-center gap-1 mb-1">
              <span>▣</span> Módulo de Inventarios
            </p>
            <h1 className="font-['Manrope'] font-bold text-[30px] text-[#1b1b1c] tracking-[-0.75px]">
              Historial de Recomendaciones
            </h1>
            <p className="font-['Inter'] text-[14px] text-[#78716c] mt-1">
              Qué tanto se aceptan las recomendaciones y qué tan precisas resultan las cantidades.
            </p>
          </div>
          <Link to="/inventarios/recomendaciones"
            className="px-4 py-2.5 rounded-[10px] bg-[#9e2016] text-white font-['Inter'] font-semibold text-[14px] hover:bg-[#7f1a12] transition-colors">
            Nueva recomendación
          </Link>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <FiltroPeriodo defaultTipo="mes" onChange={cambiarPeriodo} />
          <p className="font-['Inter'] text-[12px] text-[#a8a29e]">
            {rango.desde} → {rango.hasta}{USAR_MOCK && ' · Modo simulado'}
          </p>
        </div>

        {error && (
          <div className="bg-[#fef2f2] border border-[#fca5a5] rounded-[10px] px-4 py-3 font-['Inter'] font-medium text-[14px] text-[#dc2626]">
            {error}
          </div>
        )}

        {/* Métricas */}
        {cargando && !metricas ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="bg-white rounded-[12px] h-[118px] animate-pulse border border-[#f5f5f4]" />)}
          </div>
        ) : metricas && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Metrica titulo="Recomendaciones" valor={metricas.generadas}
              detalle={`${metricas.itemsSugeridos} productos sugeridos`} />
            <Metrica titulo="Tasa de aprobación" valor={formatoPct(aPct(metricas.tasaAprobacion))}
              detalle="aprobados y modificados sobre lo sugerido" />
            <Metrica titulo="Decisiones" valor={metricas.aprobados + metricas.modificados + metricas.rechazados}
              detalle={`${metricas.aprobados} aprobados · ${metricas.modificados} modificados · ${metricas.rechazados} rechazados`} />
            <Metrica titulo="Precisión de cantidad" valor={formatoPct(aPct(metricas.precisionCantidad))}
              detalle={metricas.precisionCantidad == null ? 'Sin pedidos generados en el período' : 'cajas pedidas y recibidas vs. sugeridas'} />
          </div>
        )}

        {/* Tabla */}
        <section className="bg-white rounded-[12px] border border-[#f5f5f4] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-[#f6f3f3]">
                <tr className="font-['Inter'] font-bold text-[11px] uppercase tracking-[0.5px] text-[#57534e]">
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Código</th>
                  <th className="px-4 py-3 text-left">Origen</th>
                  <th className="px-4 py-3 text-right">Presupuesto</th>
                  <th className="px-4 py-3 text-right">Costo sugerido</th>
                  <th className="px-4 py-3 text-right">Costo aprobado</th>
                  <th className="px-4 py-3 text-center">Decisiones</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {!cargando && lista.content.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center font-['Inter'] text-[14px] text-[#78716c]">
                      No hay recomendaciones en este período.
                    </td>
                  </tr>
                )}
                {lista.content.map((r) => {
                  const estado = ESTADOS_RECOMENDACION[r.estado] ?? ESTADOS_RECOMENDACION.GENERADA;
                  return (
                    <tr key={r.id} className={`border-t border-[#f5f5f4] font-['Inter'] text-[14px] ${cargando ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 text-[#1b1b1c] whitespace-nowrap">{formatoFechaHora(r.createdAt)}</td>
                      <td className="px-4 py-3 font-semibold text-[#1b1b1c]">
                        #{r.id.slice(0, 8).toUpperCase()}
                        {r.confianzaBaja && (
                          <span className="ml-2 text-[11px] font-medium text-[#d97706]" title="Historial de ventas insuficiente">⚠ confianza baja</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#57534e]">{r.origen === 'VOZ' ? 'Voz' : 'Pantalla'}</td>
                      <td className="px-4 py-3 text-right text-[#1b1b1c] whitespace-nowrap">{formatoCOP(r.presupuesto)}</td>
                      <td className="px-4 py-3 text-right text-[#57534e] whitespace-nowrap">{formatoCOP(r.costoTotal)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#1b1b1c] whitespace-nowrap">{formatoCOP(r.costoAprobado)}</td>
                      <td className="px-4 py-3 text-center text-[12px] text-[#57534e] whitespace-nowrap">
                        <span className="text-[#16a34a]">{r.aprobados + r.modificados}</span> aprob. ·{' '}
                        <span className="text-[#dc2626]">{r.rechazados}</span> rech. ·{' '}
                        <span className="text-[#a8a29e]">{r.pendientes}</span> pend.
                        <span className="text-[#a8a29e]"> / {r.totalItems}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${estado.clase}`}>{estado.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link to={`/inventarios/recomendaciones?id=${r.id}`}
                          className="font-semibold text-[13px] text-[#9e2016] hover:underline">
                          Abrir
                        </Link>
                        {r.pedidoProveedorId && (
                          <Link to={`/inventarios/pedidos/${r.pedidoProveedorId}`}
                            className="ml-3 font-semibold text-[13px] text-[#57534e] hover:underline">
                            Ver pedido
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[#f5f5f4] px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="font-['Inter'] text-[13px] text-[#78716c]">{lista.totalElements} recomendaciones</p>
            <Pagination page={pagina} totalPages={Math.max(1, lista.totalPages)} onPageChange={cambiarPagina} />
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
