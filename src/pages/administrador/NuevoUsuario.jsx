// src/pages/administrador/NuevoUsuario.jsx — RF62: el Gerente crea un usuario de Ventas o Inventarios de su distribuidora
import { useState, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import SuccessToast from '../../components/SuccessToast';
import RolIcono from '../../components/administrador/RolIcono';
import {
  ROLES_INTERNOS, ROLES_PERMITIDOS, esErrorDeCorreo, esErrorDeRol, mensajeError,
} from '../../components/administrador/usuariosUtils';
import { useIdentidad } from '../../context/IdentidadContext';
import { crearUsuario } from '../../services/usuariosService';

/* ── Icons ── */
function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
const card        = 'bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-6';

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
      <span className="text-xs font-bold text-ink uppercase tracking-widest">{children}</span>
    </div>
  );
}

export default function NuevoUsuario() {
  const navigate = useNavigate();
  const { identidad } = useIdentidad();
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const fileRef = useRef(null);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: { nombre: '', correo: '', contrasena: '', rol: 'ENCARGADO_VENTAS' },
  });

  const rolSeleccionado = useWatch({ control, name: 'rol' });

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (data) => {
    try {
      if (foto) {
        const fd = new FormData();
        fd.append('nombre', data.nombre);
        fd.append('correo', data.correo);
        fd.append('contrasenaTemporal', data.contrasena);
        fd.append('rol', data.rol);
        fd.append('foto', foto);
        await crearUsuario(fd);
      } else {
        await crearUsuario({
          nombre: data.nombre,
          correo: data.correo,
          contrasenaTemporal: data.contrasena,
          rol: data.rol,
        });
      }
      setToast({ show: true, msg: 'Usuario creado correctamente.', type: 'success' });
    } catch (err) {
      const msg = mensajeError(err, 'Error al crear el usuario. Intenta de nuevo.');
      if (esErrorDeRol(err)) {
        setError('rol', { type: 'server', message: msg });
      } else if (esErrorDeCorreo(err)) {
        setError('correo', { type: 'server', message: msg }, { shouldFocus: true });
      }
      setToast({ show: true, msg, type: 'error' });
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in-up">

        <div>
          <Link
            to="/usuarios"
            className="inline-flex items-center gap-1 text-primary text-xs font-semibold uppercase tracking-wider hover:underline"
          >
            <ChevronLeftIcon />
            Usuarios / Nuevo
          </Link>
          <h1 className="font-display text-2xl font-extrabold text-ink tracking-tight mt-2">
            Añadir Nuevo Usuario
          </h1>
          <p className="text-sm text-muted mt-1">
            Crea la cuenta de un integrante de tu equipo. Podrá iniciar sesión con la contraseña temporal y cambiarla después.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

            {/* Datos del usuario */}
            <div className={card}>
              <SectionTitle>Datos del usuario</SectionTitle>

              <div className="flex flex-col gap-5">
                <div>
                  <label htmlFor="nombre" className={lbl}>Nombre Completo</label>
                  <input
                    id="nombre"
                    type="text"
                    placeholder="Ej. Laura Gómez"
                    className={`${inputBase} ${errors.nombre ? inputError : inputNormal}`}
                    {...register('nombre', {
                      required: 'El nombre es requerido.',
                      validate: (v) => v.trim().length >= 3 || 'Mínimo 3 caracteres.',
                    })}
                  />
                  {errors.nombre && <p className={errMsg}>{errors.nombre.message}</p>}
                </div>

                <div>
                  <label htmlFor="correo" className={lbl}>Correo Electrónico</label>
                  <input
                    id="correo"
                    type="email"
                    autoComplete="off"
                    placeholder="nombre@correo.com"
                    className={`${inputBase} ${errors.correo ? inputError : inputNormal}`}
                    {...register('correo', {
                      required: 'El correo es requerido.',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Formato de correo inválido.',
                      },
                    })}
                  />
                  {errors.correo && <p className={errMsg}>{errors.correo.message}</p>}
                </div>

                <div>
                  <label htmlFor="contrasena" className={lbl}>Contraseña Temporal</label>
                  <div className="relative">
                    <input
                      id="contrasena"
                      type={mostrarPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••••••"
                      className={`${inputBase} pr-11 ${errors.contrasena ? inputError : inputNormal}`}
                      {...register('contrasena', {
                        required: 'La contraseña es requerida.',
                        minLength: { value: 8, message: 'Mínimo 8 caracteres.' },
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink transition duration-200"
                      aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {mostrarPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {errors.contrasena
                    ? <p className={errMsg}>{errors.contrasena.message}</p>
                    : <p className="text-xs text-muted mt-1.5">Mínimo 8 caracteres.</p>}
                </div>

                <div>
                  <label className={lbl}>
                    Fotografía del Perfil <span className="normal-case font-normal text-muted">(opcional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-divider rounded-xl text-faint hover:border-primary hover:text-primary transition duration-300"
                  >
                    {fotoPreview ? (
                      <img
                        src={fotoPreview}
                        alt="Vista previa"
                        className="w-16 h-16 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <CameraIcon />
                    )}
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {fotoPreview ? 'Cambiar fotografía' : 'Subir fotografía'}
                    </span>
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFotoChange}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Rol de acceso: solo Ventas e Inventarios (RF62) */}
              <fieldset className={card}>
                <legend className="sr-only">Rol de acceso</legend>
                <SectionTitle>Rol de acceso</SectionTitle>

                <div className="flex flex-col gap-3">
                  {ROLES_INTERNOS.map((rol) => {
                    const activo = rolSeleccionado === rol.value;
                    return (
                      <label
                        key={rol.value}
                        className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border-2 cursor-pointer transition duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/20 ${
                          errors.rol
                            ? 'border-danger/40 bg-white'
                            : activo
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-white hover:border-divider hover:bg-surface'
                        }`}
                      >
                        <input
                          type="radio"
                          value={rol.value}
                          className="sr-only"
                          {...register('rol', {
                            validate: (v) => ROLES_PERMITIDOS.includes(v) || 'Solo se permiten los roles de Ventas e Inventarios.',
                          })}
                        />
                        <span className={`mt-0.5 shrink-0 ${activo ? 'text-primary' : 'text-faint'}`}>
                          <RolIcono rol={rol.value} />
                        </span>
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold ${activo ? 'text-primary' : 'text-ink'}`}>{rol.label}</p>
                          <p className="text-xs text-muted mt-0.5 leading-relaxed">{rol.descripcion}</p>
                        </div>
                        <span
                          className={`ml-auto mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                            activo ? 'border-primary' : 'border-divider'
                          }`}
                        >
                          {activo && <span className="w-2 h-2 rounded-full bg-primary block" />}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {errors.rol
                  ? <p className={`${errMsg} mt-3`}>{errors.rol.message}</p>
                  : <p className="text-xs text-muted mt-3">El rol Gerente no se asigna desde aquí.</p>}
              </fieldset>

              {/* Distribuidora: la asigna el backend con el tenant del Gerente */}
              <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl bg-surface px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Distribuidora</p>
                  <p className="text-sm font-semibold text-ink truncate">{identidad?.nombreComercial ?? 'Tu distribuidora'}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-faint whitespace-nowrap">
                  <LockIcon />
                  Asignada automáticamente
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition duration-300 active:scale-[0.97] shadow-[0_2px_8px_rgba(158,32,22,0.25)] disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Creando Usuario...
                    </>
                  ) : (
                    'Crear Usuario'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/usuarios')}
                  disabled={isSubmitting}
                  className="w-fit mx-auto text-sm text-primary font-medium underline underline-offset-2 hover:text-primary-dark transition duration-200 py-1 disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </div>

          </div>
        </form>

      </div>

      {/* La key monta un aviso nuevo por mensaje: SuccessToast conserva el onClose con el que se abrió. */}
      <SuccessToast
        key={`${toast.type}-${toast.msg}`}
        message={toast.msg}
        show={toast.show}
        onClose={() => {
          setToast(t => ({ ...t, show: false }));
          if (toast.type === 'success') navigate('/usuarios');
        }}
        duration={1500}
        type={toast.type}
      />
    </AppLayout>
  );
}
