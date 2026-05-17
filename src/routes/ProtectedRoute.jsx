import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, rolesPermitidos = [] }) {
  const { firebaseUser, perfil } = useAuth();

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(perfil?.rol)) {
    return <Navigate to="/no-autorizado" replace />;
  }

  return children;
}
