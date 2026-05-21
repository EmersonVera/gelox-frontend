import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../auth/firebase';

/* ── Icons ── */
function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

/* ── Helpers ── */
const inputBase =
  'w-full bg-surface border-0 rounded-lg py-[18px] pl-12 pr-12 text-base text-ink outline-none transition duration-300 focus:ring-2 focus:ring-primary/20 placeholder:text-muted';

/* ── Pantalla de error (link inválido / expirado / ya usado) ── */
function PantallaError({ tipo }) {
  const esExpirado = tipo === 'expired';

  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center">
      <div className="w-16 h-16 rounded-full bg-error-bg text-danger flex items-center justify-center">
        <AlertIcon />
      </div>
      <div>
        <h2 className="font-display text-xl font-bold text-ink mb-2">
          {esExpirado ? 'El enlace ha expirado' : 'Enlace ya utilizado'}
        </h2>
        <p className="text-sm text-muted leading-relaxed">
          {esExpirado
            ? 'Este enlace de restablecimiento venció. Los enlaces son válidos por 1 hora. Solicita uno nuevo y úsalo de inmediato.'
            : 'La contraseña ya fue restablecida con este enlace. Si necesitas cambiarla de nuevo, solicita un nuevo correo.'}
        </p>
      </div>
      <Link
        to="/recuperar-contrasena"
        className="flex items-center justify-center w-full py-4 bg-primary text-white font-display font-bold text-base rounded-lg hover:bg-primary-dark transition duration-300 active:scale-[0.97] shadow-[0_10px_15px_-3px_rgba(158,32,22,0.2)]"
      >
        Solicitar nuevo enlace →
      </Link>
      <Link
        to="/login"
        className="text-sm font-semibold text-primary hover:text-primary-dark transition duration-300"
      >
        ← Volver al inicio de sesión
      </Link>
    </div>
  );
}

/* ── Pantalla de éxito ── */
function PantallaExito() {
  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center">
      <div className="w-16 h-16 rounded-full bg-success-bg text-success-fg flex items-center justify-center">
        <CheckIcon />
      </div>
      <div>
        <h2 className="font-display text-xl font-bold text-ink mb-2">
          ¡Contraseña actualizada!
        </h2>
        <p className="text-sm text-muted leading-relaxed">
          Tu contraseña fue cambiada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
        </p>
      </div>
      <Link
        to="/login"
        className="flex items-center justify-center w-full py-4 bg-primary text-white font-display font-bold text-base rounded-lg hover:bg-primary-dark transition duration-300 active:scale-[0.97] shadow-[0_10px_15px_-3px_rgba(158,32,22,0.2)]"
      >
        Ir al inicio de sesión →
      </Link>
    </div>
  );
}

/* ── Componente principal ── */
export default function RestablecerContrasena() {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode');

  // 'validating' | 'form' | 'expired' | 'invalid' | 'success'
  const [estado, setEstado] = useState('validating');

  const [nueva,        setNueva]        = useState('');
  const [confirmar,    setConfirmar]    = useState('');
  const [showNueva,    setShowNueva]    = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [errorForm,    setErrorForm]    = useState('');
  const [cargando,     setCargando]     = useState(false);

  /* Validar el código al montar */
  useEffect(() => {
    if (!oobCode) {
      setEstado('invalid');
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then(() => setEstado('form'))
      .catch((err) => {
        if (err.code === 'auth/expired-action-code') {
          setEstado('expired');
        } else {
          // auth/invalid-action-code, auth/user-disabled, etc.
          setEstado('invalid');
        }
      });
  }, [oobCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorForm('');

    if (nueva.length < 8) {
      setErrorForm('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (nueva !== confirmar) {
      setErrorForm('Las contraseñas no coinciden.');
      return;
    }

    setCargando(true);
    try {
      await confirmPasswordReset(auth, oobCode, nueva);
      setEstado('success');
    } catch (err) {
      if (err.code === 'auth/expired-action-code') {
        setEstado('expired');
      } else if (err.code === 'auth/invalid-action-code') {
        setEstado('invalid');
      } else if (err.code === 'auth/weak-password') {
        setErrorForm('La contraseña es demasiado débil. Usa al menos 8 caracteres.');
      } else {
        setErrorForm('Ocurrió un error. Intenta nuevamente.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EBEBEB] relative overflow-hidden px-4">
      {/* Decorative background circles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-20 w-[520px] h-[520px] rounded-full bg-white/80 blur-3xl" />
        <div className="absolute -bottom-20 -left-24 w-[420px] h-[420px] rounded-full bg-white/70 blur-3xl" />
        <div className="absolute top-[45%] left-[35%] w-[280px] h-[280px] rounded-full bg-white/50 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[448px] animate-fade-in-up">
        <div className="bg-[rgba(237,237,237,0.57)] rounded-xl shadow-[0_24px_48px_-12px_rgba(27,27,28,0.05)] overflow-hidden">
          {/* Header */}
          <div className="flex flex-col items-center pt-12 pb-8">
            <span className="font-display text-[36px] font-extrabold text-primary tracking-[-1.8px] leading-10 mb-4">
              GELOX
            </span>
            <div className="w-12 h-1 bg-primary rounded-full" />
          </div>

          {/* Body */}
          <div className="px-8 pb-16 flex flex-col gap-6">
            {/* Cargando validación inicial */}
            {estado === 'validating' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <span className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <p className="text-sm text-muted">Verificando enlace...</p>
              </div>
            )}

            {/* Errores */}
            {(estado === 'expired' || estado === 'invalid') && (
              <PantallaError tipo={estado} />
            )}

            {/* Éxito */}
            {estado === 'success' && <PantallaExito />}

            {/* Formulario */}
            {estado === 'form' && (
              <>
                <div className="text-center">
                  <h2 className="font-display text-2xl font-bold text-ink leading-[30px] mb-1">
                    Nueva contraseña
                  </h2>
                  <p className="text-sm text-muted leading-relaxed">
                    Elige una contraseña segura de al menos 8 caracteres.
                  </p>
                </div>

                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                  {/* Nueva contraseña */}
                  <div>
                    <label
                      htmlFor="nueva"
                      className="block font-semibold text-[11px] tracking-[0.55px] uppercase text-ink mb-2"
                    >
                      Nueva contraseña
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center text-muted">
                        <LockIcon />
                      </span>
                      <input
                        id="nueva"
                        type={showNueva ? 'text' : 'password'}
                        value={nueva}
                        onChange={(e) => setNueva(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        autoComplete="new-password"
                        className={inputBase}
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-ink hover:scale-110 transition duration-300"
                        onClick={() => setShowNueva((v) => !v)}
                        aria-label={showNueva ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showNueva ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmar contraseña */}
                  <div>
                    <label
                      htmlFor="confirmar"
                      className="block font-semibold text-[11px] tracking-[0.55px] uppercase text-ink mb-2"
                    >
                      Confirmar contraseña
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center text-muted">
                        <LockIcon />
                      </span>
                      <input
                        id="confirmar"
                        type={showConfirmar ? 'text' : 'password'}
                        value={confirmar}
                        onChange={(e) => setConfirmar(e.target.value)}
                        placeholder="Repite tu contraseña"
                        autoComplete="new-password"
                        className={inputBase}
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-ink hover:scale-110 transition duration-300"
                        onClick={() => setShowConfirmar((v) => !v)}
                        aria-label={showConfirmar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showConfirmar ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>

                  {/* Error de validación */}
                  {errorForm && (
                    <p className="text-sm text-error-fg text-center leading-5 animate-slide-down">
                      {errorForm}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={cargando}
                    className="flex items-center justify-center gap-2 w-full py-4 bg-primary text-white font-display font-bold text-base rounded-lg hover:bg-primary-dark transition duration-300 active:scale-[0.97] disabled:opacity-80 shadow-[0_10px_15px_-3px_rgba(158,32,22,0.2),0_4px_6px_-4px_rgba(158,32,22,0.2)] mt-1"
                  >
                    {cargando && (
                      <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    )}
                    {cargando ? 'Cambiando...' : 'Cambiar contraseña'}
                  </button>

                  <Link
                    to="/login"
                    className="flex items-center justify-center font-semibold text-sm text-primary hover:text-primary-dark pt-2 transition duration-300"
                  >
                    Volver al inicio de sesión
                  </Link>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
