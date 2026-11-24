// src/components/plataforma/ModalPlan.jsx — RF70: crear o editar un plan de suscripción y sus cuotas
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import ContenidoCarga from '../ui/ContenidoCarga';
import { AlertIcon, CloseIcon, ShieldIcon } from './IconosPlataforma';
import { CUOTAS, formatoMB, formatoNumero, mensajeError, textoCuota } from './plataformaUtils';

const cuota = yup.number()
  .typeError('Escribe un número entero.')
  .nullable()
  .integer('Escribe un número entero.')
  .min(0, 'No puede ser negativo.');

const schema = yup.object({
  nombre: yup.string().trim().required('El nombre del plan es obligatorio.').max(30, 'Máximo 30 caracteres.'),
  descripcion: yup.string().trim().max(255, 'Máximo 255 caracteres.'),
  precioMensual: yup.number()
    .typeError('Escribe el precio mensual.')
    .required('Escribe el precio mensual.')
    .integer('Escribe un valor en pesos, sin decimales.')
    .min(0, 'No puede ser negativo.'),
  maxUsuarios: cuota,
  maxProductos: cuota,
  maxComerciantes: cuota,
  maxAlmacenamientoMb: cuota,
  maxLlamadasIaMes: cuota,
});

const VACIO = {
  nombre: '', descripcion: '', precioMensual: null,
  maxUsuarios: null, maxProductos: null, maxComerciantes: null, maxAlmacenamientoMb: null, maxLlamadasIaMes: null,
};

const AYUDA = {
  maxUsuarios: 'Cuentas habilitadas de la distribuidora.',
  maxProductos: 'Productos del catálogo.',
  maxComerciantes: 'Comerciantes activos.',
  maxAlmacenamientoMb: null, // se calcula: «Equivale a 5 GB.»
  maxLlamadasIaMes: 'Voz y recomendaciones. Se reinicia el día 1.',
};

const ETIQUETA = {
  maxUsuarios: 'Máx. usuarios',
  maxProductos: 'Máx. productos',
  maxComerciantes: 'Máx. comerciantes',
  maxAlmacenamientoMb: 'Almacenamiento máx. (MB)',
  maxLlamadasIaMes: 'Llamadas IA por mes',
};

/** Qué pasa con una distribuidora que ya supera la cuota nueva (los registros existentes no se borran). */
function avisoExceso(c, nombre, usado, limite) {
  const n = formatoNumero(usado);
  const l = formatoNumero(limite);
  switch (c.uso) {
    case 'usuarios':
      return <><strong>{nombre}</strong> ya tiene <strong>{n} usuarios habilitados</strong>. Con una cuota de {l} no podrá crear ni habilitar usuarios hasta bajar de ese número; los existentes no se deshabilitan.</>;
    case 'productos':
      return <><strong>{nombre}</strong> ya tiene <strong>{n} productos</strong>. Con una cuota de {l} no podrá crear productos nuevos hasta bajar de ese número; los productos existentes no se borran.</>;
    case 'comerciantes':
      return <><strong>{nombre}</strong> ya tiene <strong>{n} comerciantes activos</strong>. Con una cuota de {l} no podrá crear ni reactivar comerciantes hasta bajar de ese número.</>;
    case 'almacenamientoMb':
      return <><strong>{nombre}</strong> ya usa <strong>{formatoMB(usado)}</strong>. Con una cuota de {formatoMB(limite)} no podrá subir más archivos; los que ya tiene no se borran.</>;
    default:
      return <><strong>{nombre}</strong> lleva <strong>{n} llamadas IA</strong> este mes. Con una cuota de {l} el asistente usará el modelo local hasta el día 1 del próximo mes.</>;
  }
}

/** Lista de nombres en español: «A», «A y B», «A, B y C». */
function listaNombres(nombres) {
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/** Campo numérico con separador de miles (es-CO). Vacío = null. */
function InputNumero({ value, onChange, onBlur, id, placeholder, sufijo, estado = 'normal', inputRef }) {
  const texto = value === null || value === undefined || Number.isNaN(value) ? '' : Number(value).toLocaleString('es-CO');
  const bordes = {
    normal: 'bg-surface border-transparent focus-within:bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20',
    warn: 'bg-white border-amber-500 ring-2 ring-amber-500/15',
    error: 'bg-error-bg border-danger ring-2 ring-danger/20',
  }[estado];
  return (
    <div className={`flex items-center gap-2 px-4 rounded-xl border transition duration-300 ${bordes}`}>
      <input
        id={id}
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={texto}
        placeholder={placeholder}
        onBlur={onBlur}
        onChange={(e) => {
          const digitos = e.target.value.replace(/\D/g, '').slice(0, 12);
          onChange(digitos === '' ? null : Number(digitos));
        }}
        className="flex-1 min-w-0 py-3 bg-transparent outline-none text-sm text-ink placeholder:text-[#c0c0c0]"
      />
      {sufijo && <span className="text-xs text-muted whitespace-nowrap">{sufijo}</span>}
    </div>
  );
}

/**
 * plan: null para crear, o el plan a editar (con distribuidoras[].uso para avisar si una cuota nueva
 * queda por debajo de lo que ya usa una distribuidora). onGuardar(datos) es async y lanza el error de axios.
 */
export default function ModalPlan({ abierto, plan, onGuardar, onCerrar }) {
  if (!abierto) return null;
  return <ContenidoModal key={plan?.id ?? 'nuevo'} plan={plan} onGuardar={onGuardar} onCerrar={onCerrar} />;
}

function ContenidoModal({ plan, onGuardar, onCerrar }) {
  const editando = Boolean(plan);
  const [cerrando, setCerrando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');

  const {
    register, control, handleSubmit, setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: editando
      ? Object.fromEntries(Object.keys(VACIO).map((k) => [k, plan[k] ?? VACIO[k]]))
      : VACIO,
  });

  const valores = useWatch({ control });

  const cerrar = () => {
    if (cerrando || isSubmitting) return;
    setCerrando(true);
    setTimeout(onCerrar, 200);
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') cerrar(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Distribuidoras del plan que ya superan una cuota nueva más baja.
  const asignadas = plan?.distribuidoras ?? [];
  const excesos = CUOTAS.flatMap((c) => {
    const limite = valores?.[c.campo];
    if (limite === null || limite === undefined || Number.isNaN(limite)) return [];
    return asignadas
      .filter((d) => d.estado !== 'INACTIVO' && Number(d.uso?.[c.uso] ?? 0) > limite)
      .map((d) => ({ c, d, usado: Number(d.uso[c.uso]), limite }));
  });
  const camposConExceso = new Set(excesos.map((x) => x.c.campo));

  const onSubmit = async (datos) => {
    setErrorGeneral('');
    try {
      await onGuardar({
        ...datos,
        nombre: datos.nombre.trim(),
        descripcion: (datos.descripcion ?? '').trim(),
      });
      setCerrando(true);
      setTimeout(onCerrar, 200);
    } catch (err) {
      const status = err?.response?.status;
      const campo = err?.response?.data?.campo;
      const msg = mensajeError(err, 'No se pudo guardar el plan. Intenta de nuevo.');
      if (status === 409 && (campo === 'nombre' || /nombre/i.test(msg))) {
        setError('nombre', { type: 'server', message: msg }, { shouldFocus: true });
      } else if (status === 400 && campo && campo in VACIO) {
        setError(campo, { type: 'server', message: msg }, { shouldFocus: true });
      } else {
        setErrorGeneral(msg);
      }
    }
  };

  const lbl = 'text-xs font-semibold text-faint uppercase tracking-wider block mb-1.5';
  const errMsg = 'text-xs text-error-fg mt-1 animate-slide-down';
  const inputTexto = (error) => `w-full px-4 py-3 border rounded-xl text-sm outline-none transition duration-300 text-ink placeholder:text-[#c0c0c0] ${
    error
      ? 'border-danger ring-2 ring-danger/20 bg-error-bg'
      : 'bg-surface border-transparent focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20'
  }`;

  const nombres = asignadas.map((d) => d.nombreComercial);

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-start justify-center p-4 sm:pt-14 bg-black/40 backdrop-blur-sm overflow-y-auto ${cerrando ? 'animate-fade-out' : 'animate-fade-in'}`}
      onClick={cerrar}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-plan"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-[640px] bg-white rounded-[20px] border border-border shadow-[0_24px_60px_rgba(0,0,0,0.25)] ${cerrando ? 'animate-scale-out' : 'animate-scale-in'}`}
      >
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4 px-7 pt-6">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-0.5">
              Planes / {editando ? 'Editar' : 'Nuevo'}
            </p>
            <h2 id="titulo-modal-plan" className="font-display text-xl font-extrabold text-ink truncate">
              {editando ? `Editar plan ${plan.nombre}` : 'Nuevo plan'}
            </h2>
            <p className="text-[13px] text-muted mt-1">
              {!editando
                ? 'Define el precio y las cuotas. Después podrás asignarlo desde el detalle de cada distribuidora.'
                : nombres.length === 0
                  ? 'Ninguna distribuidora tiene este plan todavía.'
                  : `Aplica a ${nombres.length} distribuidora${nombres.length !== 1 ? 's' : ''}: ${listaNombres(nombres)}.`}
            </p>
          </div>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-[10px] flex items-center justify-center text-muted bg-surface hover:bg-border transition duration-300 active:scale-90 shrink-0"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="px-7 pt-5">
          <div className="flex items-center gap-2 mb-3.5">
            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
            <span className="text-xs font-bold text-ink uppercase tracking-widest">Datos del plan</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <div className="mb-4">
              <label htmlFor="plan-nombre" className={lbl}>Nombre del plan <span className="text-primary">*</span></label>
              <input id="plan-nombre" placeholder="Ej. Estándar" className={inputTexto(errors.nombre)} {...register('nombre')} />
              {errors.nombre
                ? <p className={errMsg}>{errors.nombre.message}</p>
                : <p className="text-xs text-muted mt-1.5">Máximo 30 caracteres.</p>}
            </div>
            <div className="mb-4">
              <label htmlFor="plan-precio" className={lbl}>Precio mensual <span className="text-primary">*</span></label>
              <Controller
                control={control}
                name="precioMensual"
                render={({ field }) => (
                  <InputNumero
                    id="plan-precio"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    placeholder="289.000"
                    sufijo="COP / mes"
                    estado={errors.precioMensual ? 'error' : 'normal'}
                  />
                )}
              />
              {errors.precioMensual && <p className={errMsg}>{errors.precioMensual.message}</p>}
            </div>
          </div>
          <div className="mb-4">
            <label htmlFor="plan-descripcion" className={lbl}>Descripción</label>
            <input id="plan-descripcion" placeholder="Ej. Plan intermedio" className={inputTexto(errors.descripcion)} {...register('descripcion')} />
            {errors.descripcion && <p className={errMsg}>{errors.descripcion.message}</p>}
          </div>

          <div className="flex items-center gap-2 mt-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
            <span className="text-xs font-bold text-ink uppercase tracking-widest">Cuotas operativas</span>
          </div>
          <p className="text-xs text-muted mb-3.5">Deja un campo vacío para no poner límite.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            {CUOTAS.map((c) => {
              const valor = valores?.[c.campo];
              const antes = plan?.[c.campo];
              const cambio = editando && (valor ?? null) !== (antes ?? null);
              const error = errors[c.campo];
              let ayuda = AYUDA[c.campo];
              if (c.campo === 'maxAlmacenamientoMb') {
                ayuda = valor === null || valor === undefined ? 'Sin límite de almacenamiento.' : `Equivale a ${formatoMB(valor)}.`;
              }
              if (cambio) ayuda = `Antes: ${textoCuota(antes, c.mb)}.${c.campo === 'maxAlmacenamientoMb' && valor != null ? ` Ahora ${formatoMB(valor)}.` : ''}`;
              return (
                <div key={c.campo} className="mb-4">
                  <label htmlFor={`plan-${c.campo}`} className={lbl}>{ETIQUETA[c.campo]}</label>
                  <Controller
                    control={control}
                    name={c.campo}
                    render={({ field }) => (
                      <InputNumero
                        id={`plan-${c.campo}`}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        inputRef={field.ref}
                        placeholder="Sin límite"
                        sufijo={c.mb ? 'MB' : null}
                        estado={error ? 'error' : camposConExceso.has(c.campo) ? 'warn' : 'normal'}
                      />
                    )}
                  />
                  {error
                    ? <p className={errMsg}>{error.message}</p>
                    : <p className="text-xs text-muted mt-1.5">{ayuda}</p>}
                </div>
              );
            })}
          </div>

          {excesos.length > 0 && (
            <div className="flex flex-col gap-2 mb-1 animate-slide-down">
              {excesos.map(({ c, d, usado, limite }) => (
                <div key={`${c.campo}-${d.id}`} className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-[13px] text-amber-800 leading-relaxed">
                  <span className="shrink-0 mt-0.5 text-amber-600"><AlertIcon /></span>
                  <p>{avisoExceso(c, d.nombreComercial, usado, limite)}</p>
                </div>
              ))}
            </div>
          )}

          {errorGeneral && (
            <div className="mt-2 px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm animate-slide-down">
              {errorGeneral}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-7 pt-5 pb-6">
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <ShieldIcon size={14} />
            {editando ? 'El cambio queda en el log de auditoría.' : 'La creación queda en el log de auditoría.'}
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={cerrar}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-surface text-ink text-sm font-semibold hover:bg-border transition duration-300 active:scale-[0.97] disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition duration-300 active:scale-[0.97] shadow-[0_2px_8px_rgba(158,32,22,0.25)] disabled:opacity-60"
            >
              <ContenidoCarga cargando={isSubmitting} textoCargando="Guardando...">
                {editando ? 'Guardar cambios' : 'Crear plan'}
              </ContenidoCarga>
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
}
