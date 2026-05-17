import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../context/AuthContext';
import { cambiarContrasena } from '../../services/perfilService';
import styles from '../../styles/cambiar-contrasena.module.css';

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
  contrasenaActual: yup
    .string()
    .required('La contraseña actual es requerida'),
  nuevaContrasena: yup
    .string()
    .required('La nueva contraseña es requerida')
    .min(8, 'Mínimo 8 caracteres'),
  confirmacionContrasena: yup
    .string()
    .required('Confirme la nueva contraseña')
    .oneOf([yup.ref('nuevaContrasena')], 'Las contraseñas no coinciden'),
});

/* ── Component ── */
export default function CambiarContrasena({ open, onClose }) {
  const { perfil } = useAuth();

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
      await cambiarContrasena(perfil.id, {
        contrasenaActual,
        nuevaContrasena,
        confirmacionContrasena,
      });

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
        setError('contrasenaActual', {
          message: mensaje || 'La contraseña actual es incorrecta',
        });
      } else if (mensaje) {
        setErrorGeneral(mensaje);
      } else {
        setErrorGeneral('Error al cambiar la contraseña. Intente de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ── */
  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* Icon */}
        <div className={styles.iconBadge}>
          <KeyIcon />
        </div>

        {/* Heading */}
        <h2 className={styles.title}>Cambiar Contraseña</h2>
        <p className={styles.subtitle}>
          Por seguridad, te recomendamos usar una combinación de letras,
          números y símbolos.
        </p>

        {/* Error banner */}
        {errorGeneral && (
          <div className={styles.errorBanner}>{errorGeneral}</div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className={styles.fields}>

            {/* Contraseña actual */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="contrasenaActual">
                Contraseña Actual
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="contrasenaActual"
                  type={showActual ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`${styles.input} ${errors.contrasenaActual ? styles.inputError : ''}`}
                  {...register('contrasenaActual')}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowActual((v) => !v)}
                  aria-label={showActual ? 'Ocultar' : 'Mostrar'}
                >
                  {showActual ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.contrasenaActual && (
                <p className={styles.errorMsg}>{errors.contrasenaActual.message}</p>
              )}
            </div>

            {/* Nueva contraseña */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="nuevaContrasena">
                Nueva Contraseña
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="nuevaContrasena"
                  type={showNueva ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={`${styles.input} ${errors.nuevaContrasena ? styles.inputError : ''}`}
                  {...register('nuevaContrasena')}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowNueva((v) => !v)}
                  aria-label={showNueva ? 'Ocultar' : 'Mostrar'}
                >
                  {showNueva ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.nuevaContrasena && (
                <p className={styles.errorMsg}>{errors.nuevaContrasena.message}</p>
              )}
            </div>

            {/* Confirmar nueva contraseña */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="confirmacionContrasena">
                Confirmar Nueva Contraseña
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="confirmacionContrasena"
                  type={showConfirmacion ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={`${styles.input} ${errors.confirmacionContrasena ? styles.inputError : ''}`}
                  {...register('confirmacionContrasena')}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowConfirmacion((v) => !v)}
                  aria-label={showConfirmacion ? 'Ocultar' : 'Mostrar'}
                >
                  {showConfirmacion ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.confirmacionContrasena && (
                <p className={styles.errorMsg}>{errors.confirmacionContrasena.message}</p>
              )}
            </div>

          </div>

          {/* Submit */}
          <button type="submit" className={styles.btnSubmit} disabled={saving}>
            {saving ? (
              <>
                <span className={styles.spinner} />
                Actualizando...
              </>
            ) : (
              <>
                Actualizar Contraseña
                <CheckCircleIcon />
              </>
            )}
          </button>

          {/* Cancel */}
          <button type="button" className={styles.btnCancelar} onClick={handleClose}>
            Cancelar
          </button>
        </form>

      </div>
    </div>
  );
}
