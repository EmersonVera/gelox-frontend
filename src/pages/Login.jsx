import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../auth/firebase';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/login.module.css';

const schema = yup.object({
  correo: yup.string().email('Formato de correo inválido').required('El correo es requerido'),
  contrasena: yup.string().required('La contraseña es requerida'),
});

const ROLE_REDIRECT = {
  ADMINISTRADOR: '/dashboard/gerente',
  ENCARGADO_INVENTARIO: '/dashboard/inventario',
  ENCARGADO_VENTAS: '/dashboard/ventas',
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

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');
  const { setPerfil } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async ({ correo, contrasena }) => {
    setLoading(true);
    setErrorGeneral('');
    try {
      const credencial = await signInWithEmailAndPassword(auth, correo, contrasena);
      const token = await credencial.user.getIdToken();
      const { data: perfil } = await api.post(
        '/api/auth/verificar',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPerfil(perfil);
      localStorage.setItem('gelox_perfil', JSON.stringify(perfil));
      const destino = ROLE_REDIRECT[perfil.rol] ?? '/login';
      navigate(destino, { replace: true });
    } catch (err) {
      const code = err?.code ?? '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setErrorGeneral('Correo o contraseña incorrectos');
      } else if (err?.response?.data?.mensaje) {
        setErrorGeneral(err.response.data.mensaje);
      } else {
        setErrorGeneral('Error al iniciar sesión, intente de nuevo');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.bg}>
        <div className={styles.bgCircle1} />
        <div className={styles.bgCircle2} />
        <div className={styles.bgCircle3} />
      </div>

      <main className={styles.main}>
        {/* Logo FUERA de la tarjeta */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>✳</div>
          <h1 className={styles.logoTitle}>GELOX</h1>
          <p className={styles.logoSub}>Gestión Distribuidora</p>
        </div>

        {/* Tarjeta solo con el formulario */}
        <div className={styles.card}>
          {errorGeneral && (
            <div className={styles.errorGeneral}>{errorGeneral}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="correo">Correo Electrónico</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}><EnvelopeIcon /></span>
                <input
                  id="correo"
                  type="email"
                  autoComplete="email"
                  placeholder="ejemplo@gelox.com"
                  className={`${styles.input} ${errors.correo ? styles.inputError : ''}`}
                  {...register('correo')}
                />
              </div>
              {errors.correo && <p className={styles.errorMsg}>{errors.correo.message}</p>}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="contrasena">Contraseña</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}><LockIcon /></span>
                <input
                  id="contrasena"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`${styles.input} ${errors.contrasena ? styles.inputError : ''}`}
                  style={{ paddingRight: '2.75rem' }}
                  {...register('contrasena')}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.contrasena && <p className={styles.errorMsg}>{errors.contrasena.message}</p>}
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading && <span className={styles.spinner} />}
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión →'}
            </button>
          </form>

          <Link to="/recuperar-contrasena" className={styles.forgotLink}>
            Olvidé mi contraseña
          </Link>
        </div>
      </main>

      <footer className={styles.footer}>
        © 2026 GELOX Logistics Group • Todos los derechos reservados
      </footer>
    </div>
  );
}
