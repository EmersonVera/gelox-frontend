// src/pages/inventarios/RecomendacionCompras.jsx — RF54–RF56: Recomendación de compra
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import AppLayout from '../../components/AppLayout';
import SuccessToast from '../../components/SuccessToast';
import { formatoCOP, formatoPct } from '../../components/voz/formato';
import BarraPresupuesto from '../../components/inventarios/recomendaciones/BarraPresupuesto';
import FilaRecomendacion from '../../components/inventarios/recomendaciones/FilaRecomendacion';
import ModalConfirmarPedido from '../../components/inventarios/recomendaciones/ModalConfirmarPedido';
import {
  ESTADOS_RECOMENDACION, esExcluido, formatoFechaHora, mensajeError, resumenRecomendacion,
} from '../../components/inventarios/recomendaciones/recomendacionUtils';
import {
  USAR_MOCK, decidirItem, generarPedido, generarRecomendacion, obtenerRecomendacion,
} from '../../services/recomendacionService';
import { descargarExportacionPedido } from '../../services/vozService';
import ContenidoCarga from '../../components/ui/ContenidoCarga';

const schema = yup.object({
  presupuesto: yup
    .number()
    .typeError('El presupuesto debe ser mayor a cero')
    .required('El presupuesto debe ser mayor a cero')
    .positive('El presupuesto debe ser mayor a cero'),
});

const urlExportacion = (pedidoId) => `/api/inventario/pedidos/${pedidoId}/exportar`;

const formatoMiles = (n) => (n === '' || n == null ? '' : new Intl.NumberFormat('es-CO').format(n));

/* ── Iconos ── */
function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
    </svg>
  );
}
function AlertIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function CashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}
function TrendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function Kpi({ titulo, valor, detalle, icono, tono }) {
  return (
    <div className="bg-white rounded-[12px] border border-[#f5f5f4] p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="font-['Inter'] font-bold text-[11px] uppercase tracking-[0.55px] text-[#78716c]">{titulo}</p>
        <span className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${tono}`}>{icono}</span>
      </div>
      <p className="font-['Manrope'] font-bold text-[26px] text-[#1b1b1c] leading-none">{valor}</p>
      <p className="font-['Inter'] text-[12px] text-[#78716c]">{detalle}</p>
    </div>
  );
}

export default function RecomendacionCompras() {
  const [searchParams, setSearchParams] = useSearchParams();
  const idParam = searchParams.get('id');

  const [rec, setRec] = useState(null);
  const [error, setError] = useState('');
  const [errorCarga, setErrorCarga] = useState(null); // { id, mensaje }
  const [abiertos, setAbiertos] = useState(() => new Set());
  const [guardandoItem, setGuardandoItem] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [pedido, setPedido] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { presupuesto: '' },
  });

  const mostrarRecomendacion = useCallback((data) => {
    setRec(data);
    setPedido(data.pedidoProveedorId
      ? { pedidoId: data.pedidoProveedorId, exportUrl: urlExportacion(data.pedidoProveedorId) }
      : null);
    const primero = data.items?.find((i) => i.urgencia === 'CRITICO') ?? data.items?.[0];
    setAbiertos(new Set(primero ? [primero.id] : []));
  }, []);

  // Abrir una recomendación existente (viene del historial: ?id=...).
  // "cargando" se deriva: hay un id en la URL que todavía no está en pantalla ni falló.
  const cargando = !!idParam && rec?.id !== idParam && errorCarga?.id !== idParam;

  useEffect(() => {
    if (!cargando) return undefined;
    let vivo = true;
    obtenerRecomendacion(idParam)
      .then((data) => { if (vivo) mostrarRecomendacion(data); })
      .catch((err) => {
        if (vivo) setErrorCarga({ id: idParam, mensaje: mensajeError(err, 'No se pudo cargar la recomendación.') });
      });
    return () => { vivo = false; };
  }, [cargando, idParam, mostrarRecomendacion]);

  const onGenerar = async ({ presupuesto }) => {
    setError('');
    try {
      const data = await generarRecomendacion(presupuesto);
      mostrarRecomendacion(data);
      setSearchParams({ id: data.id }, { replace: true });
    } catch (err) {
      setError(mensajeError(err, 'No se pudo generar la recomendación. Intenta de nuevo.'));
    }
  };

  // El PATCH devuelve solo el ítem; luego se relee la recomendación para traer el costo
  // aprobado y el estado que recalcula el backend. productosExcluidos solo llega al generar.
  const onDecidir = async (item, payload) => {
    setGuardandoItem(item.id);
    try {
      const actualizado = await decidirItem(rec.id, item.id, payload);
      setRec((r) => ({ ...r, items: r.items.map((i) => (i.id === actualizado.id ? actualizado : i)) }));
      obtenerRecomendacion(rec.id)
        .then((data) => setRec((r) => ({ ...data, productosExcluidos: r?.productosExcluidos })))
        .catch(() => { /* se conserva el ítem ya actualizado */ });
      return true;
    } catch (err) {
      setToast({ show: true, msg: mensajeError(err, 'No se pudo guardar la decisión.'), type: 'error' });
      return false;
    } finally {
      setGuardandoItem(null);
    }
  };

  const descargarExcel = async (datosPedido) => {
    const url = datosPedido?.exportUrl;
    if (!url) {
      setToast({ show: true, msg: 'En modo simulado no hay archivo Excel para descargar.', type: 'info' });
      return;
    }
    try {
      await descargarExportacionPedido(url);
    } catch (err) {
      setToast({ show: true, msg: mensajeError(err, 'No se pudo descargar el Excel del pedido.'), type: 'error' });
    }
  };

  const onConfirmarPedido = async () => {
    setEnviandoPedido(true);
    try {
      const resultado = await generarPedido(rec.id);
      setPedido(resultado);
      setRec((r) => ({ ...r, estado: 'PEDIDO_GENERADO', pedidoProveedorId: resultado.pedidoId }));
      setModalAbierto(false);
      setToast({ show: true, msg: 'Pedido generado en estado Pendiente.', type: 'success' });
      if (resultado.exportUrl) descargarExcel(resultado);
    } catch (err) {
      setModalAbierto(false);
      setToast({ show: true, msg: mensajeError(err, 'No se pudo generar el pedido.'), type: 'error' });
    } finally {
      setEnviandoPedido(false);
    }
  };

  const alternar = (id) => setAbiertos((prev) => {
    const nuevo = new Set(prev);
    if (nuevo.has(id)) nuevo.delete(id); else nuevo.add(id);
    return nuevo;
  });

  const r = resumenRecomendacion(rec);
  const items = rec?.items ?? [];
  const pedidoGenerado = rec?.estado === 'PEDIDO_GENERADO';
  const sinAprobados = r.aprobados.length === 0;
  const excluidosPresupuesto = items.filter(esExcluido);
  const excluidosDatos = rec?.productosExcluidos ?? [];
  const estado = ESTADOS_RECOMENDACION[rec?.estado];

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
              Recomendación de Compra
            </h1>
            <p className="font-['Inter'] text-[14px] text-[#78716c] mt-1">
              Prioriza el pedido semanal por urgencia de reabastecimiento y margen, sin pasarte del presupuesto.
            </p>
          </div>
          <Link to="/inventarios/recomendaciones/historial"
            className="font-['Inter'] font-semibold text-[13px] text-[#9e2016] hover:underline">
            Ver historial →
          </Link>
        </div>

        {/* Presupuesto */}
        <form onSubmit={handleSubmit(onGenerar)} noValidate
          className="bg-white rounded-[12px] border border-[#f5f5f4] p-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 flex-1">
            <div className="flex flex-col gap-1.5 w-full sm:max-w-[320px]">
              <label htmlFor="presupuesto" className="font-['Inter'] font-bold text-[11px] uppercase tracking-[0.55px] text-[#78716c]">
                Presupuesto disponible
              </label>
              <Controller name="presupuesto" control={control} render={({ field }) => (
                <div className={`flex items-center gap-2 bg-white border rounded-[10px] px-3 py-2.5 focus-within:ring-2 focus-within:ring-[#9e2016]/20 ${errors.presupuesto ? 'border-[#dc2626]' : 'border-[#e7e5e4] focus-within:border-[#9e2016]'}`}>
                  <span className="font-['Inter'] text-[15px] text-[#78716c]">$</span>
                  <input id="presupuesto" inputMode="numeric" autoComplete="off" placeholder="8.500.000"
                    value={formatoMiles(field.value)}
                    onChange={(e) => {
                      const digitos = e.target.value.replace(/\D/g, '');
                      field.onChange(digitos === '' ? '' : Number(digitos));
                    }}
                    onBlur={field.onBlur}
                    aria-invalid={!!errors.presupuesto}
                    className="flex-1 min-w-0 font-['Manrope'] font-bold text-[18px] text-[#1b1b1c] outline-none bg-transparent" />
                  <span className="font-['Inter'] text-[12px] text-[#a8a29e]">COP</span>
                </div>
              )} />
              {errors.presupuesto && (
                <p className="font-['Inter'] text-[12px] text-[#dc2626]">{errors.presupuesto.message}</p>
              )}
            </div>
            <button type="submit" disabled={isSubmitting}
              className="sm:mt-[22px] flex items-center justify-center gap-2 px-5 py-3 rounded-[10px] bg-[#9e2016] text-white font-['Inter'] font-semibold text-[14px] shadow-sm hover:bg-[#7f1a12] transition-colors active:scale-[0.98] disabled:opacity-60">
              <SparkleIcon />
              <ContenidoCarga cargando={isSubmitting} textoCargando="Generando…" spinner={null}>Generar recomendación</ContenidoCarga>
            </button>
          </div>
          {rec && (
            <div className="text-left lg:text-right font-['Inter']">
              <p className="text-[12px] text-[#a8a29e]">Recomendación abierta</p>
              <p className="text-[14px] font-semibold text-[#1b1b1c]">
                #{rec.id.slice(0, 8).toUpperCase()} · {formatoFechaHora(rec.createdAt)}
              </p>
              <p className="text-[12px] text-[#78716c]">
                Presupuesto {formatoCOP(rec.presupuesto)} · Historial analizado: {rec.diasHistorial} días ({rec.diasConVentas} con ventas)
                {estado && <span className={`ml-2 px-2 py-0.5 rounded-full text-[11px] font-semibold ${estado.clase}`}>{estado.label}</span>}
              </p>
            </div>
          )}
        </form>

        {USAR_MOCK && (
          <p className="font-['Inter'] text-[12px] text-[#a8a29e] -mt-3">
            Modo simulado (VITE_USAR_MOCK_RECOMENDACION=true): los datos son de ejemplo.
          </p>
        )}

        {(error || (errorCarga?.id === idParam && errorCarga.mensaje)) && (
          <div className="bg-[#fef2f2] border border-[#fca5a5] rounded-[10px] px-4 py-3 font-['Inter'] font-medium text-[14px] text-[#dc2626]">
            {error || errorCarga.mensaje}
          </div>
        )}

        {cargando && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="bg-white rounded-[12px] h-[130px] animate-pulse border border-[#f5f5f4]" />)}
          </div>
        )}

        {!rec && !cargando && (
          <div className="bg-white rounded-[12px] border border-dashed border-[#e7e5e4] p-10 text-center">
            <p className="font-['Manrope'] font-bold text-[18px] text-[#1b1b1c]">Aún no hay una recomendación abierta</p>
            <p className="font-['Inter'] text-[14px] text-[#78716c] mt-1">
              Ingresa el presupuesto de la semana y pulsa “Generar recomendación”.
            </p>
          </div>
        )}

        {rec && !cargando && (
          <>
            {/* Confianza baja */}
            {rec.confianzaBaja && (
              <div className="bg-[#fffbeb] border border-[#fcd34d] rounded-[10px] px-4 py-3 flex items-start gap-2.5">
                <span className="text-[#d97706] mt-0.5"><AlertIcon size={15} /></span>
                <div className="font-['Inter'] text-[14px]">
                  <p className="font-semibold text-[#92400e]">Confianza baja</p>
                  <p className="text-[#b45309]">
                    El cálculo usó {rec.diasHistorial} días de historial, {rec.diasConVentas} de ellos con ventas
                    (se recomiendan al menos 90 días y 20 con ventas). Revisa las cantidades antes de aprobar.
                  </p>
                </div>
              </div>
            )}

            {/* Productos excluidos por datos incompletos (solo llegan al generar) */}
            {excluidosDatos.length > 0 && (
              <div className="bg-white border border-[#e7e5e4] rounded-[10px] px-4 py-3 font-['Inter'] text-[14px]">
                <p className="font-semibold text-[#1b1b1c]">Productos excluidos por datos incompletos</p>
                <ul className="mt-1.5 flex flex-col gap-0.5 text-[#57534e]">
                  {excluidosDatos.map((p) => (
                    <li key={p.productoId}>
                      <span className="font-medium text-[#1b1b1c]">{p.nombre}</span> — {p.motivo}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[13px] text-[#78716c]">
                  Complétalos en el{' '}
                  <Link to="/inventarios/catalogo" className="font-semibold text-[#9e2016] hover:underline">catálogo de productos</Link>
                  {' '}para que entren en la próxima recomendación.
                </p>
              </div>
            )}

            {items.length === 0 ? (
              <div className="bg-white rounded-[12px] border border-dashed border-[#e7e5e4] p-10 text-center">
                <p className="font-['Manrope'] font-bold text-[18px] text-[#1b1b1c]">Ningún producto requiere compra por ahora</p>
                <p className="font-['Inter'] text-[14px] text-[#78716c] mt-1">
                  El stock de todos los productos cubre la demanda esperada hasta el próximo pedido.
                </p>
              </div>
            ) : (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <Kpi titulo="Productos recomendados" valor={items.length}
                    detalle={`${r.aprobados.length} aprobados · ${r.pendientes} pendientes`}
                    icono={<BoxIcon />} tono="bg-[#fef2f2] text-[#9e2016]" />
                  <Kpi titulo="Críticos" valor={r.criticos} detalle="por debajo del stock de seguridad"
                    icono={<AlertIcon />} tono="bg-[#fef2f2] text-[#dc2626]" />
                  <Kpi titulo="Costo sugerido" valor={formatoCOP(r.costoSugerido)}
                    detalle={`${formatoPct(rec.presupuesto > 0 ? Math.round((r.costoSugerido / rec.presupuesto) * 1000) / 10 : null)} del presupuesto`}
                    icono={<CashIcon />} tono="bg-[#f5f5f4] text-[#57534e]" />
                  <Kpi titulo="Margen esperado" valor={formatoCOP(r.margenSugerido)}
                    detalle={`${formatoPct(r.margenPct == null ? null : Math.round(r.margenPct * 10) / 10)} sobre el costo`}
                    icono={<TrendIcon />} tono="bg-[#f0fdf4] text-[#16a34a]" />
                </div>

                <BarraPresupuesto presupuesto={rec.presupuesto} costoAprobado={r.costoAprobado}
                  costoSugerido={r.costoSugerido} porUrgencia={r.porUrgencia} />

                {/* Lista priorizada */}
                <section className="bg-white rounded-[12px] border border-[#f5f5f4] overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-5 py-4 flex-wrap">
                    <h2 className="font-['Manrope'] font-bold text-[18px] text-[#1b1b1c]">Lista priorizada</h2>
                    <p className="font-['Inter'] text-[12px] text-[#78716c]">
                      <span className="uppercase tracking-[0.5px] font-bold mr-2">Orden</span> Urgencia ↓ · Margen ↓ · Score ↓
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px]">
                      <thead className="bg-[#f6f3f3]">
                        <tr className="font-['Inter'] font-bold text-[11px] uppercase tracking-[0.5px] text-[#57534e]">
                          <th className="px-4 py-3 text-left">Producto</th>
                          <th className="px-4 py-3 text-left">Urgencia · score</th>
                          <th className="px-4 py-3 text-right">Stock</th>
                          <th className="px-4 py-3 text-right">Cajas sugeridas</th>
                          <th className="px-4 py-3 text-right">Costo estimado</th>
                          <th className="px-4 py-3 text-right">Margen esperado</th>
                          <th className="px-4 py-3 text-left">Decisión</th>
                          <th className="px-4 py-3 text-center">Justificación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <FilaRecomendacion key={item.id} item={item}
                            abierto={abiertos.has(item.id)} onToggle={() => alternar(item.id)}
                            onDecidir={onDecidir} bloqueado={pedidoGenerado}
                            guardando={guardandoItem === item.id} />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pie */}
                  <div className="border-t border-[#f5f5f4] px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <p className="font-['Inter'] text-[13px] text-[#78716c]">
                      {items.length} productos recomendados
                      {excluidosPresupuesto.length > 0 && (
                        <> · {excluidosPresupuesto.length} exceden el presupuesto</>
                      )}
                    </p>
                    <div className="flex items-center gap-4 flex-wrap">
                      <p className="font-['Inter'] text-[13px] text-[#1b1b1c]">
                        Aprobado: <span className="font-bold">{r.cajasAprobadas} cajas · {formatoCOP(r.costoAprobado)}</span>
                      </p>
                      <button type="button" onClick={() => setModalAbierto(true)}
                        disabled={sinAprobados || pedidoGenerado}
                        title={sinAprobados ? 'Aprueba o modifica al menos un producto' : undefined}
                        className="px-5 py-2.5 rounded-[10px] bg-[#9e2016] text-white font-['Inter'] font-semibold text-[14px] hover:bg-[#7f1a12] transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
                        Generar pedido
                      </button>
                    </div>
                  </div>
                  {sinAprobados && !pedidoGenerado && (
                    <p className="px-5 pb-4 -mt-2 font-['Inter'] text-[12px] text-[#a8a29e] text-right">
                      Aprueba o modifica al menos un producto para generar el pedido.
                    </p>
                  )}
                </section>
              </>
            )}

            {/* Resultado del pedido */}
            {pedidoGenerado && pedido && (
              <div className="bg-[#f0fdf4] border border-[#86efac] rounded-[12px] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="font-['Inter']">
                  <p className="font-semibold text-[15px] text-[#166534]">Pedido a proveedor generado</p>
                  <p className="text-[13px] text-[#15803d]">
                    Quedó en estado Pendiente. Las decisiones de esta recomendación ya no se pueden cambiar.
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Link to={`/inventarios/pedidos/${pedido.pedidoId}`}
                    className="px-4 py-2 rounded-[10px] bg-white border border-[#86efac] font-['Inter'] font-semibold text-[13px] text-[#166534] hover:bg-[#dcfce7] transition-colors">
                    Ver pedido
                  </Link>
                  <button type="button" onClick={() => descargarExcel(pedido)}
                    className="px-4 py-2 rounded-[10px] bg-[#16a34a] font-['Inter'] font-semibold text-[13px] text-white hover:bg-[#15803d] transition-colors">
                    Descargar Excel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ModalConfirmarPedido
        abierto={modalAbierto}
        aprobados={r.aprobados.length}
        cajas={r.cajasAprobadas}
        costo={r.costoAprobado}
        pendientes={r.pendientes}
        enviando={enviandoPedido}
        onConfirmar={onConfirmarPedido}
        onCerrar={() => setModalAbierto(false)}
      />

      <SuccessToast show={toast.show} message={toast.msg} type={toast.type}
        onClose={() => setToast((t) => ({ ...t, show: false }))} />
    </AppLayout>
  );
}
