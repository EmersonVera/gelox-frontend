import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../auth/firebase';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';

const schema = yup.object({
  correo: yup.string().email('Formato de correo inválido').required('El correo es requerido'),
  contrasena: yup.string().required('La contraseña es requerida'),
});

const ROLE_REDIRECT = {
  ADMINISTRADOR:        '/dashboard/gerente',
  ENCARGADO_INVENTARIO: '/inventarios/gestion',
  ENCARGADO_VENTAS:     '/dashboard/ventas',
};

function EnvelopeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

const inputBase =
  'w-full py-3 border rounded-xl text-sm outline-none transition duration-300 bg-white text-ink placeholder:text-[#c0c0c0]';
const inputNormal = 'border-divider focus:border-primary focus:ring-2 focus:ring-primary/20';
const inputError  = 'border-danger ring-2 ring-danger/20 bg-error-bg';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');
  const navigate = useNavigate();
  const { usuario, rol, cargando } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) });

  /**
   * Guard reactivo: navega cuando AuthContext confirma que usuario Y rol
   * están listos. Esto cubre dos casos:
   *   1. El usuario acaba de hacer login (onAuthStateChanged ya resolvió).
   *   2. El usuario ya tenía sesión activa y navegó al /login directamente.
   * Al delegar la navegación aquí — en lugar de hacerla desde onSubmit —
   * se elimina la race condition que causaba que ProtectedRoute viera
   * usuario=null y redirigiera de vuelta a /login.
   */
  useEffect(() => {
    if (!cargando && usuario && rol) {
      navigate(ROLE_REDIRECT[rol] ?? '/dashboard/gerente', { replace: true });
    }
  }, [cargando, usuario, rol, navigate]);

  // Oculta la UI solo cuando NO hay un envío en curso.
  // Si loading=true el formulario debe quedarse visible ("Iniciando sesión…")
  // para que el botón de carga no desaparezca de golpe cuando cargando pase
  // a true tras el onAuthStateChanged.
  if (!loading && (cargando || usuario)) {
    return <div className="min-h-screen bg-[#EBEBEB]" />;
  }

  const onSubmit = async ({ correo, contrasena }) => {
    setLoading(true);
    setErrorGeneral('');
    try {
      const credencial = await signInWithEmailAndPassword(auth, correo, contrasena);
      const token = await credencial.user.getIdToken();
      // Notificar al backend para que registre la sesión.
      // La navegación la maneja el useEffect de arriba cuando
      // AuthContext confirme usuario + rol — no navegamos aquí.
      await api.post(
        '/api/auth/verificar',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      const code = err?.code ?? '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setErrorGeneral('Correo o contraseña incorrectos');
      } else if (err?.response?.data?.mensaje) {
        setErrorGeneral(err.response.data.mensaje);
      } else {
        setErrorGeneral('Error al iniciar sesión, intente de nuevo');
      }
      // Solo resetear loading en error; en éxito el componente se desmonta
      // cuando el useEffect navega al dashboard.
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#EBEBEB] relative overflow-hidden">
      {/* Decorative background circles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-[480px] h-[480px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-80 h-80 rounded-full bg-primary-tint/40 blur-3xl" />
      </div>

      <main className="flex flex-col items-center justify-center flex-1 px-4 py-12 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 text-center animate-fade-in-up">
          <div className="text-4xl mb-2 leading-none">✳</div>
          <h1 className="font-display text-3xl font-extrabold text-primary tracking-tight">GELOX</h1>
          <p className="text-sm text-muted mt-1">Gestión Distribuidora</p>
        </div>

        {/* Form card */}
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] p-8 animate-fade-in-up [animation-delay:80ms]">
          {errorGeneral && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm animate-slide-down">
              {errorGeneral}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            {/* Correo */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="correo" className="text-xs font-semibold text-faint uppercase tracking-wider">
                Correo Electrónico
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                  <EnvelopeIcon />
                </span>
                <input
                  id="correo"
                  type="email"
                  autoComplete="email"
                  placeholder="ejemplo@gelox.com"
                  className={`${inputBase} pl-10 pr-4 ${errors.correo ? inputError : inputNormal}`}
                  {...register('correo')}
                />
              </div>
              {errors.correo && (
                <p className="text-xs text-error-fg animate-slide-down">{errors.correo.message}</p>
              )}
            </div>

            {/* Contraseña */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contrasena" className="text-xs font-semibold text-faint uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                  <LockIcon />
                </span>
                <input
                  id="contrasena"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`${inputBase} pl-10 pr-12 ${errors.contrasena ? inputError : inputNormal}`}
                  {...register('contrasena')}
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink hover:scale-110 transition duration-300"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.contrasena && (
                <p className="text-xs text-error-fg animate-slide-down">{errors.contrasena.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition duration-300 active:scale-[0.97] disabled:opacity-60 shadow-[0_2px_8px_rgba(158,32,22,0.25)]"
            >
              {loading && (
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              )}
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión →'}
            </button>
          </form>

          <Link
            to="/recuperar-contrasena"
            className="block text-center text-sm text-muted hover:text-primary mt-5 transition duration-300"
          >
            Olvidé mi contraseña
          </Link>
        </div>
      </main>

      <footer className="relative z-10 text-center text-xs text-muted py-4 animate-fade-in [animation-delay:200ms]">
        © 2026 GELOX Logistics Group • Todos los derechos reservados
      </footer>
    </div>
  );
}
