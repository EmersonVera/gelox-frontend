import Sidebar from './Sidebar';
import Navbar from './Navbar';
import styles from '../styles/layout.module.css';

export default function AppLayout({ children }) {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.body}>
        <Navbar />
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
