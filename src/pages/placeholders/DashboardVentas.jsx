import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../auth/firebase';
import { useAuth } from '../../context/AuthContext';

export default function DashboardVentas() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login', { replace: true });
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dashboard Ventas</h1>
      <p>Bienvenido, {usuario?.displayName || usuario?.email}</p>
      <button onClick={handleLogout}>Cerrar sesión</button>
    </div>
  );
}
