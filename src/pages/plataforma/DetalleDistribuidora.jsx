// src/pages/plataforma/DetalleDistribuidora.jsx — RF59: detalle y ciclo de vida de una distribuidora
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import AppLayout from '../../components/AppLayout';
import SuccessToast from '../../components/SuccessToast';
import EstadoBadge from '../../components/plataforma/EstadoBadge';
import ModalConfirmacion from '../../components/plataforma/ModalConfirmacion';
import ContenidoCarga from '../../components/ui/ContenidoCarga';
import {
  ESTADOS_DISTRIBUIDORA, TRANSICIONES, etiquetaPlan, formatoFecha, formatoFechaHora, iniciales, mensajeError,
} from '../../components/plataforma/plataformaUtils';
import { cambiarEstado, obtenerDistribuidora, reenviarAcceso } from '../../services/plataformaService';

const schema = yup.object({
  estado: yup.string().required('Selecciona el nuevo estado.'),
  motivo: yup.string().trim()
    .required('Escribe el motivo del cambio.')
    .max(500, 'Máximo 500 caracteres.'),
});

/** Qué significa cada destino, según desde dónde se cambia. */
function descripcionDestino(destino, actual) {
  if (destino === 'ACTIVO') {
    return actual === 'SUSPENDIDO'
      ? 'Reactiva el acceso de todos sus usuarios cuando se regulariza el pago.'
      : 'Termina el periodo de prueba y mantiene el acceso con el plan contratado.';
  }
  if (destino === 'SUSPENDIDO') return 'Bloquea el acceso de todos sus usuarios. Se puede reactivar cuando se regularice el pago.';
  return 'Estado final: la distribuidora no se puede volver a activar.';
}

/* ── Icons ── */
function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function LockIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function MailIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

/* ── Shared styles ── */
const card = 'bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-6';
const lbl = 'text-xs font-semibold text-faint uppercase tracking-wider block mb-1.5';
const errMsg = 'text-xs text-error-fg mt-1 animate-slide-down';

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
      <span className="text-xs font-bold text-ink uppercase tracking-widest">{children}</span>
    </div>
  );
}

function Fila({ label, children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-1 sm:gap-4 py-3 border-b border-border last:border-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm text-ink min-w-0 break-words">{children}</dd>
    </div>
  );
}

function Historial({ historial }) {
  const ordenado = [...historial].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  return (
    <ol className="flex flex-col gap-4">
      {ordenado.map((h, i) => (
        <li key={`${h.fecha}-${i}`} className="flex gap-3">
          <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${ESTADOS_DISTRIBUIDORA[h.estadoNuevo]?.dot ?? 'bg-muted'}`} />
          <div className="text-sm min-w-0">
            <p className="text-ink">
              {h.estadoAnterior ? ESTADOS_DISTRIBUIDORA[h.estadoAnterior]?.label ?? h.estadoAnterior : 'Registro'}
              <span className="text-muted mx-1.5">→</span>
              <strong className="font-semibold">{ESTADOS_DISTRIBUIDORA[h.estadoNuevo]?.label ?? h.estadoNuevo}</strong>
              <span className="text-muted"> · {formatoFechaHora(h.fecha)}</span>
            </p>
            {h.motivo && <p className="text-xs text-muted mt-0.5">Motivo: {h.motivo}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Cada id monta un detalle nuevo: al pasar de una distribuidora a otra (atrás / adelante del
 * navegador) React Router reutiliza el componente, y sin la key se mostraría la distribuidora
 * anterior si la nueva no carga, junto con su formulario de cambio de estado.
 */
export default function DetalleDistribuidora() {
  const { id } = useParams();
  return <ContenidoDetalle key={id} id={id} />;
}

function ContenidoDetalle({ id }) {
  const location = useLocation();

  const [dist, setDist] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null); // { id, status, mensaje }
  const [errorCambio, setErrorCambio] = useState('');
  const [correoPendiente, setCorreoPendiente] = useState(() => !!location.state?.correoPendiente);
  const [modalReenvio, setModalReenvio] = useState(false);
  const [toast, setToast] = useState(() => (
    location.state?.aviso
      ? { show: true, msg: location.state.aviso, type: 'success' }
      : { show: false, msg: '', type: 'success' }
  ));

  const {
    register, handleSubmit, reset, control,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema), defaultValues: { estado: '', motivo: '' } });

  // "cargando" se deriva: hay un id en la URL que todavía no está en pantalla ni falló.
  const cargando = dist?.id !== id && errorCarga?.id !== id;

  useEffect(() => {
    if (!cargando) return undefined;
    let vivo = true;
    obtenerDistribuidora(id)
      .then((data) => { if (vivo) setDist(data); })
      .catch((err) => {
        if (vivo) {
          setErrorCarga({
            id,
            status: err?.response?.status,
            mensaje: mensajeError(err, 'No se pudo cargar la distribuidora.'),
          });
        }
      });
    return () => { vivo = false; };
  }, [cargando, id]);

  const destino = useWatch({ control, name: 'estado' });
  const permitidos = dist ? TRANSICIONES[dist.estado] ?? [] : [];
  const bloquea = destino === 'SUSPENDIDO' || destino === 'INACTIVO';
  // «de los 4 usuarios» (igual al mockup RF59), «del único usuario» o, sin el dato, «de todos los usuarios».
  const totalUsuarios = dist?.usuariosActivos;
  const sesionesDe = typeof totalUsuarios !== 'number'
    ? <>de <strong>todos los usuarios</strong></>
    : totalUsuarios === 1
      ? <>del <strong>único usuario</strong></>
      : <>de los <strong>{totalUsuarios} usuarios</strong></>;

  const onCambiarEstado = async ({ estado, motivo }) => {
    setErrorCambio('');
    try {
      const actualizada = await cambiarEstado(dist.id, { estado, motivo });
      setDist((prev) => ({
        ...prev,
        ...actualizada,
        // Si el backend no devuelve el historial, se agrega el cambio en pantalla.
        historialEstados: actualizada.historialEstados ?? (prev.historialEstados
          ? [...prev.historialEstados, { estadoAnterior: prev.estado, estadoNuevo: estado, motivo, fecha: new Date().toISOString() }]
          : undefined),
      }));
      reset({ estado: '', motivo: '' });
      setToast({ show: true, msg: `Estado cambiado a «${ESTADOS_DISTRIBUIDORA[estado].label}».`, type: 'success' });
    } catch (err) {
      setErrorCambio(mensajeError(err, 'No se pudo cambiar el estado. Intenta de nuevo.'));
    }
  };

  /* ── Estados de carga y error ── */
  if (cargando || !dist) {
    const noExiste = errorCarga?.status === 404;
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          <Link to="/plataforma/distribuidoras" className="inline-flex items-center gap-1 text-primary text-xs font-semibold uppercase tracking-wider hover:underline self-start">
            <ChevronLeftIcon />
            Distribuidoras
          </Link>
          {cargando ? (
            <div className="flex items-center justify-center gap-3 py-24 text-muted text-sm">
              <span className="w-5 h-5 rounded-full border-2 border-muted/30 border-t-muted animate-spin" />
              Cargando distribuidora...
            </div>
          ) : (
            <div className={`${card} text-center py-14 animate-fade-in-up`}>
              <p className="font-display font-bold text-lg text-ink">
                {noExiste ? 'No encontramos esta distribuidora' : 'No se pudo cargar la distribuidora'}
              </p>
              <p className="text-sm text-muted mt-1">
                {noExiste ? 'Puede que el enlace esté incompleto o que la distribuidora no exista.' : errorCarga?.mensaje}
              </p>
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  const esFinal = permitidos.length === 0;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="animate-fade-in-up">
          <Link to="/plataforma/distribuidoras" className="inline-flex items-center gap-1 text-primary text-xs font-semibold uppercase tracking-wider hover:underline">
            <ChevronLeftIcon />
            Distribuidoras
          </Link>
          <div className="flex items-center gap-4 mt-3">
            <div className={`w-12 h-12 rounded-xl text-sm font-bold flex items-center justify-center shrink-0 ${
              dist.estado === 'INACTIVO' ? 'bg-surface text-muted' : 'bg-primary-tint text-primary'
            }`}>
              {iniciales(dist.nombreComercial)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-2xl font-extrabold text-ink tracking-tight">{dist.nombreComercial}</h1>
                <EstadoBadge estado={dist.estado} />
              </div>
              <p className="text-sm text-muted mt-0.5">{dist.razonSocial} · Plan {etiquetaPlan(dist.plan)}</p>
            </div>
          </div>
        </div>

        {/* Correo de acceso pendiente (la creación respondió correoEnviado = false) */}
        {correoPendiente && dist.estado !== 'INACTIVO' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-amber-50 border border-amber-200 animate-slide-down">
            <div className="flex items-start gap-2.5 text-sm">
              <span className="text-amber-600 mt-0.5 shrink-0"><AlertIcon /></span>
              <p className="text-amber-800">
                <span className="font-semibold">El correo de acceso no llegó al gerente titular.</span>{' '}
                Reenvíalo para que pueda iniciar sesión con una contraseña temporal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalReenvio(true)}
              className="shrink-0 px-4 py-2 rounded-xl bg-white border border-amber-200 text-amber-800 text-sm font-semibold hover:bg-amber-100 transition duration-300 active:scale-[0.97]"
            >
              Reenviar acceso
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-6 items-start">

          {/* Columna izquierda */}
          <div className="flex flex-col gap-6">
            <section className={`${card} animate-fade-in-up [animation-delay:60ms]`}>
              <SectionTitle>Información de la distribuidora</SectionTitle>

              <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl bg-surface px-4 py-3 mb-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Identificador</p>
                  <p className="font-mono text-[13px] font-semibold text-ink break-all">{dist.id}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-border text-[11px] text-faint whitespace-nowrap">
                  <LockIcon />
                  Asignado por el sistema · no editable
                </span>
              </div>

              <dl>
                <Fila label="Razón social">{dist.razonSocial}</Fila>
                <Fila label="NIT">{dist.nit}</Fila>
                <Fila label="Nombre comercial">{dist.nombreComercial}</Fila>
                <Fila label="Página pública">
                  <a
                    href={`/tienda/${dist.subdominio}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-faint hover:text-primary hover:underline transition duration-200"
                  >
                    /tienda/{dist.subdominio}
                  </a>
                </Fila>
                <Fila label="Gerente titular">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p>{dist.nombreGerente ?? '—'}</p>
                      <p className="text-xs text-muted break-all">{dist.correoGerente}</p>
                    </div>
                    {dist.estado !== 'INACTIVO' && (
                      <button
                        type="button"
                        onClick={() => setModalReenvio(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink bg-surface rounded-lg hover:bg-border transition duration-300 active:scale-95"
                      >
                        <MailIcon />
                        Reenviar acceso
                      </button>
                    )}
                  </div>
                </Fila>
                <Fila label="Teléfono">{dist.telefono ?? '—'}</Fila>
                <Fila label="Dirección">{dist.direccion ?? '—'}</Fila>
                <Fila label="Plan">{etiquetaPlan(dist.plan)}</Fila>
                <Fila label="Registro">{formatoFecha(dist.createdAt)}</Fila>
              </dl>
            </section>

            {(dist.historialEstados?.length > 0 || dist.fechaEstado) && (
              <section className={`${card} animate-fade-in-up [animation-delay:120ms]`}>
                <SectionTitle>Historial de estados</SectionTitle>
                {dist.historialEstados?.length > 0 ? (
                  <Historial historial={dist.historialEstados} />
                ) : (
                  <div className="text-sm">
                    <p className="text-ink">
                      Último cambio a <strong className="font-semibold">{ESTADOS_DISTRIBUIDORA[dist.estado]?.label}</strong>
                      <span className="text-muted"> · {formatoFechaHora(dist.fechaEstado)}</span>
                    </p>
                    {dist.motivoEstado && <p className="text-xs text-muted mt-0.5">Motivo: {dist.motivoEstado}</p>}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Columna derecha: cambio de estado */}
          <section className={`${card} animate-fade-in-up [animation-delay:90ms]`}>
            <SectionTitle>Cambiar estado</SectionTitle>

            <div className="flex items-center gap-2 text-sm text-muted mb-5">
              Estado actual <EstadoBadge estado={dist.estado} />
            </div>

            {esFinal ? (
              <div className="flex items-start gap-3 rounded-xl bg-surface px-4 py-4 text-sm">
                <span className="text-muted shrink-0"><ArchiveIcon /></span>
                <p className="text-faint">
                  <span className="font-semibold text-ink">Esta distribuidora está archivada.</span>{' '}
                  Inactivo es un estado final: no admite más cambios y sus usuarios no pueden ingresar.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onCambiarEstado)} noValidate className="flex flex-col gap-5">
                <fieldset>
                  <legend className={lbl}>Nuevo estado</legend>
                  <div className="flex flex-col gap-3">
                    {permitidos.map((e) => {
                      const activo = destino === e;
                      return (
                        <label
                          key={e}
                          className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border-2 cursor-pointer transition duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/20 ${
                            activo ? 'border-primary bg-primary/5' : 'border-border bg-white hover:border-divider hover:bg-surface'
                          }`}
                        >
                          <input type="radio" value={e} className="sr-only" {...register('estado')} />
                          <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${activo ? 'border-primary' : 'border-divider'}`}>
                            {activo && <span className="w-2 h-2 rounded-full bg-primary block" />}
                          </span>
                          <div className="min-w-0">
                            <EstadoBadge estado={e} />
                            <p className="text-xs text-muted mt-1.5 leading-relaxed">{descripcionDestino(e, dist.estado)}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {errors.estado ? (
                    <p className={errMsg}>{errors.estado.message}</p>
                  ) : (
                    <p className="text-xs text-muted mt-2">
                      Solo se muestran los cambios permitidos desde {ESTADOS_DISTRIBUIDORA[dist.estado]?.label}.
                    </p>
                  )}
                </fieldset>

                <div>
                  <label htmlFor="motivo" className={lbl}>
                    Motivo del cambio <span className="text-primary">*</span>
                  </label>
                  <textarea
                    id="motivo"
                    rows={3}
                    placeholder="Ej. Mensualidad de octubre sin pagar 15 días después del vencimiento."
                    className={`w-full px-4 py-3 border rounded-xl text-sm outline-none transition duration-300 text-ink placeholder:text-[#c0c0c0] resize-none ${
                      errors.motivo
                        ? 'border-danger ring-2 ring-danger/20 bg-error-bg'
                        : 'bg-surface border-transparent focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20'
                    }`}
                    {...register('motivo')}
                  />
                  {errors.motivo ? (
                    <p className={errMsg}>{errors.motivo.message}</p>
                  ) : (
                    <p className="text-xs text-muted mt-1.5">Queda registrado en el historial con la fecha y el estado anterior.</p>
                  )}
                </div>

                {bloquea && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-sm text-error-fg animate-slide-down">
                    <span className="shrink-0 mt-0.5"><AlertIcon /></span>
                    <p>
                      Al confirmar se cierran de inmediato las sesiones {sesionesDe} de {dist.nombreComercial}.
                      {destino === 'SUSPENDIDO'
                        ? ' Verán la pantalla de acceso suspendido y su página pública dejará de mostrarse.'
                        : ' Verán la pantalla de distribuidora inactiva, su página pública dejará de mostrarse y el cambio no se puede deshacer.'}
                    </p>
                  </div>
                )}
                {destino === 'ACTIVO' && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 animate-slide-down">
                    <span className="shrink-0 mt-0.5"><InfoIcon /></span>
                    <p>
                      {dist.estado === 'SUSPENDIDO'
                        ? `Los usuarios de ${dist.nombreComercial} podrán volver a ingresar y su página pública se mostrará de nuevo.`
                        : `Los usuarios de ${dist.nombreComercial} siguen ingresando con normalidad.`}
                    </p>
                  </div>
                )}

                {errorCambio && (
                  <div className="px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm animate-slide-down">
                    {errorCambio}
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { reset({ estado: '', motivo: '' }); setErrorCambio(''); }}
                    disabled={isSubmitting}
                    className="px-5 py-3 rounded-xl bg-surface text-ink text-sm font-semibold hover:bg-border transition duration-300 active:scale-[0.97] disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition duration-300 active:scale-[0.97] shadow-[0_2px_8px_rgba(158,32,22,0.25)] disabled:opacity-60"
                  >
                    <ContenidoCarga cargando={isSubmitting} textoCargando="Guardando...">
                      Confirmar cambio de estado
                    </ContenidoCarga>
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>

      <ModalConfirmacion
        abierto={modalReenvio}
        icono={<MailIcon size={24} />}
        titulo="¿Reenviar el acceso al gerente?"
        textoConfirmar="Reenviar acceso"
        textoProcesando="Reenviando..."
        onConfirmar={async () => {
          await reenviarAcceso(dist.id);
          setCorreoPendiente(false);
          setToast({ show: true, msg: `Acceso reenviado a ${dist.correoGerente}.`, type: 'success' });
        }}
        onCerrar={() => setModalReenvio(false)}
      >
        Se generará una nueva contraseña temporal y se enviará a{' '}
        <strong className="text-ink break-all">{dist.correoGerente}</strong>. La contraseña anterior dejará de funcionar.
      </ModalConfirmacion>

      <SuccessToast
        message={toast.msg}
        show={toast.show}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />
    </AppLayout>
  );
}
