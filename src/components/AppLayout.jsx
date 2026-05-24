import { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0">
        <Navbar onToggle={() => setSidebarOpen((v) => !v)} sidebarOpen={sidebarOpen} />
        {/* overflow-hidden en main recorta el translateY de las animaciones
            y evita que el scrollbar aparezca durante la entrada.
            El scroll real lo maneja el div interior, que también lleva
            la animación para que todas las páginas entren con fade. */}
        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto p-6 md:p-8 animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
