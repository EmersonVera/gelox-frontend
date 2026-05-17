import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ rolesPermitidos }) {
  const { usuario, rol, cargando } = useAuth();


  return <Outlet />;
}
