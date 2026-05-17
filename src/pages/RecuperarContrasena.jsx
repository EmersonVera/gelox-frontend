import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../auth/firebase';

export default function RecuperarContrasena() {
  const [correo, setCorreo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
      await sendPasswordResetEmail(auth, correo);
      setMensaje(`Te hemos enviado un enlace a ${correo}. Revisa tu bandeja de entrada.`);
      setCorreo('');
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError('El correo ingresado no está registrado en el sistema.');
      } else {
        setError('Ocurrió un error. Intenta nuevamente.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#EBEBEB',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Círculos decorativos de fondo */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', width: 520, height: 520, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(200,200,200,0.3) 55%, transparent 100%)',
          top: -120, right: -80,
        }} />
        <div style={{
          position: 'absolute', width: 420, height: 420, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.75) 0%, rgba(200,200,200,0.25) 55%, transparent 100%)',
          bottom: -80, left: -100,
        }} />
        <div style={{
          position: 'absolute', width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(200,200,200,0.15) 55%, transparent 100%)',
          top: '45%', left: '35%',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={{
        width: '448px',
        backgroundColor: 'rgba(237,237,237,0.57)',
        borderRadius: '12px',
        boxShadow: '0px 24px 48px -12px rgba(27,27,28,0.05)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '48px', paddingBottom: '32px' }}>
          <span style={{
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 800,
            fontSize: '36px',
            color: '#9e2016',
            letterSpacing: '-1.8px',
            lineHeight: '40px',
            marginBottom: '16px',
          }}>GELOX</span>
          <div style={{ width: '48px', height: '4px', backgroundColor: '#c0392b', borderRadius: '9999px', marginBottom: '32px' }} />
          <span style={{
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 700,
            fontSize: '24px',
            color: '#1b1b1c',
            lineHeight: '30px',
          }}>¿Olvidaste tu contraseña?</span>
        </div>

        {/* Body */}
        <div style={{ padding: '0 32px 64px 32px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
          <p style={{ margin: 0, fontSize: '16px', color: '#59413d', textAlign: 'center', lineHeight: '26px' }}>
            Ingresa tu correo electrónico y te enviaremos una contraseña provisional para que puedas acceder de nuevo.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Campo correo */}
            <div>
              <label style={{
                display: 'block',
                fontWeight: 600,
                fontSize: '11px',
                letterSpacing: '0.55px',
                textTransform: 'uppercase',
                color: '#1b1b1c',
                marginBottom: '8px',
              }}>
                Correo electrónico
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                  display: 'flex', alignItems: 'center',
                }}>
                  <svg width="17" height="13" viewBox="0 0 17 13" fill="none">
                    <rect x="0.5" y="0.5" width="16" height="12" rx="1.5" stroke="rgba(89,65,61,0.4)" />
                    <path d="M1 1L8.5 7.5L16 1" stroke="rgba(89,65,61,0.4)" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="ejemplo@gelox.com"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: '#f6f3f3',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '18px 16px 18px 48px',
                    fontSize: '16px',
                    color: '#1b1b1c',
                    fontFamily: 'Inter, sans-serif',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Feedback */}
            {mensaje && (
              <p style={{ margin: 0, fontSize: '14px', color: '#2d6e2d', textAlign: 'center', lineHeight: '20px' }}>
                {mensaje}
              </p>
            )}
            {error && (
              <p style={{ margin: 0, fontSize: '14px', color: '#9e2016', textAlign: 'center', lineHeight: '20px' }}>
                {error}
              </p>
            )}

            {/* Botón enviar */}
            <button
              type="submit"
              disabled={cargando}
              style={{
                width: '100%',
                background: 'linear-gradient(136.97deg, #9e2016 0%, #c0392b 100%)',
                border: 'none',
                borderRadius: '8px',
                padding: '16px',
                color: '#fff',
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 700,
                fontSize: '16px',
                cursor: cargando ? 'not-allowed' : 'pointer',
                boxShadow: '0px 10px 15px -3px rgba(158,32,22,0.2), 0px 4px 6px -4px rgba(158,32,22,0.2)',
                opacity: cargando ? 0.8 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {cargando ? 'Enviando...' : 'Enviar nueva contraseña →'}
            </button>

            {/* Volver */}
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#9e2016', fontFamily: 'Inter, sans-serif',
                fontWeight: 600, fontSize: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                paddingTop: '16px',
              }}
            >
              ← Volver al inicio de sesión
            </button>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}
