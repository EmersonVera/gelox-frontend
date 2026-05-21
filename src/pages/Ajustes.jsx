import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import AppLayout from '../components/AppLayout';
import CambiarContrasena from './components/CambiarContrasena';
import { useAuth } from '../context/AuthContext';
import {
  updatePerfil as updatePerfilAPI,
  updateFotoPerfil,
} from '../services/perfilService';

/* ── Icons ── */
function CameraIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
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

/* ── Helpers ── */
const CARGO_LABEL = {
  ADMINISTRADOR:        'Gerente General',
  ENCARGADO_INVENTARIO: 'Encargado de Inventario',
  ENCARGADO_VENTAS:     'Encargado de Ventas',
};

function getInitials(nombre) {
  if (!nombre) return '?';
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/* ── Validation schema ── */
const schema = yup.object({
  nombre: yup.string().required('El nombre es requerido').min(2, 'Mínimo 2 caracteres'),
  correo: yup.string().email('Formato de correo inválido').required('El correo es requerido'),
  telefono: yup
    .string()
    .required('El teléfono es requerido')
    .matches(/^\+?[\d\s\-().]{7,20}$/, 'Formato de teléfono inválido'),
});

/* ── Shared class strings ── */
const card = 'bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] p-6';
const lbl  = 'text-xs font-semibold text-faint uppercase tracking-wider block mb-1.5';
const inputBase   = 'w-full px-4 py-3 border rounded-xl text-sm outline-none transition duration-300 bg-white text-ink placeholder:text-[#c0c0c0]';
const inputNormal = 'border-divider focus:border-primary focus:ring-2 focus:ring-primary/20';
const inputError  = 'border-danger ring-2 ring-danger/20 bg-error-bg';
const errMsg      = 'text-xs text-error-fg mt-1 animate-slide-down';

/* ── Component ── */
export default function Ajustes() {
  const { perfil, usuario, updatePerfil: updatePerfilCtx } = useAuth();

  const [modalContrasena, setModalContrasena] = useState(false);
  const [fotoPreview, setFotoPreview]   = useState(perfil?.foto_url ?? null);
  const [fotoLoading, setFotoLoading]   = useState(false);
  const [fotoError,   setFotoError]     = useState('');
  const [successMsg,  setSuccessMsg]    = useState('');
  const [errorGeneral, setErrorGeneral] = useState('');
  const [saving, setSaving]             = useState(false);

  const fileRef = useRef(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      nombre:   perfil?.nombre   ?? '',
      correo:   perfil?.correo   ?? usuario?.email ?? '',
      telefono: perfil?.telefono ?? '',
    },
  });

  /* Sincronizar el formulario cuando el perfil cargue o cambie */
  useEffect(() => {
    if (perfil) {
      reset({
        nombre:   perfil.nombre   ?? '',
        correo:   perfil.correo   ?? usuario?.email ?? '',
        telefono: perfil.telefono ?? '',
      });
    }
  }, [perfil, usuario, reset]);

  /* ── Photo handlers ── */
  const handleFotoClick = () => fileRef.current?.click();

  const handleFotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFotoError('Solo se permiten archivos de imagen');
      return;
    }
    setFotoError('');
    const reader = new FileReader();
    reader.onload = (ev) => setFotoPreview(ev.target.result);
    reader.readAsDataURL(file);
    setFotoLoading(true);
    try {
      const { data } = await updateFotoPerfil(perfil.id, file);
      const newUrl = data?.foto_url ?? fotoPreview;
      setFotoPreview(newUrl);
      updatePerfilCtx({ foto_url: newUrl });
    } catch {
      setFotoError('Error al subir la foto. Intente de nuevo.');
    } finally {
      setFotoLoading(false);
      e.target.value = '';
    }
  };

  /* ── Form submit ── */
  const onSubmit = async ({ nombre, correo, telefono }) => {
    setSaving(true);
    setSuccessMsg('');
    setErrorGeneral('');
    try {
      const { data } = await updatePerfilAPI(perfil.id, { nombre, correo, telefono });
      updatePerfilCtx({
        nombre:   data?.nombre   ?? nombre,
        correo:   data?.correo   ?? correo,
        telefono: data?.telefono ?? telefono,
      });
      setSuccessMsg('Cambios guardados correctamente.');
    } catch (err) {
      const status  = err?.response?.status;
      const mensaje = err?.response?.data?.mensaje ?? '';
      if (
        status === 409 ||
        mensaje.toLowerCase().includes('correo') ||
        mensaje.toLowerCase().includes('email')
      ) {
        setError('correo', { message: mensaje || 'Este correo ya está registrado en el sistema.' });
      } else {
        setErrorGeneral(mensaje || 'Error al guardar los cambios. Intente de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  const cargo = CARGO_LABEL[perfil?.rol] ?? '';

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        {/* Page header */}
        <div className="animate-fade-in-up">
          <h1 className="font-display text-2xl font-extrabold text-ink tracking-tight">Ajustes Generales</h1>
          <p className="text-sm text-muted mt-1">
            Administra tu perfil, seguridad y preferencias de la cuenta.
          </p>
        </div>

        {/* Profile card */}
        <div className={`${card} animate-fade-in-up [animation-delay:80ms]`}>
          {successMsg && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-success-bg border border-[#6ee7b7] text-success-fg text-sm animate-slide-down">
              {successMsg}
            </div>
          )}
          {errorGeneral && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm animate-slide-down">
              {errorGeneral}
            </div>
          )}

          {/* Photo section */}
          <div className="flex items-start gap-5 mb-6 pb-6 border-b border-border">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-primary-tint flex items-center justify-center transition duration-300 hover:opacity-90">
                {fotoPreview ? (
                  <img src={fotoPreview} alt={perfil?.nombre} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary text-xl font-bold">{getInitials(perfil?.nombre)}</span>
                )}
              </div>
              {fotoLoading && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                </div>
              )}
              <button
                type="button"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark hover:scale-110 transition duration-300 active:scale-95 shadow-sm"
                onClick={handleFotoClick}
                aria-label="Cambiar foto de perfil"
              >
                <CameraIcon />
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFotoChange}
            />
            <div className="pt-1">
              <p className="text-sm font-semibold text-ink">Foto de Perfil</p>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Sube una imagen clara para que tus colaboradores puedan
                identificarte fácilmente en el sistema.
              </p>
              {fotoError && <p className={errMsg}>{fotoError}</p>}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={lbl} htmlFor="nombre">Nombre Completo</label>
                <input
                  id="nombre"
                  className={`${inputBase} ${errors.nombre ? inputError : inputNormal}`}
                  placeholder="Tu nombre completo"
                  {...register('nombre')}
                />
                {errors.nombre && <p className={errMsg}>{errors.nombre.message}</p>}
              </div>

              <div>
                <label className={lbl}>Cargo</label>
                <input
                  className={`${inputBase} border-divider bg-surface text-muted cursor-not-allowed`}
                  value={cargo}
                  disabled
                  readOnly
                />
              </div>

              <div>
                <label className={lbl} htmlFor="correo">Correo Electrónico</label>
                <input
                  id="correo"
                  type="email"
                  autoComplete="email"
                  className={`${inputBase} ${errors.correo ? inputError : inputNormal}`}
                  placeholder="correo@ejemplo.com"
                  {...register('correo')}
                />
                {errors.correo && <p className={errMsg}>{errors.correo.message}</p>}
              </div>

              <div>
                <label className={lbl} htmlFor="telefono">Teléfono Móvil</label>
                <input
                  id="telefono"
                  type="tel"
                  className={`${inputBase} ${errors.telefono ? inputError : inputNormal}`}
                  placeholder="+57 312 456 7890"
                  {...register('telefono')}
                />
                {errors.telefono && <p className={errMsg}>{errors.telefono.message}</p>}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition duration-300 active:scale-[0.97] shadow-[0_2px_8px_rgba(158,32,22,0.25)] disabled:opacity-60"
              >
                {saving && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>

        {/* Security card */}
        <div className={`${card} animate-fade-in-up [animation-delay:160ms]`}>
          <div className="flex items-center gap-2.5 text-sm font-semibold text-ink mb-5 pb-4 border-b border-border">
            <span className="w-8 h-8 rounded-full bg-primary-tint text-primary flex items-center justify-center shrink-0">
              <ShieldIcon />
            </span>
            Seguridad de la Cuenta
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-border flex items-center justify-center text-faint shrink-0">
              <LockIcon />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-ink">Contraseña</div>
              <div className="text-xs text-muted">última actualización: hace 3 meses</div>
            </div>
            <button
              type="button"
              className="px-4 py-2 bg-border text-ink text-sm font-medium rounded-xl hover:bg-divider transition duration-300 active:scale-[0.97]"
              onClick={() => setModalContrasena(true)}
            >
              Cambiar Contraseña
            </button>
          </div>
        </div>
      </div>

      <CambiarContrasena
        open={modalContrasena}
        onClose={() => setModalContrasena(false)}
      />
    </AppLayout>
  );
}
