import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Spinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <div style={{
      width: 32, height: 32,
      border: '3px solid #f6f3f3',
      borderTop: '3px solid #9e2016',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default function ProtectedRoute({ rolesPermitidos }) {
  const { usuario, rol, cargando } = useAuth();

  // Esperando resolución del estado de auth
  if (cargando) return <Spinner />;

  // Sin sesión → login
  if (!usuario) return <Navigate to="/login" replace />;

  // Usuario autenticado pero perfil aún no cargado (race condition login)
  // Esperamos en lugar de redirigir a /no-autorizado prematuramente
  if (rol === null) return <Spinner />;
  
  // Rol no permitido para esta ruta
  if (rolesPermitidos && !rolesPermitidos.includes(rol)) {
    return <Navigate to="/no-autorizado" replace />;
  }

  return <Outlet />;
}
