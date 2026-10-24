import { AuthProvider } from './context/AuthContext';
import { IdentidadProvider } from './context/IdentidadContext';
import AppRouter from './routes/AppRouter';

export default function App() {
  return (
    <AuthProvider>
      <IdentidadProvider>
        <AppRouter />
      </IdentidadProvider>
    </AuthProvider>
  );
}
