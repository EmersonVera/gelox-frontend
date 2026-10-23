// src/pages/plataforma/NuevaDistribuidora.jsx — RF58: registrar (aprovisionar) una distribuidora
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import AppLayout from '../../components/AppLayout';
import SuccessToast from '../../components/SuccessToast';
import ModalConfirmacion from '../../components/plataforma/ModalConfirmacion';
import {
  PLANES, SUBDOMINIO_REGEX, mensajeError, sugerirSubdominio, urlTienda,
} from '../../components/plataforma/plataformaUtils';
import { crearDistribuidora, listarDistribuidoras, reenviarAcceso } from '../../services/plataformaService';

const schema = yup.object({
  razonSocial: yup.string().trim()
    .required('La razón social es obligatoria.')
    .max(150, 'Máximo 150 caracteres.'),
  nit: yup.string().trim()
    .required('El NIT es obligatorio.')
    .max(20, 'Máximo 20 caracteres.')
    .matches(/^\d{1,3}(\.?\d{3}){2,3}-\d$/, 'Escribe el NIT con su dígito de verificación, ej. 901.552.047-9.'),
  nombreComercial: yup.string().trim()
    .required('El nombre comercial es obligatorio.')
    .max(100, 'Máximo 100 caracteres.'),
  subdominio: yup.string().trim()
    .required('El subdominio es obligatorio.')
    .matches(SUBDOMINIO_REGEX, 'Entre 3 y 30 caracteres: solo letras minúsculas, números y guiones.'),
  nombreGerente: yup.string().trim()
    .required('El nombre del gerente titular es obligatorio.')
    .min(3, 'Mínimo 3 caracteres.'),
  correoGerente: yup.string().trim()
    .required('El correo del gerente titular es obligatorio.')
    .email('Formato de correo inválido.')
    .max(150, 'Máximo 150 caracteres.'),
  telefono: yup.string().trim()
    .required('El teléfono es obligatorio.')
    .matches(/^\+?[\d\s()-]{7,20}$/, 'Escribe un teléfono válido, ej. +57 315 284 6120.'),
  direccion: yup.string().trim()
    .required('La dirección es obligatoria.')
    .max(200, 'Máximo 200 caracteres.'),
  plan: yup.string()
    .required('Selecciona un plan.')
    .oneOf(PLANES.map((p) => p.value), 'Selecciona un plan.'),
});

/** Campo del formulario que corresponde a un 409 del backend (NIT, subdominio o correo repetido). */
function campoDuplicado(data) {
  if (data?.campo) return data.campo;
  const msg = String(data?.error ?? data?.mensaje ?? data?.message ?? '').toLowerCase();
  if (msg.includes('nit')) return 'nit';
  if (msg.includes('subdominio')) return 'subdominio';
  if (msg.includes('correo') || msg.includes('email')) return 'correoGerente';
  return null;
}

/* ── Icons ── */
function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function MailAlertIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

/* ── Shared styles ── */
const inputBase =
  'w-full px-4 py-3 border rounded-xl text-sm outline-none transition duration-300 text-ink placeholder:text-[#c0c0c0]';
const inputNormal = 'bg-surface border-transparent focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20';
const inputError  = 'border-danger ring-2 ring-danger/20 bg-error-bg';
const lbl         = 'text-xs font-semibold text-faint uppercase tracking-wider block mb-1.5';
const errMsg      = 'text-xs text-error-fg mt-1 animate-slide-down';
const ayuda       = 'text-xs text-muted mt-1.5';
const card        = 'bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-6';

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
      <span className="text-xs font-bold text-ink uppercase tracking-widest">{children}</span>
    </div>
  );
}

function Campo({ id, label, error, children, hint }) {
  return (
    <div>
      <label htmlFor={id} className={lbl}>{label}</label>
      {children}
      {error ? <p className={errMsg}>{error.message}</p> : hint && <p className={ayuda}>{hint}</p>}
    </div>
  );
}

export default function NuevaDistribuidora() {
  const navigate = useNavigate();
  const [existentes, setExistentes] = useState(null); // subdominios ya registrados, para la vista previa
  const [creada, setCreada] = useState(null);         // distribuidora creada con correoEnviado = false
  const [toast, setToast] = useState({ show: false, msg: '', type: 'error' });
  const subdominioEditado = useRef(false);
  const accesoReenviado = useRef(false);

  const {
    register, handleSubmit, setValue, setError, setFocus, control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      razonSocial: '', nit: '', nombreComercial: '', subdominio: '',
      nombreGerente: '', correoGerente: '', telefono: '', direccion: '', plan: 'BASICO',
    },
  });

  // Solo para avisar «Disponible / En uso» antes de enviar; el backend responde 409 de todas formas.
  useEffect(() => {
    let vivo = true;
    listarDistribuidoras()
      .then((lista) => { if (vivo) setExistentes(new Set(lista.map((d) => d.subdominio))); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  const subdominio = useWatch({ control, name: 'subdominio' });
  const plan = useWatch({ control, name: 'plan' });
  const formatoValido = SUBDOMINIO_REGEX.test(subdominio ?? '');
  const enUso = formatoValido && existentes?.has(subdominio);

  // Mientras no se edite a mano, el subdominio se sugiere a partir del nombre comercial.
  const registroNombre = register('nombreComercial');
  const onNombreChange = (e) => {
    registroNombre.onChange(e);
    if (!subdominioEditado.current) {
      setValue('subdominio', sugerirSubdominio(e.target.value), { shouldValidate: !!errors.subdominio });
    }
  };

  const registroSubdominio = register('subdominio');
  const onSubdominioChange = (e) => {
    e.target.value = e.target.value.toLowerCase().replace(/\s+/g, '-');
    subdominioEditado.current = e.target.value !== '';
    registroSubdominio.onChange(e);
  };

  const irAlDetalle = (d, state) => navigate(`/plataforma/distribuidoras/${d.id}`, { state });

  const onSubmit = async (datos) => {
    if (enUso) {
      setError('subdominio', { type: 'server', message: 'El subdominio ya está en uso.' }, { shouldFocus: true });
      return;
    }
    try {
      const resultado = await crearDistribuidora(datos);
      if (resultado.correoEnviado === false) {
        setCreada(resultado);
      } else {
        irAlDetalle(resultado, { aviso: `Distribuidora registrada. Enviamos el acceso a ${resultado.correoGerente ?? datos.correoGerente}.` });
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) {
        const campo = campoDuplicado(err.response.data);
        const msg = mensajeError(err, 'Este dato ya está registrado.');
        if (campo) {
          setError(campo, { type: 'server', message: msg });
          setFocus(campo);
        }
        setToast({ show: true, msg, type: 'error' });
      } else if (status === 502) {
        setToast({ show: true, msg: mensajeError(err, 'No se pudo crear la cuenta del gerente. No se guardó ningún dato; intenta de nuevo.'), type: 'error' });
      } else {
        setToast({ show: true, msg: mensajeError(err, 'No se pudo registrar la distribuidora. Intenta de nuevo.'), type: 'error' });
      }
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto flex flex-col gap-6 animate-fade-in-up">

        <div>
          <Link
            to="/plataforma/distribuidoras"
            className="inline-flex items-center gap-1 text-primary text-xs font-semibold uppercase tracking-wider hover:underline"
          >
            <ChevronLeftIcon />
            Distribuidoras / Nueva
          </Link>
          <h1 className="font-display text-2xl font-extrabold text-ink tracking-tight mt-2">
            Registrar distribuidora
          </h1>
          <p className="text-sm text-muted mt-1">
            Completa los datos comerciales, el contacto del gerente titular y el plan. Todos los campos son obligatorios.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Datos comerciales */}
            <div className={card}>
              <SectionTitle>Datos comerciales</SectionTitle>
              <div className="flex flex-col gap-5">
                <Campo id="razonSocial" label="Razón social" error={errors.razonSocial}>
                  <input
                    id="razonSocial"
                    type="text"
                    placeholder="Ej. Frío Express Distribuciones S.A.S."
                    className={`${inputBase} ${errors.razonSocial ? inputError : inputNormal}`}
                    {...register('razonSocial')}
                  />
                </Campo>

                <Campo id="nit" label="NIT" error={errors.nit} hint="Incluye el dígito de verificación después del guion.">
                  <input
                    id="nit"
                    type="text"
                    inputMode="numeric"
                    placeholder="901.552.047-9"
                    className={`${inputBase} ${errors.nit ? inputError : inputNormal}`}
                    {...register('nit')}
                  />
                </Campo>

                <Campo id="nombreComercial" label="Nombre comercial" error={errors.nombreComercial}>
                  <input
                    id="nombreComercial"
                    type="text"
                    placeholder="Ej. Frío Express Cúcuta"
                    className={`${inputBase} ${errors.nombreComercial ? inputError : inputNormal}`}
                    {...registroNombre}
                    onChange={onNombreChange}
                  />
                </Campo>

                <div>
                  <Campo
                    id="subdominio"
                    label="Subdominio"
                    error={errors.subdominio}
                    hint="Solo letras minúsculas, números y guiones. Se sugiere a partir del nombre comercial."
                  >
                    <input
                      id="subdominio"
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={30}
                      placeholder="frio-express"
                      className={`${inputBase} font-mono ${errors.subdominio ? inputError : inputNormal}`}
                      {...registroSubdominio}
                      onChange={onSubdominioChange}
                    />
                  </Campo>

                  <div className="mt-3 rounded-xl border border-dashed border-divider bg-canvas px-4 py-3">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Vista previa de la URL</p>
                    <p className="font-mono text-xs text-faint mt-1 break-all">
                      {urlTienda('')}
                      <span className="font-bold text-primary">{subdominio || 'subdominio'}</span>
                    </p>
                    {formatoValido && existentes && (
                      <span
                        className={`inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold animate-fade-in ${
                          enUso ? 'bg-error-bg text-error-fg' : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {!enUso && <CheckIcon />}
                        {enUso ? 'En uso por otra distribuidora' : 'Disponible'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Gerente titular y contacto */}
            <div className={`${card} self-start w-full`}>
              <SectionTitle>Gerente titular y contacto</SectionTitle>
              <div className="flex flex-col gap-5">
                <Campo id="nombreGerente" label="Nombre del gerente titular" error={errors.nombreGerente}>
                  <input
                    id="nombreGerente"
                    type="text"
                    placeholder="Ej. Luis Fernando Contreras"
                    className={`${inputBase} ${errors.nombreGerente ? inputError : inputNormal}`}
                    {...register('nombreGerente')}
                  />
                </Campo>

                <Campo
                  id="correoGerente"
                  label="Correo del gerente titular"
                  error={errors.correoGerente}
                  hint="Con este correo el gerente inicia sesión en su distribuidora."
                >
                  <input
                    id="correoGerente"
                    type="email"
                    autoComplete="off"
                    placeholder="gerencia@distribuidora.co"
                    className={`${inputBase} ${errors.correoGerente ? inputError : inputNormal}`}
                    {...register('correoGerente')}
                  />
                </Campo>

                <Campo id="telefono" label="Teléfono" error={errors.telefono}>
                  <input
                    id="telefono"
                    type="tel"
                    placeholder="+57 315 284 6120"
                    className={`${inputBase} ${errors.telefono ? inputError : inputNormal}`}
                    {...register('telefono')}
                  />
                </Campo>

                <Campo id="direccion" label="Dirección" error={errors.direccion}>
                  <input
                    id="direccion"
                    type="text"
                    placeholder="Av. 7 # 12-45, La Playa, Cúcuta"
                    className={`${inputBase} ${errors.direccion ? inputError : inputNormal}`}
                    {...register('direccion')}
                  />
                </Campo>
              </div>
            </div>
          </div>

          {/* Plan */}
          <fieldset className={card}>
            <legend className="sr-only">Plan de suscripción</legend>
            <SectionTitle>Plan de suscripción</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PLANES.map((p) => {
                const activo = plan === p.value;
                return (
                  <label
                    key={p.value}
                    className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border-2 cursor-pointer transition duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/20 ${
                      activo ? 'border-primary bg-primary/5' : 'border-border bg-white hover:border-divider hover:bg-surface'
                    }`}
                  >
                    <input type="radio" value={p.value} className="sr-only" {...register('plan')} />
                    <div>
                      <p className={`text-sm font-semibold ${activo ? 'text-primary' : 'text-ink'}`}>{p.label}</p>
                      <p className="text-xs text-muted mt-0.5">{p.descripcion}</p>
                    </div>
                    <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${activo ? 'border-primary' : 'border-divider'}`}>
                      {activo && <span className="w-2 h-2 rounded-full bg-primary block" />}
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.plan && <p className={`${errMsg} mt-2`}>{errors.plan.message}</p>}
          </fieldset>

          {/* Aviso */}
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-surface text-sm text-faint">
            <span className="text-primary shrink-0 mt-0.5"><LockIcon /></span>
            <p>
              Al registrar, el sistema asigna a la distribuidora un <strong className="text-ink">identificador único que no se puede modificar</strong>,
              crea su configuración inicial y la deja en estado <strong className="text-ink">En periodo de prueba</strong>.
            </p>
          </div>

          {/* Acciones */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/plataforma/distribuidoras')}
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
              {isSubmitting && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
              {isSubmitting ? 'Registrando...' : 'Registrar distribuidora'}
            </button>
          </div>
        </form>
      </div>

      {/* Creada, pero el correo al gerente no se envió (correoEnviado = false) */}
      <ModalConfirmacion
        abierto={!!creada}
        tono="warning"
        icono={<MailAlertIcon />}
        titulo="Distribuidora registrada, pero el correo no se envió"
        textoConfirmar="Reenviar acceso"
        textoProcesando="Reenviando..."
        textoCancelar="Ver distribuidora"
        onConfirmar={async () => {
          await reenviarAcceso(creada.id);
          accesoReenviado.current = true;
        }}
        onCerrar={() => irAlDetalle(creada, accesoReenviado.current
          ? { aviso: `Acceso reenviado a ${creada.correoGerente}.` }
          : { correoPendiente: true })}
      >
        <strong className="text-ink">{creada?.nombreComercial}</strong> quedó en periodo de prueba, pero no se pudo
        enviar el correo de acceso a <strong className="text-ink">{creada?.correoGerente}</strong>.
        Reenvíalo ahora o más tarde desde el detalle de la distribuidora.
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
