import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import api from '../api/axiosConfig';
import { deshabilitarUsuario, habilitarUsuario } from '../services/usuariosService';

/* ── Icons ── */
function ArrowLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function BanIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

/* ── Helpers ── */
function getInitials(nombre) {
  if (!nombre) return '?';
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/* ── Shared styles ── */
const inputBase =
  'w-full px-4 py-3 border rounded-xl text-sm outline-none transition duration-300 bg-white text-ink placeholder:text-[#c0c0c0]';
const inputNormal = 'border-divider focus:border-primary focus:ring-2 focus:ring-primary/20';
const inputError  = 'border-danger ring-2 ring-danger/20 bg-error-bg';
const lbl         = 'text-xs font-semibold text-faint uppercase tracking-wider block mb-1.5';
const errMsg      = 'text-xs text-error-fg mt-1 animate-slide-down';

const ROLES = [
  {
    value: 'ENCARGADO_INVENTARIO',
    label: 'Inventarios',
    description: 'Gestión de activos y stock de bodega.',
    icon: <BoxIcon />,
  },
  {
    value: 'ENCARGADO_VENTAS',
    label: 'Ventas',
    description: 'Operaciones comerciales y clientes.',
    icon: <TagIcon />,
  },
];

/* ── Section card header ── */
function CardHeader({ icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <span className="text-primary mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-sm font-bold text-ink">{title}</p>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function EditarUsuario() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const location  = useLocation();
  const usuario   = location.state ?? {};

  const rolInicial =
    usuario.rol === 'ENCARGADO_INVENTARIO' || usuario.rol === 'ENCARGADO_VENTAS'
      ? usuario.rol
      : 'ENCARGADO_INVENTARIO';

  /* Estado actual del usuario: deshabilitado si habilitado === false */
  const estaDeshabilitado = usuario.habilitado === false || usuario.activo === false;

  const [rolSeleccionado, setRolSeleccionado] = useState(rolInicial);
  const [foto, setFoto]                       = useState(null);
  const [fotoPreview, setFotoPreview]         = useState(usuario.foto_url ?? null);
  const [errorServidor, setErrorServidor]     = useState('');
  const [guardando, setGuardando]             = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const fileRef = useRef(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      nombre:  usuario.nombre  ?? '',
      correo:  usuario.correo  ?? '',
    },
  });

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (data) => {
    setErrorServidor('');
    setGuardando(true);
    try {
      if (foto) {
        const fd = new FormData();
        fd.append('nombre', data.nombre);
        fd.append('correo', data.correo);
        fd.append('rol', rolSeleccionado);
        fd.append('foto', foto);
        await api.put(`/api/usuarios/${id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.put(`/api/usuarios/${id}`, {
          nombre: data.nombre,
          correo: data.correo,
          rol:    rolSeleccionado,
        });
      }
      navigate('/usuarios');
    } catch (err) {
      const msg = err?.response?.data?.mensaje ?? err?.response?.data?.message ?? '';
      const lower = msg.toLowerCase();
      if (lower.includes('correo') || lower.includes('email') || lower.includes('duplicado')) {
        setError('correo', { message: msg || 'El correo ya está en uso.' });
      } else {
        setErrorServidor(msg || 'Error al guardar los cambios. Intenta de nuevo.');
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarEstado = async () => {
    const accion = estaDeshabilitado ? 'habilitar' : 'deshabilitar';
    const confirmar = window.confirm(
      estaDeshabilitado
        ? `¿Deseas habilitar a ${usuario.nombre ?? 'este usuario'}? Recuperará acceso al sistema.`
        : `¿Deseas deshabilitar a ${usuario.nombre ?? 'este usuario'}? Se revocarán todos sus accesos.`
    );
    if (!confirmar) return;
    setCambiandoEstado(true);
    setErrorServidor('');
    try {
      if (estaDeshabilitado) {
        await habilitarUsuario(id);
      } else {
        await deshabilitarUsuario(id);
      }
      navigate('/usuarios');
    } catch (err) {
      const msg = err?.response?.data?.mensaje ?? err?.response?.data?.message ?? '';
      setErrorServidor(msg || `Error al ${accion} el usuario. Intenta de nuevo.`);
    } finally {
      setCambiandoEstado(false);
    }
  };

  return (
    <AppLayout>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in-up"
      >
        {/* Breadcrumb */}
        <button
          type="button"
          onClick={() => navigate('/usuarios')}
          className="flex items-center gap-1.5 text-primary text-xs font-semibold uppercase tracking-wider w-fit hover:underline transition"
        >
          <ArrowLeftIcon />
          Todos los Usuarios
        </button>

        {/* Page header */}
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink tracking-tight">
            Gestionar Perfil de Usuario
          </h1>
          <p className="text-sm text-muted mt-1">
            Edite las credenciales de acceso, los permisos de rol y la configuración de
            seguridad del perfil de{' '}
            <span className="font-semibold text-ink">{usuario.nombre ?? '—'}</span>.
          </p>
        </div>

        {/* Server error banner */}
        {errorServidor && (
          <div className="px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm animate-slide-down">
            {errorServidor}
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

          {/* ── Left column ── */}
          <div className="flex flex-col gap-5">

            {/* Información General */}
            <div className="bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-6">
              <CardHeader
                icon={<PersonIcon />}
                title="Información General"
                subtitle="Datos personales y de contacto"
              />

              {/* Banner de usuario deshabilitado */}
              {estaDeshabilitado && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                  Este usuario está deshabilitado. Habilítalo para poder editar su perfil.
                </div>
              )}

              <div className="flex flex-col gap-5">
                {/* Nombre */}
                <div>
                  <label htmlFor="nombre" className={lbl}>Nombre Completo</label>
                  <input
                    id="nombre"
                    type="text"
                    placeholder="Ej. Juan Pérez García"
                    disabled={estaDeshabilitado}
                    className={`${inputBase} ${
                      estaDeshabilitado
                        ? 'border-divider bg-surface text-muted cursor-not-allowed'
                        : errors.nombre ? inputError : inputNormal
                    }`}
                    {...register('nombre', {
                      required: 'El nombre es requerido.',
                      minLength: { value: 3, message: 'Mínimo 3 caracteres.' },
                    })}
                  />
                  {errors.nombre && <p className={errMsg}>{errors.nombre.message}</p>}
                </div>

                {/* Correo */}
                <div>
                  <label htmlFor="correo" className={lbl}>Correo Electrónico</label>
                  <input
                    id="correo"
                    type="email"
                    placeholder="usuario@gelox.com"
                    disabled={estaDeshabilitado}
                    className={`${inputBase} ${
                      estaDeshabilitado
                        ? 'border-divider bg-surface text-muted cursor-not-allowed'
                        : errors.correo ? inputError : inputNormal
                    }`}
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

                {/* Foto */}
                <div>
                  <label className={lbl}>
                    Fotografía del Perfil{' '}
                    <span className="normal-case font-normal text-muted">(opcional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => !estaDeshabilitado && fileRef.current?.click()}
                    disabled={estaDeshabilitado}
                    className={`w-full flex flex-col items-center justify-center gap-2 py-5 border-2 border-dashed rounded-xl transition duration-300 ${
                      estaDeshabilitado
                        ? 'border-divider text-divider cursor-not-allowed bg-surface'
                        : 'border-divider text-faint hover:border-primary hover:text-primary'
                    }`}
                  >
                    {fotoPreview ? (
                      <img
                        src={fotoPreview}
                        alt="Vista previa"
                        className="w-14 h-14 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <CameraIcon />
                    )}
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {fotoPreview ? 'Cambiar Archivo' : 'Subir Archivo'}
                    </span>
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={estaDeshabilitado ? undefined : handleFotoChange}
                  />
                </div>
              </div>
            </div>

            {/* Asignación de Rol */}
            <div className="bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-6">
              <CardHeader
                icon={<ShieldIcon />}
                title="Asignación de Rol"
                subtitle="Defina el nivel de acceso al sistema"
              />

              <div className="flex flex-col gap-3">
                {ROLES.map((rol) => {
                  const activo = rolSeleccionado === rol.value;
                  return (
                    <button
                      key={rol.value}
                      type="button"
                      onClick={() => !estaDeshabilitado && setRolSeleccionado(rol.value)}
                      disabled={estaDeshabilitado}
                      className={`w-full text-left flex items-start gap-4 px-4 py-4 rounded-xl border-2 transition duration-200 ${
                        estaDeshabilitado
                          ? 'border-border bg-surface cursor-not-allowed opacity-60'
                          : activo
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-white hover:border-divider hover:bg-surface'
                      }`}
                    >
                      <span className={`mt-0.5 shrink-0 ${activo && !estaDeshabilitado ? 'text-primary' : 'text-faint'}`}>
                        {rol.icon}
                      </span>
                      <div>
                        <p className={`text-sm font-semibold ${activo && !estaDeshabilitado ? 'text-primary' : 'text-ink'}`}>
                          {rol.label}
                        </p>
                        <p className="text-xs text-muted mt-0.5">{rol.description}</p>
                      </div>
                      <span
                        className={`ml-auto mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                          activo && !estaDeshabilitado ? 'border-primary' : 'border-divider'
                        }`}
                      >
                        {activo && !estaDeshabilitado && <span className="w-2 h-2 rounded-full bg-primary block" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-5">

            {/* Avatar card */}
            <div className="bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-6 flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-primary-tint text-primary text-xl font-bold flex items-center justify-center overflow-hidden shrink-0">
                {fotoPreview ? (
                  <img src={fotoPreview} alt={usuario.nombre} className="w-full h-full object-cover" />
                ) : (
                  getInitials(usuario.nombre)
                )}
              </div>
              <p className="text-sm font-bold text-ink text-center">{usuario.nombre ?? '—'}</p>
              <p className="text-xs text-muted text-center">{usuario.correo ?? ''}</p>
            </div>

            {/* Danger / Action zone */}
            <div className={`bg-white rounded-2xl border shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-6 ${
              estaDeshabilitado ? 'border-green-200' : 'border-[#ffb4a9]'
            }`}>
              <div className={`flex items-center gap-2 mb-3 ${estaDeshabilitado ? 'text-green-600' : 'text-danger'}`}>
                {estaDeshabilitado ? <CheckCircleIcon /> : <WarningIcon />}
                <span className="text-sm font-bold">
                  {estaDeshabilitado ? 'Zona de Acción' : 'Zona de Peligro'}
                </span>
              </div>
              <p className="text-xs text-muted leading-relaxed mb-4">
                {estaDeshabilitado
                  ? 'Al habilitar este usuario, recuperará acceso al sistema con su rol y permisos asignados.'
                  : 'Al deshabilitar este usuario, se revocarán todos sus accesos al sistema. Podrás habilitarlo nuevamente cuando lo necesites.'}
              </p>
              <button
                type="button"
                onClick={handleCambiarEstado}
                disabled={cambiandoEstado}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition duration-300 active:scale-[0.97] disabled:opacity-60 ${
                  estaDeshabilitado
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-danger hover:bg-danger-dark'
                }`}
              >
                {cambiandoEstado ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Procesando...
                  </>
                ) : estaDeshabilitado ? (
                  <>
                    <CheckCircleIcon />
                    Habilitar Usuario
                  </>
                ) : (
                  <>
                    <BanIcon />
                    Deshabilitar Usuario
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Footer de acciones ── */}
        <div className="bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07)] px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/usuarios')}
            disabled={guardando}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-border text-ink text-sm font-medium rounded-xl hover:bg-divider transition duration-300 active:scale-[0.97] disabled:opacity-60"
          >
            Descartar
          </button>
          <button
            type="submit"
            disabled={guardando || cambiandoEstado || estaDeshabilitado}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition duration-300 active:scale-[0.97] shadow-[0_2px_8px_rgba(158,32,22,0.25)] disabled:opacity-60"
            title={estaDeshabilitado ? 'Habilita el usuario para guardar cambios' : undefined}
          >
            {guardando ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <SaveIcon />
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}
