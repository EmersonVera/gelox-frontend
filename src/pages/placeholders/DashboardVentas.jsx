import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DashboardVentas() {
  const { perfil, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dashboard Ventas</h1>
      <p>Bienvenido, {perfil?.nombre}</p>
      <button onClick={handleLogout}>Cerrar sesión</button>
    </div>
  );
}
