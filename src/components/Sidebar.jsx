import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../auth/firebase';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const handleCerrarSesion = async () => {
    try {
      await signOut(auth);
      fetch('/api/auth/cerrar-sesion', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }).catch(() => {}); // best-effort, no bloquea
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <aside style={{
      width: '240px',
      minHeight: '100vh',
      backgroundColor: '#fcf9f9',
      borderRight: '1px solid rgba(158,32,22,0.1)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      boxSizing: 'border-box',
    }}>
      <div style={{ flex: 1 }}>
        <span style={{
          fontFamily: 'Manrope, sans-serif',
          fontWeight: 800,
          fontSize: '24px',
          color: '#9e2016',
          letterSpacing: '-1.2px',
        }}>
          GELOX
        </span>
      </div>

      <button
        onClick={handleCerrarSesion}
        style={{
          width: '100%',
          background: 'none',
          border: '1px solid rgba(158,32,22,0.3)',
          borderRadius: '8px',
          padding: '10px 16px',
          color: '#9e2016',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        Cerrar Sesión
      </button>
    </aside>
  );
}
