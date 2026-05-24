/**
 * Sidebar.jsx — dispatcher por rol
 *
 * Renderiza la sidebar específica según el rol del usuario autenticado.
 *   ADMINISTRADOR      → SidebarAdministrador
 *   ENCARGADO_VENTAS   → SidebarVentas
 *   Cualquier otro     → SidebarAdministrador (fallback)
 */
import { useAuth } from '../context/AuthContext';
import SidebarAdministrador from './administrador/SidebarAdministrador';
import SidebarVentas        from './ventas/SidebarVentas';

export default function Sidebar({ open, onClose }) {
  const { perfil } = useAuth();
  const rol = perfil?.rol;

  if (rol === 'ENCARGADO_VENTAS') {
    return <SidebarVentas open={open} onClose={onClose} />;
  }

  // ADMINISTRADOR y cualquier otro rol reciben la sidebar de administrador
  return <SidebarAdministrador open={open} onClose={onClose} />;
}
