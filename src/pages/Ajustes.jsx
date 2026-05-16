import { useState, useRef } from 'react';
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
import styles from '../styles/ajustes.module.css';

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
  nombre: yup
    .string()
    .required('El nombre es requerido')
    .min(2, 'Mínimo 2 caracteres'),
  correo: yup
    .string()
    .email('Formato de correo inválido')
    .required('El correo es requerido'),
  telefono: yup
    .string()
    .required('El teléfono es requerido')
    .matches(/^\+?[\d\s\-().]{7,20}$/, 'Formato de teléfono inválido'),
});

/* ── Component ── */
export default function Ajustes() {
  const { perfil, updatePerfil: updatePerfilCtx } = useAuth();

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
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      nombre:   perfil?.nombre   ?? '',
      correo:   perfil?.correo   ?? '',
      telefono: perfil?.telefono ?? '',
    },
  });

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
        setError('correo', {
          message: mensaje || 'Este correo ya está registrado en el sistema.',
        });
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
      <div className={styles.page}>
        {/* ── Page header ── */}
        <div className={styles.header}>
          <h1 className={styles.title}>Ajustes Generales</h1>
          <p className={styles.subtitle}>
            Administra tu perfil, seguridad y preferencias de la cuenta.
          </p>
        </div>

        {/* ── Profile card ── */}
        <div className={styles.card}>
          {successMsg  && <div className={styles.successBanner}>{successMsg}</div>}
          {errorGeneral && <div className={styles.errorBanner}>{errorGeneral}</div>}

          {/* Photo */}
          <div className={styles.photoSection}>
            <div className={styles.avatarWrapper}>
              {fotoPreview ? (
                <img
                  src={fotoPreview}
                  alt={perfil?.nombre}
                  className={styles.avatarImg}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {getInitials(perfil?.nombre)}
                </div>
              )}

              {fotoLoading && (
                <div className={styles.photoLoadingOverlay}>
                  <span className={styles.spinnerLight} />
                </div>
              )}

              <button
                type="button"
                className={styles.cameraBtn}
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
              style={{ display: 'none' }}
              onChange={handleFotoChange}
            />

            <div className={styles.photoInfo}>
              <p className={styles.photoTitle}>Foto de Perfil</p>
              <p className={styles.photoDesc}>
                Sube una imagen clara para que tus colaboradores puedan
                identificarte fácilmente en el sistema.
              </p>
              {fotoError && (
                <p className={styles.errorMsg} style={{ marginTop: '0.375rem' }}>
                  {fotoError}
                </p>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className={styles.formGrid}>

              {/* Nombre Completo */}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="nombre">
                  Nombre Completo
                </label>
                <input
                  id="nombre"
                  className={`${styles.input} ${errors.nombre ? styles.inputError : ''}`}
                  placeholder="Tu nombre completo"
                  {...register('nombre')}
                />
                {errors.nombre && (
                  <p className={styles.errorMsg}>{errors.nombre.message}</p>
                )}
              </div>

              {/* Cargo (read-only) */}
              <div className={styles.field}>
                <label className={styles.label}>Cargo</label>
                <input
                  className={styles.input}
                  value={cargo}
                  disabled
                  readOnly
                />
              </div>

              {/* Correo */}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="correo">
                  Correo Electrónico
                </label>
                <input
                  id="correo"
                  type="email"
                  autoComplete="email"
                  className={`${styles.input} ${errors.correo ? styles.inputError : ''}`}
                  placeholder="correo@ejemplo.com"
                  {...register('correo')}
                />
                {errors.correo && (
                  <p className={styles.errorMsg}>{errors.correo.message}</p>
                )}
              </div>

              {/* Teléfono */}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="telefono">
                  Teléfono Móvil
                </label>
                <input
                  id="telefono"
                  type="tel"
                  className={`${styles.input} ${errors.telefono ? styles.inputError : ''}`}
                  placeholder="+57 312 456 7890"
                  {...register('telefono')}
                />
                {errors.telefono && (
                  <p className={styles.errorMsg}>{errors.telefono.message}</p>
                )}
              </div>

            </div>

            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className={styles.spinner} />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ── Security card ── */}
        <div className={styles.card}>
          <div className={styles.securityHeader}>
            <span className={styles.securityHeaderIcon}>
              <ShieldIcon />
            </span>
            Seguridad de la Cuenta
          </div>

          <div className={styles.securityRow}>
            <div className={styles.securityIconBox}>
              <LockIcon />
            </div>
            <div className={styles.securityLabel}>
              <div className={styles.securityLabelTitle}>Contraseña</div>
              <div className={styles.securityLabelSub}>
                última actualización: hace 3 meses
              </div>
            </div>
            <button
              type="button"
              className={styles.linkCrimson}
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
