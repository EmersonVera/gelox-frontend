// src/components/plataforma/AsignarPlan.jsx — RF70: asignar otro plan de suscripción a una distribuidora
import { Link } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useState } from 'react';
import ContenidoCarga from '../ui/ContenidoCarga';
import { AlertIcon, InfoIcon } from './IconosPlataforma';
import { CUOTAS, formatoMB, formatoNumero, formatoPesos, mensajeError, nombrePlan, textoCuota } from './plataformaUtils';
import { asignarPlan } from '../../services/plataformaService';

const schema = yup.object({
  planId: yup.string().required('Selecciona el nuevo plan.'),
  motivo: yup.string().trim().required('Escribe el motivo del cambio.').max(500, 'Máximo 500 caracteres.'),
});

const lbl = 'text-xs font-semibold text-faint uppercase tracking-wider block mb-1.5';
const errMsg = 'text-xs text-error-fg mt-1 animate-slide-down';

const usadoTexto = (c, uso) => {
  const u = uso?.[c.uso]?.usado;
  if (u === undefined || u === null) return null;
  return c.mb ? formatoMB(u) : formatoNumero(u);
};

/**
 * dist: distribuidora del detalle (planId, planNombre, uso, estado).
 * planes: { lista, error } o null mientras cargan.
 * onAsignado(distribuidoraActualizada, plan) al terminar bien.
 */
export default function AsignarPlan({ dist, planes, onAsignado }) {
  const [errorEnvio, setErrorEnvio] = useState('');
  const {
    register, handleSubmit, reset, control,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema), defaultValues: { planId: '', motivo: '' } });

  const planId = useWatch({ control, name: 'planId' });
  const lista = planes?.lista ?? [];
  // Sin planId (backend anterior a T191) se reconoce el plan actual por el nombre.
  const actual = lista.find((p) => p.id === dist.planId)
    ?? lista.find((p) => p.nombre?.toLowerCase() === nombrePlan(dist)?.toLowerCase());
  const nuevo = lista.find((p) => p.id === planId);

  // Cuotas del plan nuevo que quedan por debajo de lo que la distribuidora ya usa.
  const excesos = nuevo
    ? CUOTAS.filter((c) => nuevo[c.campo] !== null && nuevo[c.campo] !== undefined && Number(dist.uso?.[c.uso]?.usado ?? 0) > nuevo[c.campo])
    : [];

  const cancelar = () => { reset({ planId: '', motivo: '' }); setErrorEnvio(''); };

  const onSubmit = async ({ planId: id, motivo }) => {
    setErrorEnvio('');
    try {
      const actualizada = await asignarPlan(dist.id, { planId: id, motivo: motivo.trim() });
      reset({ planId: '', motivo: '' });
      onAsignado(actualizada ?? {}, nuevo);
    } catch (err) {
      setErrorEnvio(mensajeError(err, 'No se pudo cambiar el plan. Intenta de nuevo.'));
    }
  };

  const encabezado = (
    <div className="flex items-center gap-2 flex-wrap text-sm text-muted mb-5">
      Plan actual
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-tint text-primary">{nombrePlan(dist)}</span>
      {actual && <span className="text-xs">{formatoPesos(actual.precioMensual)} /mes</span>}
    </div>
  );

  if (dist.estado === 'INACTIVO') {
    return (
      <>
        {encabezado}
        <p className="rounded-xl bg-surface px-4 py-4 text-sm text-faint">
          <span className="font-semibold text-ink">La distribuidora está archivada.</span> No admite cambios de plan.
        </p>
      </>
    );
  }

  if (!planes) {
    return (
      <>
        {encabezado}
        <div className="flex items-center gap-3 py-6 text-muted text-sm">
          <span className="w-4 h-4 rounded-full border-2 border-muted/30 border-t-muted animate-spin" />
          Cargando planes...
        </div>
      </>
    );
  }

  if (planes.error) {
    return (
      <>
        {encabezado}
        <div className="px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm">{planes.error}</div>
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {encabezado}

      <fieldset>
        <legend className={lbl}>Nuevo plan</legend>
        <div className={`grid grid-cols-1 gap-2.5 ${lista.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          {lista.map((p) => {
            const esActual = p.id === actual?.id;
            const activo = planId === p.id;
            return (
              <label
                key={p.id}
                className={`block px-3.5 py-3 rounded-[14px] border-2 transition duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/20 ${
                  esActual
                    ? 'border-border bg-canvas cursor-not-allowed'
                    : activo
                      ? 'border-primary bg-primary/5 cursor-pointer'
                      : 'border-divider bg-white hover:bg-surface cursor-pointer'
                }`}
              >
                <input type="radio" value={p.id} disabled={esActual} className="sr-only" {...register('planId')} />
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span className={`text-sm font-bold ${activo ? 'text-primary' : 'text-ink'}`}>{p.nombre}</span>
                    {esActual && <span className="px-2 py-0.5 rounded-full bg-surface text-faint text-[11px] font-medium">Plan actual</span>}
                  </span>
                  <span className={`w-[18px] h-[18px] rounded-full border-[1.5px] shrink-0 flex items-center justify-center ${activo ? 'border-primary' : 'border-[#a8a29e]'}`}>
                    {activo && <span className="w-[9px] h-[9px] rounded-full bg-primary block" />}
                  </span>
                </span>
                <span className="block text-[13px] mt-0.5">
                  <strong className="font-semibold text-ink">{formatoPesos(p.precioMensual)}</strong>
                  <span className="text-muted"> /mes</span>
                </span>
              </label>
            );
          })}
        </div>
        {errors.planId ? (
          <p className={errMsg}>{errors.planId.message}</p>
        ) : (
          <p className="text-xs text-muted mt-1.5">
            Los planes y sus cuotas se configuran en{' '}
            <Link to="/plataforma/planes" className="text-primary font-semibold hover:underline">Planes</Link>.
          </p>
        )}
      </fieldset>

      {nuevo && (
        <div className="flex flex-col gap-5 mt-5 animate-slide-down">
          <div>
            <span className={lbl}>Cambio de cuotas</span>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1.5 rounded-xl bg-surface px-4 py-3 text-[13px]">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Cuota</span>
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider text-right">{actual?.nombre ?? nombrePlan(dist)}</span>
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider text-right">{nuevo.nombre}</span>
              {CUOTAS.map((c) => {
                const usado = usadoTexto(c, dist.uso);
                const queda = excesos.includes(c);
                const anterior = actual ? actual[c.campo] : dist.uso?.[c.uso]?.limite;
                return (
                  <div key={c.campo} className="contents">
                    <span className="text-ink">
                      {c.uso === 'llamadasIaMes' ? 'Llamadas IA / mes' : c.label}
                      {usado !== null && <span className="text-muted"> (usa {usado})</span>}
                    </span>
                    <span className="text-right text-muted whitespace-nowrap">{textoCuota(anterior, c.mb)}</span>
                    <span className={`text-right font-bold whitespace-nowrap ${queda ? 'text-amber-700' : 'text-ink'}`}>
                      {textoCuota(nuevo[c.campo], c.mb)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="motivo-plan" className={lbl}>
              Motivo del cambio <span className="text-primary">*</span>
            </label>
            <textarea
              id="motivo-plan"
              rows={3}
              placeholder="Ej. Solicitud de la gerente: necesita más usuarios para la temporada de diciembre."
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
              <p className="text-xs text-muted mt-1.5">Queda registrado en el log de auditoría con la fecha, la IP y el plan anterior.</p>
            )}
          </div>

          {excesos.length > 0 && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-[13px] text-amber-800 leading-relaxed">
              <span className="shrink-0 mt-0.5 text-amber-600"><AlertIcon /></span>
              <p>
                Con el plan {nuevo.nombre}, {excesos.map((c) => c.label.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' y $1')} quedan por encima de la cuota.
                No se borra nada, pero {dist.nombreComercial} recibirá «Cuota del plan alcanzada» al crear registros de ese tipo.
              </p>
            </div>
          )}

          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-surface text-[13px] text-faint leading-relaxed">
            <span className="shrink-0 mt-0.5"><InfoIcon /></span>
            <p>
              El cambio aplica de inmediato: desde la siguiente operación la distribuidora usa las cuotas del plan{' '}
              <strong className="text-ink">{nuevo.nombre}</strong>. El consumo actual no se reinicia.
            </p>
          </div>

          {errorEnvio && (
            <div className="px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm animate-slide-down">{errorEnvio}</div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={cancelar}
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
              <ContenidoCarga cargando={isSubmitting} textoCargando="Asignando...">
                Asignar plan {nuevo.nombre}
              </ContenidoCarga>
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
