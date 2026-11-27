// src/components/inventarios/FormProveedor.jsx — alta y edición de un proveedor comercial
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import ContenidoCarga from '../ui/ContenidoCarga';
import {
  crearProveedor, actualizarProveedor, cambiarEstadoProveedor,
} from '../../services/proveedoresService';
import { calcularDV, formatoNitSinDV, soloDigitos, mensajeError, formatoFechaLarga } from './proveedoresUtils';

const schema = yup.object({
  nombreComercial:  yup.string().trim().required('El nombre comercial es obligatorio'),
  nit:              yup.string()
    .transform((v) => soloDigitos(v))
    .required('El NIT es obligatorio')
    .matches(/^\d{6,10}$/, 'El NIT debe tener entre 6 y 10 dígitos, sin el DV'),
  contactoNombre:   yup.string().trim(),
  contactoTelefono: yup.string().trim()
    .test('telefono', 'Teléfono no válido', (v) => !v || /^\d{7,10}$/.test(soloDigitos(v))),
  contactoCorreo:   yup.string().trim().email('Correo no válido'),
  tiempoEntregaDias: yup.number().typeError('Ingresa un número')
    .integer('Debe ser un número entero').min(0, 'No puede ser negativo').max(60, 'Máximo 60 días')
    .required('El tiempo de entrega es obligatorio'),
  montoMinimo:      yup.number().typeError('Ingresa un número').min(0, 'No puede ser negativo')
    .required('El monto mínimo es obligatorio'),
  activo:           yup.boolean(),
});

const VACIO = {
  nombreComercial: '', nit: '', contactoNombre: '', contactoTelefono: '',
  contactoCorreo: '', tiempoEntregaDias: 3, montoMinimo: 0, activo: true,
};

const valoresDe = (p) => (p ? {
  nombreComercial:   p.nombreComercial ?? '',
  nit:               formatoNitSinDV(p.nit),
  contactoNombre:    p.contactoNombre ?? '',
  contactoTelefono:  p.contactoTelefono ?? '',
  contactoCorreo:    p.contactoCorreo ?? '',
  tiempoEntregaDias: p.tiempoEntregaDias ?? 0,
  montoMinimo:       p.montoMinimo ?? 0,
  activo:            p.activo !== false,
} : VACIO);

const labelClass   = 'block text-xs font-semibold text-ink mb-1.5';
const inputClass   = 'w-full px-3.5 py-2.5 border border-border rounded-xl text-sm bg-white text-ink outline-none transition duration-200 placeholder:text-[#c0c0c0] focus:border-primary focus:ring-2 focus:ring-primary/20';
const inputError   = 'border-[#dc2626] focus:border-[#dc2626] focus:ring-[#dc2626]/20';
const errorClass   = 'text-[11px] text-[#dc2626] mt-1';
const ayudaClass   = 'text-[11px] text-muted mt-1';
const seccionClass = 'text-[10px] font-bold uppercase tracking-widest text-muted';

/**
 * proveedor: null → alta; objeto → edición.
 * onGuardado(proveedor, mensaje) se llama con el proveedor ya persistido.
 */
export default function FormProveedor({ proveedor, onCancelar, onGuardado }) {
  const esEdicion = !!proveedor;
  const [guardando, setGuardando] = useState(false);
  const [errorApi, setErrorApi] = useState('');

  const {
    register, handleSubmit, control, reset, setError, watch, setValue,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema), defaultValues: valoresDe(proveedor) });

  useEffect(() => {
    reset(valoresDe(proveedor));
    setErrorApi('');
  }, [proveedor, reset]);

  const nit = watch('nit');
  const dv = calcularDV(nit);

  const onSubmit = async (datos) => {
    setGuardando(true);
    setErrorApi('');
    const { activo, ...resto } = datos;
    const cuerpo = {
      ...resto,
      nit: soloDigitos(resto.nit),
      contactoTelefono: soloDigitos(resto.contactoTelefono),
      tiempoEntregaDias: Number(resto.tiempoEntregaDias),
      montoMinimo: Number(resto.montoMinimo),
    };
    try {
      let guardado;
      if (esEdicion) {
        guardado = await actualizarProveedor(proveedor.id, cuerpo);
        if (activo !== (proveedor.activo !== false)) {
          guardado = await cambiarEstadoProveedor(proveedor.id, activo);
        }
      } else {
        guardado = await crearProveedor({ ...cuerpo, activo });
      }
      onGuardado(guardado, esEdicion
        ? `Proveedor «${guardado.nombreComercial}» actualizado.`
        : `Proveedor «${guardado.nombreComercial}» registrado.`);
    } catch (err) {
      const status = err?.response?.status;
      const msg = mensajeError(err, 'No se pudo guardar el proveedor. Intenta de nuevo.');
      if (status === 409 && (err.response.data?.campo === 'nit' || /nit/i.test(msg))) {
        setError('nit', { message: msg });
      } else {
        setErrorApi(msg);
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07)] flex flex-col animate-fade-in-up"
    >
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-border">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-ink">
            {esEdicion ? 'Editar proveedor' : 'Nuevo proveedor'}
          </h2>
          <p className="text-xs text-muted mt-0.5 truncate">
            {esEdicion
              ? `${proveedor.nombreComercial} · creado el ${formatoFechaLarga(proveedor.createdAt)}`
              : 'Datos de la empresa y condiciones de pedido'}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancelar}
          aria-label="Cerrar"
          className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:bg-surface hover:text-ink transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>

      <div className="px-6 py-5 flex flex-col gap-4">
        {/* Datos de la empresa */}
        <p className={seccionClass}>Datos de la empresa</p>
        <div>
          <label className={labelClass}>Nombre comercial *</label>
          <input {...register('nombreComercial')} placeholder="Ej. Colombina" className={`${inputClass} ${errors.nombreComercial ? inputError : ''}`} />
          {errors.nombreComercial && <p className={errorClass}>{errors.nombreComercial.message}</p>}
        </div>
        <div>
          <label className={labelClass}>NIT *</label>
          <div className="relative">
            <input
              {...register('nit', {
                onChange: (e) => setValue('nit', formatoNitSinDV(e.target.value.slice(0, 13))),
              })}
              inputMode="numeric"
              placeholder="890301884"
              className={`${inputClass} font-mono pr-16 ${errors.nit ? inputError : ''}`}
            />
            {dv && (
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted font-mono">DV {dv}</span>
            )}
          </div>
          {errors.nit
            ? <p className={errorClass}>{errors.nit.message}</p>
            : <p className={ayudaClass}>Sin puntos ni dígito: el sistema da formato automáticamente.</p>}
        </div>

        {/* Contacto comercial */}
        <p className={`${seccionClass} pt-2`}>Contacto comercial</p>
        <div>
          <label className={labelClass}>Nombre del contacto</label>
          <input {...register('contactoNombre')} placeholder="Ej. Andrés Ruiz" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Teléfono</label>
          <input {...register('contactoTelefono')} inputMode="tel" placeholder="315 482 1190" className={`${inputClass} ${errors.contactoTelefono ? inputError : ''}`} />
          {errors.contactoTelefono && <p className={errorClass}>{errors.contactoTelefono.message}</p>}
        </div>
        <div>
          <label className={labelClass}>Correo</label>
          <input {...register('contactoCorreo')} type="email" placeholder="pedidos@proveedor.com" className={`${inputClass} ${errors.contactoCorreo ? inputError : ''}`} />
          {errors.contactoCorreo && <p className={errorClass}>{errors.contactoCorreo.message}</p>}
        </div>

        {/* Condiciones de pedido */}
        <p className={`${seccionClass} pt-2`}>Condiciones de pedido</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Tiempo de entrega *</label>
            <Controller
              control={control}
              name="tiempoEntregaDias"
              render={({ field }) => {
                const n = Number(field.value) || 0;
                return (
                  <div className={`flex items-center border rounded-xl bg-white ${errors.tiempoEntregaDias ? 'border-[#dc2626]' : 'border-border'}`}>
                    <button type="button" onClick={() => field.onChange(Math.max(0, n - 1))} className="w-9 h-10 text-muted hover:text-ink" aria-label="Menos días">−</button>
                    <input
                      value={field.value}
                      onChange={(e) => field.onChange(soloDigitos(e.target.value))}
                      inputMode="numeric"
                      className="flex-1 min-w-0 text-center text-sm font-semibold text-ink outline-none bg-transparent"
                    />
                    <button type="button" onClick={() => field.onChange(Math.min(60, n + 1))} className="w-9 h-10 text-primary hover:text-primary-dark" aria-label="Más días">+</button>
                  </div>
                );
              }}
            />
            {errors.tiempoEntregaDias
              ? <p className={errorClass}>{errors.tiempoEntregaDias.message}</p>
              : <p className={ayudaClass}>Días hábiles</p>}
          </div>
          <div>
            <label className={labelClass}>Monto mínimo de pedido *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
              <input
                {...register('montoMinimo')}
                type="number"
                min="0"
                step="1000"
                className={`${inputClass} pl-7 ${errors.montoMinimo ? inputError : ''}`}
              />
            </div>
            {errors.montoMinimo
              ? <p className={errorClass}>{errors.montoMinimo.message}</p>
              : <p className={ayudaClass}>Valor mínimo en COP</p>}
          </div>
        </div>

        {/* Activo */}
        <Controller
          control={control}
          name="activo"
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4 bg-surface rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">Proveedor activo</p>
                <p className="text-[11px] text-muted mt-0.5">
                  Si lo desactivas no aparecerá al generar pedidos ni al asignar productos.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={field.value}
                onClick={() => field.onChange(!field.value)}
                className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${field.value ? 'bg-primary' : 'bg-[#d6d3d1]'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${field.value ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          )}
        />

        {errorApi && (
          <div className="px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm">{errorApi}</div>
        )}
      </div>

      {/* Pie */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
        <button
          type="button"
          onClick={onCancelar}
          className="px-4 py-2.5 text-sm font-semibold text-ink border border-border rounded-xl hover:bg-surface transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition active:scale-[0.97] shadow-[0_2px_8px_rgba(158,32,22,0.25)] disabled:opacity-60"
        >
          <ContenidoCarga cargando={guardando} textoCargando="Guardando...">
            {esEdicion ? 'Guardar cambios' : 'Registrar proveedor'}
          </ContenidoCarga>
        </button>
      </div>
    </form>
  );
}
