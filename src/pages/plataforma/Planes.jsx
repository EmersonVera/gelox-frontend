// src/pages/plataforma/Planes.jsx — RF70: planes de suscripción y cuotas operativas
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import SuccessToast from '../../components/SuccessToast';
import ModalPlan from '../../components/plataforma/ModalPlan';
import {
  AlertIcon, DatabaseIcon, InfoIcon, LayersIcon, PencilIcon, PlusIcon, SparklesIcon, StoreIcon, UsersIcon, BoxIcon,
} from '../../components/plataforma/IconosPlataforma';
import { CUOTAS, formatoPesos, iniciales, mensajeError, textoCuota } from '../../components/plataforma/plataformaUtils';
import { USAR_MOCK, crearPlan, editarPlan, listarPlanes } from '../../services/plataformaService';

const REGLAS = [
  { icono: <UsersIcon />, titulo: 'Usuarios', texto: 'Cuenta las cuentas habilitadas. Al llegar al máximo, el Gerente no puede crear más usuarios.' },
  { icono: <BoxIcon />, titulo: 'Productos', texto: 'Cuenta los productos del catálogo. Los que ya existen no se borran si se baja la cuota.' },
  { icono: <StoreIcon />, titulo: 'Comerciantes', texto: 'Cuenta los comerciantes activos. Al llegar al máximo no se pueden crear ni reactivar comerciantes.' },
  { icono: <DatabaseIcon />, titulo: 'Almacenamiento', texto: 'Logotipos, imágenes de productos y archivos exportados de la distribuidora.' },
  { icono: <SparklesIcon />, titulo: 'Llamadas IA', texto: 'Asistente de voz y recomendación de compras. Se reinicia el día 1; al llegar al límite la voz sigue con el modelo de respaldo.' },
];

const card = 'bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)]';

/** Avatares superpuestos de las distribuidoras que tienen el plan (máx. 3) y el total. */
function Asignadas({ plan }) {
  const lista = plan.distribuidoras ?? [];
  const total = plan.totalDistribuidoras ?? lista.length;
  if (total === 0) return <span className="text-sm text-muted">Ninguna</span>;
  return (
    <div className="flex items-center gap-2" title={lista.map((d) => d.nombreComercial).join(', ')}>
      <div className="flex">
        {lista.slice(0, 3).map((d, i) => (
          <Link
            key={d.id}
            to={`/plataforma/distribuidoras/${d.id}`}
            className={`w-7 h-7 rounded-[9px] border-2 border-white text-[10px] font-bold flex items-center justify-center transition duration-200 hover:-translate-y-0.5 ${
              d.estado === 'INACTIVO' ? 'bg-surface text-muted' : 'bg-primary-tint text-primary'
            } ${i > 0 ? '-ml-1.5' : ''}`}
            aria-label={d.nombreComercial}
          >
            {iniciales(d.nombreComercial)}
          </Link>
        ))}
      </div>
      <span className="text-sm text-ink">{total}</span>
    </div>
  );
}

export default function Planes() {
  const [planes, setPlanes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);
  const [modal, setModal] = useState({ abierto: false, plan: null });
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  useEffect(() => {
    let vivo = true;
    listarPlanes()
      .then((data) => { if (vivo) { setPlanes(data); setError(''); } })
      .catch((err) => { if (vivo) setError(mensajeError(err, 'No se pudieron cargar los planes.')); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [recarga]);

  const asignadas = planes.reduce((n, p) => n + (p.totalDistribuidoras ?? p.distribuidoras?.length ?? 0), 0);

  const guardar = async (datos) => {
    const editando = modal.plan;
    if (editando) await editarPlan(editando.id, datos);
    else await crearPlan(datos);
    setToast({ show: true, msg: editando ? `Plan «${datos.nombre}» actualizado.` : `Plan «${datos.nombre}» creado.`, type: 'success' });
    setRecarga((n) => n + 1);
  };

  const th = 'px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap';

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in-up">
          <div>
            <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-1">Plataforma</p>
            <h1 className="font-display text-2xl font-extrabold text-ink tracking-tight">Planes de suscripción</h1>
            <p className="text-sm text-muted mt-1 max-w-xl">
              Define el precio y las cuotas operativas de cada plan. Cada distribuidora tiene un plan y no puede superar sus cuotas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ abierto: true, plan: null })}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition duration-300 active:scale-[0.97] shadow-[0_2px_8px_rgba(158,32,22,0.25)] shrink-0 self-start sm:self-auto"
          >
            <PlusIcon />
            Nuevo plan
          </button>
        </div>

        {/* Tabla */}
        <section className={`${card} overflow-hidden animate-fade-in-up [animation-delay:60ms]`}>
          <div className="flex items-center justify-between gap-2.5 px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-ink">
              <span className="text-faint"><LayersIcon /></span>
              Planes configurados
            </div>
            {!cargando && !error && (
              <span className="text-xs text-muted">
                {planes.length} plan{planes.length !== 1 ? 'es' : ''} · {asignadas} distribuidora{asignadas !== 1 ? 's' : ''} asignada{asignadas !== 1 ? 's' : ''}
                {USAR_MOCK && ' · Modo simulado'}
              </span>
            )}
          </div>

          {error && (
            <div className="px-6 py-4">
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm animate-slide-down">
                <span className="flex items-start gap-2"><span className="shrink-0 mt-0.5"><AlertIcon size={15} /></span>{error}</span>
                <button type="button" onClick={() => { setCargando(true); setRecarga((n) => n + 1); }} className="shrink-0 font-semibold hover:underline">Reintentar</button>
              </div>
            </div>
          )}

          {cargando && planes.length === 0 ? (
            <div className="flex items-center justify-center gap-3 py-16 text-muted text-sm">
              <span className="w-5 h-5 rounded-full border-2 border-muted/30 border-t-muted animate-spin" />
              Cargando planes...
            </div>
          ) : !error && planes.length === 0 ? (
            <div className="py-16 text-center px-6">
              <p className="text-sm font-semibold text-ink">Aún no hay planes configurados.</p>
              <p className="text-xs text-muted mt-0.5">Crea el primero con el botón «Nuevo plan».</p>
            </div>
          ) : planes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px]">
                <thead>
                  <tr className="bg-surface text-left">
                    <th className={`${th} pl-6`}>Plan</th>
                    <th className={`${th} text-right`}>Precio / mes</th>
                    {/* Los encabezados de cuotas pueden partirse en dos líneas para que la tabla quepa sin scroll. */}
                    {CUOTAS.map((c) => <th key={c.campo} className={`${th.replace('whitespace-nowrap', 'leading-tight')} text-right`}>{c.columna}</th>)}
                    <th className={th}>Distribuidoras</th>
                    <th className={`${th} pr-6 text-right`}>Editar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {planes.map((p) => (
                    <tr key={p.id} className="hover:bg-surface/50 transition duration-150">
                      <td className="pl-6 pr-3 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary-tint text-primary flex items-center justify-center shrink-0">
                            <LayersIcon />
                          </div>
                          <div className="min-w-0 whitespace-nowrap">
                            <div className="text-sm font-semibold text-ink">{p.nombre}</div>
                            {p.descripcion && <div className="text-xs text-muted">{p.descripcion}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-ink text-right whitespace-nowrap">{formatoPesos(p.precioMensual)}</td>
                      {CUOTAS.map((c) => {
                        const v = p[c.campo];
                        return (
                          <td key={c.campo} className={`px-3 py-4 text-sm text-right whitespace-nowrap ${v == null ? 'text-muted' : 'text-ink'}`}>
                            {textoCuota(v, c.mb)}
                          </td>
                        );
                      })}
                      <td className="px-3 py-4"><Asignadas plan={p} /></td>
                      <td className="pl-3 pr-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setModal({ abierto: true, plan: p })}
                          aria-label={`Editar plan ${p.nombre}`}
                          title="Editar"
                          className="inline-flex items-center justify-center w-8 h-8 text-ink bg-surface rounded-lg hover:bg-border hover:text-primary transition duration-300 active:scale-95"
                        >
                          <PencilIcon size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Reglas */}
        <section className={`${card} p-6 animate-fade-in-up [animation-delay:120ms]`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
            <span className="text-xs font-bold text-ink uppercase tracking-widest">Cómo se aplican las cuotas</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {REGLAS.map((r) => (
              <div key={r.titulo} className="flex gap-3">
                <div className="w-8 h-8 rounded-[10px] bg-surface text-faint flex items-center justify-center shrink-0">{r.icono}</div>
                <div>
                  <p className="text-[13px] font-bold text-ink mb-0.5">{r.titulo}</p>
                  <p className="text-xs text-muted leading-relaxed">{r.texto}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2.5 mt-5 px-4 py-3 rounded-xl bg-surface text-[13px] text-faint leading-relaxed">
            <span className="shrink-0 mt-0.5"><InfoIcon /></span>
            <p>
              Cuando una distribuidora llega a una cuota, la operación se rechaza con el mensaje{' '}
              <strong className="text-ink">«Cuota del plan alcanzada»</strong> y se le indica que contacte al Superadministrador
              para cambiar de plan. Una cuota vacía significa <strong className="text-ink">sin límite</strong>.
            </p>
          </div>
        </section>
      </div>

      <ModalPlan
        abierto={modal.abierto}
        plan={modal.plan}
        onGuardar={guardar}
        onCerrar={() => setModal({ abierto: false, plan: null })}
      />

      <SuccessToast
        message={toast.msg}
        show={toast.show}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />
    </AppLayout>
  );
}
