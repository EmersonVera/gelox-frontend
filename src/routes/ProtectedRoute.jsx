import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ rolesPermitidos }) {
  const { usuario, rol, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen bg-canvas">
        <span className="w-8 h-8 rounded-full border-[3px] border-surface border-t-primary animate-spin" />
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" replace />;

  if (rolesPermitidos && !rolesPermitidos.includes(rol)) {
    return <Navigate to="/no-autorizado" replace />;
  }

  return <Outlet />;
}
