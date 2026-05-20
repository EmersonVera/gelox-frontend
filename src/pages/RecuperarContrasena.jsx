import { useState } from 'react';
import { Link } from 'react-router-dom';

function EnvelopeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="13" viewBox="0 0 17 13" fill="none">
      <rect x="0.5" y="0.5" width="16" height="12" rx="1.5" stroke="currentColor" strokeOpacity="0.4" />
      <path d="M1 1L8.5 7.5L16 1" stroke="currentColor" strokeOpacity="0.4" strokeLinecap="round" />
    </svg>
  );
}

export default function RecuperarContrasena() {
  const [correo, setCorreo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');

    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    setCargando(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/recuperar-contrasena`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo }),
      });
      if (!res.ok) throw new Error('error');
      setMensaje(`Te hemos enviado un enlace a ${correo}. Revisa tu bandeja de entrada.`);
      setCorreo('');
    } catch {
      setError('Ocurrió un error. Intenta nuevamente.');
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
            <div className="w-12 h-1 bg-primary rounded-full mb-8" />
            <span className="font-display text-2xl font-bold text-ink leading-[30px]">
              ¿Olvidaste tu contraseña?
            </span>
          </div>

          {/* Body */}
          <div className="px-8 pb-16 flex flex-col gap-10">
            <p className="text-base text-faint text-center leading-relaxed">
              Ingresa tu correo electrónico y te enviaremos una contraseña provisional para que
              puedas acceder de nuevo.
            </p>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
              <div>
                <label
                  htmlFor="correo"
                  className="block font-semibold text-[11px] tracking-[0.55px] uppercase text-ink mb-2"
                >
                  Correo electrónico
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center text-faint">
                    <EnvelopeIcon />
                  </span>
                  <input
                    id="correo"
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="ejemplo@gelox.com"
                    className="w-full bg-surface border-0 rounded-lg py-[18px] pl-12 pr-4 text-base text-ink outline-none transition duration-300 focus:ring-2 focus:ring-primary/20 placeholder:text-muted"
                  />
                </div>
              </div>

              {mensaje && (
                <p className="text-sm text-success-fg text-center leading-5 animate-slide-down">
                  {mensaje}
                </p>
              )}
              {error && (
                <p className="text-sm text-error-fg text-center leading-5 animate-slide-down">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="flex items-center justify-center gap-2 w-full py-4 bg-primary text-white font-display font-bold text-base rounded-lg hover:bg-primary-dark transition duration-300 active:scale-[0.97] disabled:opacity-80 shadow-[0_10px_15px_-3px_rgba(158,32,22,0.2),0_4px_6px_-4px_rgba(158,32,22,0.2)]"
              >
                {cargando && (
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                )}
                {cargando ? 'Enviando...' : 'Enviar nueva contraseña →'}
              </button>

              <Link
                to="/login"
                className="flex items-center justify-center gap-1 font-semibold text-sm text-primary hover:text-primary-dark pt-4 transition duration-300"
              >
                ← Volver al inicio de sesión
              </Link>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
