import { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import styles from '../styles/layout.module.css';

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.shell}>
      {/* Backdrop móvil */}
      {sidebarOpen && (
        <div
          className={styles.backdrop}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.body}>
        <Navbar onToggle={() => setSidebarOpen((v) => !v)} sidebarOpen={sidebarOpen} />
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
