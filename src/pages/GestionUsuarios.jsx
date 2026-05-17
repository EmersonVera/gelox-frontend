import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import {
  getUsuarios,
  crearUsuario,
  deshabilitarUsuario,
} from '../services/usuariosService';
import styles from '../styles/gestionUsuarios.module.css';

/* ── Constants ── */
const ROL_LABEL = {
  ADMINISTRADOR:        'Gerente General',
  ENCARGADO_INVENTARIO: 'Encargado de Inventarios',
  ENCARGADO_VENTAS:     'Encargado de Ventas',
};

const ROL_OPTIONS = [
  { value: 'ENCARGADO_INVENTARIO', label: 'Encargado de Inventarios' },
  { value: 'ENCARGADO_VENTAS',     label: 'Encargado de Ventas' },
];

/* ── Validation schema ── */
const schema = yup.object({
  nombre:    yup.string().required('El nombre es requerido').min(2, 'Mínimo 2 caracteres'),
  correo:    yup.string().email('Formato de correo inválido').required('El correo es requerido'),
  contrasena: yup.string().required('La contraseña es requerida').min(6, 'Mínimo 6 caracteres'),
  rol:       yup.string().required('Selecciona un rol').oneOf(['ENCARGADO_INVENTARIO', 'ENCARGADO_VENTAS'], 'Rol inválido'),
});

/* ── Helpers ── */
function getInitials(nombre) {
  if (!nombre) return '?';
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/* ── Icons ── */
function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function AddUserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

function BanIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/* ══════════════════════════════════════════════
   Modal: Crear Usuario
══════════════════════════════════════════════ */
function ModalCrearUsuario({ onClose, onCreated }) {
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async ({ nombre, correo, contrasena, rol }) => {
    setSaving(true);
    setApiError('');
    try {
      await crearUsuario({ nombre, correo, contrasena, rol });
      onCreated();
    } catch (err) {
      const status  = err?.response?.status;
      const mensaje = err?.response?.data?.mensaje ?? '';
      if (status === 409 || mensaje.toLowerCase().includes('correo')) {
        setError('correo', { message: mensaje || 'Este correo ya está registrado.' });
      } else {
        setApiError(mensaje || 'Error al crear el usuario. Intente de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <p className={styles.modalTitle} id="modal-title">Añadir Nuevo Usuario</p>
        <p className={styles.modalSubtitle}>
          Completa los datos para crear una cuenta de acceso al sistema GELOX.
        </p>

        {apiError && <div className={styles.errorBanner}>{apiError}</div>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className={styles.formStack}>

            {/* Nombre */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="m-nombre">Nombre Completo</label>
              <input
                id="m-nombre"
                className={`${styles.input} ${errors.nombre ? styles.inputError : ''}`}
                placeholder="Nombre del usuario"
                {...register('nombre')}
              />
              {errors.nombre && <p className={styles.errorMsg}>{errors.nombre.message}</p>}
            </div>

            {/* Correo */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="m-correo">Correo Electrónico</label>
              <input
                id="m-correo"
                type="email"
                autoComplete="off"
                className={`${styles.input} ${errors.correo ? styles.inputError : ''}`}
                placeholder="correo@ejemplo.com"
                {...register('correo')}
              />
              {errors.correo && <p className={styles.errorMsg}>{errors.correo.message}</p>}
            </div>

            {/* Contraseña temporal */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="m-contrasena">Contraseña Temporal</label>
              <input
                id="m-contrasena"
                type="password"
                autoComplete="new-password"
                className={`${styles.input} ${errors.contrasena ? styles.inputError : ''}`}
                placeholder="Mínimo 6 caracteres"
                {...register('contrasena')}
              />
              {errors.contrasena && <p className={styles.errorMsg}>{errors.contrasena.message}</p>}
            </div>

            {/* Rol */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="m-rol">Rol de Acceso</label>
              <div className={styles.selectWrapper}>
                <select
                  id="m-rol"
                  className={`${styles.select} ${errors.rol ? styles.inputError : ''}`}
                  defaultValue=""
                  {...register('rol')}
                >
                  <option value="" disabled>Selecciona un rol...</option>
                  {ROL_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <span className={styles.selectArrow}><ChevronIcon /></span>
              </div>
              {errors.rol && <p className={styles.errorMsg}>{errors.rol.message}</p>}
            </div>

          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? <><span className={styles.spinnerSm} /> Creando...</> : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Dialog: Confirmar Deshabilitar
══════════════════════════════════════════════ */
function ConfirmDialog({ usuario, onClose, onConfirm, loading }) {
  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.confirmModal} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <p className={styles.confirmTitle} id="confirm-title">Deshabilitar usuario</p>
        <p className={styles.confirmText}>
          ¿Estás seguro de que deseas deshabilitar a{' '}
          <strong>{usuario.nombre}</strong>? El usuario perderá acceso al
          sistema de inmediato. Esta acción puede revertirse editando el usuario.
        </p>
        <div className={styles.modalActions}>
          <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className={styles.btnDanger} onClick={onConfirm} disabled={loading}>
            {loading ? <><span className={styles.spinnerSm} /> Deshabilitando...</> : 'Deshabilitar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Main page
══════════════════════════════════════════════ */
export default function GestionUsuarios() {
  const { perfil } = useAuth();
  const esAdmin = perfil?.rol === 'ADMINISTRADOR';

  const [usuarios, setUsuarios]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [modalCrear, setModalCrear]       = useState(false);
  const [userADeshabilitar, setUserADeshabilitar] = useState(null);
  const [deshabilitando, setDeshabilitando]       = useState(false);

  const cargarUsuarios = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getUsuarios();
      setUsuarios(Array.isArray(data) ? data : (data?.usuarios ?? []));
    } catch {
      setError('No se pudo cargar la lista de usuarios. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarUsuarios(); }, [cargarUsuarios]);

  const handleCreated = () => {
    setModalCrear(false);
    cargarUsuarios();
  };

  const handleConfirmDeshabilitar = async () => {
    if (!userADeshabilitar) return;
    setDeshabilitando(true);
    try {
      await deshabilitarUsuario(userADeshabilitar.id);
      setUserADeshabilitar(null);
      cargarUsuarios();
    } catch {
      setUserADeshabilitar(null);
    } finally {
      setDeshabilitando(false);
    }
  };

  return (
    <AppLayout>
      <div className={styles.page}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Seguridad y Gestión de Usuarios</h1>
            <p className={styles.subtitle}>
              Administra los accesos del personal, define roles y supervisa la actividad del
              sistema GELOX en tiempo real.
            </p>
          </div>
          {esAdmin && (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => setModalCrear(true)}
            >
              <AddUserIcon />
              Añadir Nuevo Usuario
            </button>
          )}
        </div>

        {/* ── Table card ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardHeaderIcon}><UsersIcon /></span>
            Directorio de Personal
          </div>

          {error && (
            <div style={{ padding: '1rem 1.5rem' }}>
              <div className={styles.errorBanner}>{error}</div>
            </div>
          )}

          {loading ? (
            <div className={styles.stateBox}>
              <span className={styles.spinner} />
              Cargando usuarios...
            </div>
          ) : !error && usuarios.length === 0 ? (
            <div className={styles.stateBox}>
              No hay usuarios registrados.
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Rol de Acceso</th>
                    <th>Último Acceso</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => {
                    const esActivo = u.estado !== 'DESHABILITADO' && u.estado !== false && u.habilitado !== false;
                    const rolLabel = ROL_LABEL[u.rol] ?? u.rol ?? '—';
                    const esAdminRol = u.rol === 'ADMINISTRADOR';
                    return (
                      <tr key={u.id ?? u.correo}>
                        {/* Nombre + correo */}
                        <td>
                          <div className={styles.userCell}>
                            <div className={styles.avatar}>
                              {u.foto_url
                                ? <img src={u.foto_url} alt={u.nombre} />
                                : getInitials(u.nombre)
                              }
                            </div>
                            <div>
                              <div className={styles.userName}>{u.nombre}</div>
                              <div className={styles.userEmail}>{u.correo}</div>
                            </div>
                          </div>
                        </td>

                        {/* Rol */}
                        <td>
                          <span className={`${styles.badgeRol} ${esAdminRol ? styles.badgeAdmin : styles.badgeOther}`}>
                            {rolLabel}
                          </span>
                        </td>

                        {/* Último acceso */}
                        <td className={styles.lastAccess}>
                          {u.ultimo_acceso ?? u.ultimoAcceso ?? '—'}
                        </td>

                        {/* Acciones */}
                        <td className={styles.actionsCell}>
                          {esAdmin && esActivo && !esAdminRol ? (
                            <button
                              type="button"
                              className={styles.btnDisable}
                              onClick={() => setUserADeshabilitar(u)}
                              title={`Deshabilitar a ${u.nombre}`}
                              >
                                <BanIcon />
                                Deshabilitar
                              </button>
                            ) : (
                              <span style={{ color: '#e4e2e2', fontSize: '0.75rem' }}>—</span>
                            )}
                          </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {modalCrear && (
        <ModalCrearUsuario
          onClose={() => setModalCrear(false)}
          onCreated={handleCreated}
        />
      )}

      {userADeshabilitar && (
        <ConfirmDialog
          usuario={userADeshabilitar}
          onClose={() => setUserADeshabilitar(null)}
          onConfirm={handleConfirmDeshabilitar}
          loading={deshabilitando}
        />
      )}
    </AppLayout>
  );
}
