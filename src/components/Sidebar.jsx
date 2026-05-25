/**
 * Sidebar.jsx — dispatcher por rol y ruta activa
 *
 * Lógica:
 *   ENCARGADO_INVENTARIO              → SidebarInventarios
 *   ENCARGADO_VENTAS                  → SidebarVentas
 *   ADMINISTRADOR en /inventarios/*   → SidebarInventarios (con botón "Volver a Admin")
 *   ADMINISTRADOR en /ventas/*        → SidebarVentas      (con botón "Volver a Admin")
 *   ADMINISTRADOR (resto)             → SidebarAdministrador
 *   Fallback                          → SidebarAdministrador
 */
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SidebarAdministrador from './administrador/SidebarAdministrador';
import SidebarVentas        from './ventas/SidebarVentas';
import SidebarInventarios   from './inventarios/SidebarInventarios';

export default function Sidebar({ open, onClose }) {
  const { rol } = useAuth();
  const { pathname } = useLocation();

  if (rol === 'ENCARGADO_INVENTARIO') {
    return <SidebarInventarios open={open} onClose={onClose} />;
  }

  if (rol === 'ENCARGADO_VENTAS') {
    return <SidebarVentas open={open} onClose={onClose} />;
  }

  if (rol === 'ADMINISTRADOR') {
    if (pathname.startsWith('/inventarios')) {
      return <SidebarInventarios open={open} onClose={onClose} />;
    }
    if (pathname.startsWith('/ventas')) {
      return <SidebarVentas open={open} onClose={onClose} />;
    }
    return <SidebarAdministrador open={open} onClose={onClose} />;
  }

  return <SidebarAdministrador open={open} onClose={onClose} />;
}
