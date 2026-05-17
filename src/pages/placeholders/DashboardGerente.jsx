import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../auth/firebase';
import { useAuth } from '../../context/AuthContext';

export default function DashboardGerente() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-extrabold text-ink tracking-tight">Dashboard Gerente</h1>
      <p className="text-sm text-muted">Bienvenido, {perfil?.nombre}</p>
      <button
        onClick={handleLogout}
        className="self-start px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
