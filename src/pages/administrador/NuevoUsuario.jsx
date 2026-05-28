import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { crearUsuario } from '../../services/usuariosService';
import api from '../../api/axiosConfig';
import SuccessToast from '../../components/SuccessToast';

/* ── Icons ── */
function PersonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

/* ── Shared styles ── */
const inputBase =
  'w-full px-4 py-3 border rounded-xl text-sm outline-none transition duration-300 bg-white text-ink placeholder:text-[#c0c0c0]';
const inputNormal = 'border-divider focus:border-primary focus:ring-2 focus:ring-primary/20';
const inputError  = 'border-danger ring-2 ring-danger/20 bg-error-bg';
const lbl         = 'text-xs font-semibold text-faint uppercase tracking-wider block mb-1.5';
const errMsg      = 'text-xs text-error-fg mt-1 animate-slide-down';

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
      <span className="text-xs font-bold text-ink uppercase tracking-widest">{children}</span>
    </div>
  );
}

const ROLES = [
  {
    value: 'ENCARGADO_INVENTARIO',
    label: 'Inventarios',
    description: 'Gestión de activos, control de stock y auditoría de almacén.',
    icon: <BoxIcon />,
  },
  {
    value: 'ENCARGADO_VENTAS',
    label: 'Ventas / Comercialización',
    description: 'Gestión de clientes, cierre de tratos y reportes comerciales.',
    icon: <TrendIcon />,
  },
];

export default function NuevoUsuario() {
  const navigate = useNavigate();
  const [rolSeleccionado, setRolSeleccionado] = useState('ENCARGADO_INVENTARIO');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [rolError, setRolError] = useState('');
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const fileRef = useRef(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ defaultValues: { nombre: '', correo: '', contrasena: '' } });

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleRolClick = (value) => {
    setRolSeleccionado(value);
    setRolError('');
  };

  const onSubmit = async (data) => {
    if (!rolSeleccionado) {
      setRolError('Selecciona un rol para continuar.');
      return;
    }
    setEnviando(true);
    try {
      if (foto) {
        const fd = new FormData();
        fd.append('nombre', data.nombre);
        fd.append('correo', data.correo);
        fd.append('contrasenaTemporal', data.contrasena);
        fd.append('rol', rolSeleccionado);
        fd.append('foto', foto);
        await api.post('/api/usuarios', fd);
      } else {
        await crearUsuario({
          nombre: data.nombre,
          correo: data.correo,
          contrasenaTemporal: data.contrasena,
          rol: rolSeleccionado,
        });
      }
      setToast({ show: true, msg: 'Usuario creado correctamente.', type: 'success' });
    } catch (err) {
      const data = err?.response?.data;
      const msg =
        (typeof data === 'string' ? data : undefined) ??
        data?.mensaje ??
        data?.message ??
        data?.error ??
        data?.detail ??
        data?.descripcion ??
        '';
      const lower = msg.toLowerCase();
      if (lower.includes('correo') || lower.includes('email') || lower.includes('duplicado')) {
        setError('correo', { message: msg || 'El correo ya está en uso.' });
      }
      setToast({ show: true, msg: msg || 'Error al crear el usuario. Intenta de nuevo.', type: 'error' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in-up">

        <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
          <PersonIcon />
          <span>Administración de Usuarios</span>
        </div>

        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink tracking-tight">
            Registrar Nuevo Usuario
          </h1>
          <p className="text-sm text-muted mt-1">
            Asigne credenciales y roles para el nuevo personal dentro del ecosistema GELOX.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-6">
              <SectionTitle>Información Personal</SectionTitle>

              <div className="flex flex-col gap-5">
                <div>
                  <label htmlFor="nombre" className={lbl}>Nombre Completo</label>
                  <input
                    id="nombre"
                    type="text"
                    placeholder="Ej. Juan Pérez García"
                    className={`${inputBase} ${errors.nombre ? inputError : inputNormal}`}
                    {...register('nombre', {
                      required: 'El nombre es requerido.',
                      minLength: { value: 3, message: 'Mínimo 3 caracteres.' },
                    })}
                  />
                  {errors.nombre && <p className={errMsg}>{errors.nombre.message}</p>}
                </div>

                <div>
                  <label htmlFor="correo" className={lbl}>Correo Electrónico</label>
                  <input
                    id="correo"
                    type="email"
                    placeholder="usuario@gelox.com"
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
                      placeholder="Mínimo 8 caracteres"
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
                  {errors.contrasena && <p className={errMsg}>{errors.contrasena.message}</p>}
                  <p className="text-xs text-muted mt-1.5">
                    El usuario deberá cambiar esta contraseña en su primer inicio de sesión.
                  </p>
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
                      {fotoPreview ? 'Cambiar Archivo' : 'Subir Archivo'}
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
              <div className="bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-6 flex-1">
                <SectionTitle>Asignación de Rol</SectionTitle>

                <div className="flex flex-col gap-3">
                  {ROLES.map((rol) => {
                    const activo = rolSeleccionado === rol.value;
                    return (
                      <button
                        key={rol.value}
                        type="button"
                        onClick={() => handleRolClick(rol.value)}
                        className={`w-full text-left flex items-start gap-4 px-4 py-4 rounded-xl border-2 transition duration-200 ${
                          activo
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-white hover:border-divider hover:bg-surface'
                        }`}
                      >
                        <span className={`mt-0.5 shrink-0 ${activo ? 'text-primary' : 'text-faint'}`}>
                          {rol.icon}
                        </span>
                        <div>
                          <p className={`text-sm font-semibold ${activo ? 'text-primary' : 'text-ink'}`}>
                            {rol.label}
                          </p>
                          <p className="text-xs text-muted mt-0.5 leading-relaxed">
                            {rol.description}
                          </p>
                        </div>
                        <span
                          className={`ml-auto mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                            activo ? 'border-primary' : 'border-divider'
                          }`}
                        >
                          {activo && <span className="w-2 h-2 rounded-full bg-primary block" />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {rolError && <p className={`${errMsg} mt-2`}>{rolError}</p>}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition duration-300 active:scale-[0.97] shadow-[0_2px_8px_rgba(158,32,22,0.25)] disabled:opacity-60"
                >
                  {enviando ? (
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
                  className="w-full text-center text-sm text-primary font-medium hover:underline transition duration-200 py-1"
                >
                  Cancelar
                </button>
              </div>
            </div>

          </div>
        </form>

      </div>

      <SuccessToast
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
