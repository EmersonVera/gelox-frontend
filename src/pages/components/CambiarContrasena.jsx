import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../context/AuthContext';
import { cambiarContrasena } from '../../services/perfilService';

/* ── Icons ── */
function KeyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="M21 2l-9.6 9.6" />
      <path d="M15.5 7.5l3 3L22 7l-3-3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

/* ── Schema ── */
const schema = yup.object({
  contrasenaActual: yup.string().required('La contraseña actual es requerida'),
  nuevaContrasena: yup
    .string()
    .required('La nueva contraseña es requerida')
    .min(8, 'Mínimo 8 caracteres'),
  confirmacionContrasena: yup
    .string()
    .required('Confirme la nueva contraseña')
    .oneOf([yup.ref('nuevaContrasena')], 'Las contraseñas no coinciden'),
});

const inputBase =
  'w-full px-4 pr-12 py-3 border rounded-xl text-sm outline-none transition duration-300 bg-white text-ink placeholder:text-[#c0c0c0]';
const inputNormal = 'border-divider focus:border-primary focus:ring-2 focus:ring-primary/20';
const inputErr    = 'border-danger ring-2 ring-danger/20 bg-error-bg';

/* ── Component ── */
export default function CambiarContrasena({ open, onClose }) {
  const { perfil, usuario } = useAuth();

  const [showActual,       setShowActual]       = useState(false);
  const [showNueva,        setShowNueva]        = useState(false);
  const [showConfirmacion, setShowConfirmacion] = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [errorGeneral,     setErrorGeneral]     = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) });

  if (!open) return null;

  const handleClose = () => {
    reset();
    setErrorGeneral('');
    onClose();
  };

  const onSubmit = async ({ contrasenaActual, nuevaContrasena, confirmacionContrasena }) => {
    setSaving(true);
    setErrorGeneral('');
    try {
      await cambiarContrasena(usuario.uid, { contrasenaActual, nuevaContrasena, confirmacion: confirmacionContrasena });
      reset();
      handleClose();
    } catch (err) {
      const status  = err?.response?.status;
      const mensaje = err?.response?.data?.mensaje ?? '';
      if (
        status === 400 &&
        (mensaje.toLowerCase().includes('actual') ||
          mensaje.toLowerCase().includes('incorrecta') ||
          mensaje.toLowerCase().includes('current'))
      ) {
        setError('contrasenaActual', { message: mensaje || 'La contraseña actual es incorrecta' });
      } else if (mensaje) {
        setErrorGeneral(mensaje);
      } else {
        setErrorGeneral('Error al cambiar la contraseña. Intente de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  const PasswordField = ({ id, label, show, setShow, fieldName, autoComplete }) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-faint uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder="••••••••"
          className={`${inputBase} ${errors[fieldName] ? inputErr : inputNormal}`}
          {...register(fieldName)}
        />
        <button
          type="button"
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink hover:scale-110 transition duration-300"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Ocultar' : 'Mostrar'}
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {errors[fieldName] && (
        <p className="text-xs text-error-fg animate-slide-down">{errors[fieldName].message}</p>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/45 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] p-7 sm:p-8 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon badge */}
        <div className="w-12 h-12 rounded-2xl bg-primary-tint text-primary flex items-center justify-center mx-auto mb-4">
          <KeyIcon />
        </div>

        <h2 className="font-display text-xl font-bold text-ink text-center mb-1">
          Cambiar Contraseña
        </h2>
        <p className="text-sm text-muted text-center mb-5 leading-relaxed">
          Por seguridad, te recomendamos usar una combinación de letras,
          números y símbolos.
        </p>

        {errorGeneral && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm animate-slide-down">
            {errorGeneral}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <PasswordField
            id="contrasenaActual"
            label="Contraseña Actual"
            show={showActual}
            setShow={setShowActual}
            fieldName="contrasenaActual"
            autoComplete="current-password"
          />
          <PasswordField
            id="nuevaContrasena"
            label="Nueva Contraseña"
            show={showNueva}
            setShow={setShowNueva}
            fieldName="nuevaContrasena"
            autoComplete="new-password"
          />
          <PasswordField
            id="confirmacionContrasena"
            label="Confirmar Nueva Contraseña"
            show={showConfirmacion}
            setShow={setShowConfirmacion}
            fieldName="confirmacionContrasena"
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition duration-300 active:scale-[0.97] disabled:opacity-60 shadow-[0_2px_8px_rgba(158,32,22,0.25)] mt-1"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Actualizando...
              </>
            ) : (
              <>
                Actualizar Contraseña
                <CheckCircleIcon />
              </>
            )}
          </button>

          <button
            type="button"
            className="w-full py-2.5 bg-border text-ink text-sm font-medium rounded-xl hover:bg-divider transition duration-300 active:scale-[0.97]"
            onClick={handleClose}
          >
            Cancelar
          </button>
        </form>
      </div>
    </div>
  );
}
