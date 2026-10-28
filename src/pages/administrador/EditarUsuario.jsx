// src/pages/administrador/EditarUsuario.jsx — RF62: editar, deshabilitar y habilitar un usuario de la distribuidora
import { useEffect, useState, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import SuccessToast from '../../components/SuccessToast';
import ModalEstadoUsuario from '../../components/administrador/ModalEstadoUsuario';
import RolIcono from '../../components/administrador/RolIcono';
import ContenidoCarga from '../../components/ui/ContenidoCarga';
import {
  ROLES_INTERNOS, ROLES_PERMITIDOS, ROL_LABEL, esActivo, esErrorDeCorreo, esErrorDeRol,
  esGerenteTitular, iniciales, mensajeError, sinAcciones,
} from '../../components/administrador/usuariosUtils';
import { useIdentidad } from '../../context/IdentidadContext';
import {
  deshabilitarUsuario, editarUsuario, habilitarUsuario, obtenerUsuario,
} from '../../services/usuariosService';

/* ── Icons ── */
function ArrowLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function WarningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function BanIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}
function CheckCircleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
function SaveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

const inputBase =
  'w-full px-4 py-3 border rounded-xl text-sm outline-none transition duration-300 bg-white text-ink placeholder:text-[#c0c0c0]';
const inputNormal   = 'border-divider focus:border-primary focus:ring-2 focus:ring-primary/20';
const inputError    = 'border-danger ring-2 ring-danger/20 bg-error-bg';
const inputBloqueado = 'border-divider bg-surface text-muted cursor-not-allowed';
const lbl           = 'text-xs font-semibold text-faint uppercase tracking-wider block mb-1.5';
const errMsg        = 'text-xs text-error-fg mt-1 animate-slide-down';
const card          = 'bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-6';

function CardHeader({ icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <span className="text-primary mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-sm font-bold text-ink">{title}</p>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function VolverUsuarios() {
  return (
    <Link to="/usuarios" className="flex items-center gap-1.5 text-primary text-xs font-semibold uppercase tracking-wider w-fit hover:underline transition">
      <ArrowLeftIcon /> Todos los Usuarios
    </Link>
  );
}

const valoresFormulario = (u) => ({
  nombre: u?.nombre ?? '',
  correo: u?.correo ?? '',
  rol: ROLES_PERMITIDOS.includes(u?.rol) ? u.rol : '',
});

/**
 * Cada id monta un formulario nuevo: al pasar de /usuarios/A/editar a /usuarios/B/editar
 * (atrás / adelante del navegador) React Router reutiliza el componente, y sin la key
 * se arrastrarían el usuario, el 404 y los valores del formulario de A.
 */
export default function EditarUsuario() {
  const { id } = useParams();
  return <FormularioEditarUsuario key={id} id={id} />;
}

function FormularioEditarUsuario({ id }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { identidad } = useIdentidad();
  const nombreDistribuidora = identidad?.nombreComercial ?? 'tu distribuidora';

  // La fila de la lista llega en location.state para pintar de inmediato; igual se consulta
  // GET /api/usuarios/{id}: si el usuario no es de esta distribuidora, el backend responde 404.
  const [usuario, setUsuario]       = useState(() => (location.state?.id === id ? location.state : null));
  const [errorCarga, setErrorCarga] = useState(null); // { id, status, mensaje }
  const [verificado, setVerificado] = useState(null); // id ya confirmado por el backend
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [foto, setFoto]             = useState(null);
  const [fotoPreview, setFotoPreview] = useState(location.state?.fotoUrl ?? null);
  const [modalEstado, setModalEstado] = useState(false);
  const [toast, setToast]           = useState({ show: false, msg: '', type: 'success' });
  const fileRef = useRef(null);

  const {
    register, handleSubmit, setError, reset, control,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: valoresFormulario(usuario) });

  const rolSeleccionado = useWatch({ control, name: 'rol' });
  const verificando = verificado !== id && errorCarga?.id !== id;

  useEffect(() => {
    if (!verificando) return undefined;
    let vivo = true;
    obtenerUsuario(id)
      .then(({ data }) => {
        if (!vivo) return;
        setUsuario(data);
        setVerificado(id);
        // Lo que el Gerente ya haya escrito mientras cargaba se conserva.
        reset(valoresFormulario(data), { keepDirtyValues: true });
      })
      .catch((err) => {
        if (!vivo) return;
        setErrorCarga({ id, status: err?.response?.status, mensaje: mensajeError(err, 'No se pudo cargar el usuario.') });
      });
    return () => { vivo = false; };
  }, [verificando, id, reset]);

  /* ── Usuario de otra distribuidora o inexistente (404) ── */
  if (noEncontrado || errorCarga?.status === 404 || (!usuario && errorCarga)) {
    const es404 = noEncontrado || errorCarga?.status === 404;
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          <VolverUsuarios />
          <div className={`${card} text-center py-14 flex flex-col items-center gap-3 animate-fade-in-up`}>
            <div className="w-14 h-14 rounded-full bg-surface text-faint flex items-center justify-center">
              <PersonIcon />
            </div>
            <p className="font-display font-bold text-lg text-ink">
              {es404 ? 'Usuario no encontrado' : 'No se pudo cargar el usuario'}
            </p>
            <p className="text-sm text-muted max-w-md">
              {es404
                ? `Solo puedes gestionar los usuarios de ${nombreDistribuidora}. Puede que el enlace esté incompleto o que el usuario pertenezca a otra distribuidora.`
                : errorCarga?.mensaje}
            </p>
            <Link
              to="/usuarios"
              className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition duration-300 active:scale-[0.97] shadow-[0_2px_8px_rgba(158,32,22,0.25)]"
            >
              Volver a usuarios
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  /* ── Cargando (se abrió por URL, sin la fila de la lista) ── */
  if (!usuario) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          <VolverUsuarios />
          <div className="flex items-center justify-center gap-3 py-24 text-muted text-sm">
            <span className="w-5 h-5 rounded-full border-2 border-muted/30 border-t-muted animate-spin" />
            Cargando usuario...
          </div>
        </div>
      </AppLayout>
    );
  }

  const estaDeshabilitado = !esActivo(usuario);
  const titular   = esGerenteTitular(usuario);
  const bloqueado = sinAcciones(usuario);          // titular o rol fuera de RF62: solo lectura
  const soloLectura = estaDeshabilitado || bloqueado;

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (data) => {
    try {
      if (foto) {
        const fd = new FormData();
        fd.append('nombre', data.nombre);
        fd.append('correo', data.correo);
        fd.append('rol', data.rol);
        fd.append('foto', foto);
        await editarUsuario(id, fd);
      } else {
        await editarUsuario(id, { nombre: data.nombre, correo: data.correo, rol: data.rol });
      }
      setToast({ show: true, msg: 'Cambios guardados correctamente.', type: 'success' });
    } catch (err) {
      if (err?.response?.status === 404) { setNoEncontrado(true); return; }
      const msg = mensajeError(err, 'Error al guardar los cambios. Intenta de nuevo.');
      if (esErrorDeRol(err)) {
        setError('rol', { type: 'server', message: msg });
      } else if (esErrorDeCorreo(err)) {
        setError('correo', { type: 'server', message: msg }, { shouldFocus: true });
      }
      setToast({ show: true, msg, type: 'error' });
    }
  };

  const cambiarEstado = async () => {
    try {
      if (estaDeshabilitado) await habilitarUsuario(id);
      else                   await deshabilitarUsuario(id);
    } catch (err) {
      if (err?.response?.status === 404) { setModalEstado(false); setNoEncontrado(true); return; }
      throw err;
    }
    setToast({
      show: true,
      msg: estaDeshabilitado ? 'Usuario habilitado correctamente.' : 'Usuario deshabilitado correctamente.',
      type: 'success',
    });
  };

  return (
    <AppLayout>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in-up">

        <VolverUsuarios />

        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink tracking-tight">Gestionar Perfil de Usuario</h1>
          <p className="text-sm text-muted mt-1">
            Edite las credenciales de acceso y el rol de{' '}
            <span className="font-semibold text-ink">{usuario.nombre ?? '—'}</span> en {nombreDistribuidora}.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          <div className="flex flex-col gap-5">

            <div className={card}>
              <CardHeader icon={<PersonIcon />} title="Información General" subtitle="Datos personales y de contacto" />

              {bloqueado ? (
                <div className="mb-4 px-4 py-3 rounded-xl bg-surface text-faint text-sm flex items-start gap-2.5">
                  <span className="text-primary shrink-0 mt-0.5"><LockIcon /></span>
                  <span>
                    {titular
                      ? <>Es el <strong className="text-ink">gerente titular</strong> de {nombreDistribuidora}. Su rol y su acceso no se cambian desde la gestión de usuarios.</>
                      : <>Desde aquí solo se gestionan los roles de Encargado de Ventas y Encargado de Inventarios.</>}
                  </span>
                </div>
              ) : estaDeshabilitado && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                  Este usuario está deshabilitado. Habilítalo para poder editar su perfil.
                </div>
              )}

              <div className="flex flex-col gap-5">
                <div>
                  <label htmlFor="nombre" className={lbl}>Nombre Completo</label>
                  <input id="nombre" type="text" placeholder="Ej. Laura Gómez" disabled={soloLectura}
                    className={`${inputBase} ${soloLectura ? inputBloqueado : errors.nombre ? inputError : inputNormal}`}
                    {...register('nombre', {
                      required: 'El nombre es requerido.',
                      validate: (v) => v.trim().length >= 3 || 'Mínimo 3 caracteres.',
                    })} />
                  {errors.nombre && <p className={errMsg}>{errors.nombre.message}</p>}
                </div>

                <div>
                  <label htmlFor="correo" className={lbl}>Correo Electrónico</label>
                  <input id="correo" type="email" placeholder="nombre@correo.com" disabled={soloLectura}
                    className={`${inputBase} ${soloLectura ? inputBloqueado : errors.correo ? inputError : inputNormal}`}
                    {...register('correo', { required: 'El correo es requerido.', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Formato inválido.' } })} />
                  {errors.correo && <p className={errMsg}>{errors.correo.message}</p>}
                </div>

                <div>
                  <label className={lbl}>Fotografía del Perfil <span className="normal-case font-normal text-muted">(opcional)</span></label>
                  <button type="button" onClick={() => !soloLectura && fileRef.current?.click()} disabled={soloLectura}
                    className={`w-full flex flex-col items-center justify-center gap-2 py-5 border-2 border-dashed rounded-xl transition duration-300 ${soloLectura ? 'border-divider text-divider cursor-not-allowed bg-surface' : 'border-divider text-faint hover:border-primary hover:text-primary'}`}>
                    {fotoPreview ? <img src={fotoPreview} alt="Vista previa" className="w-14 h-14 rounded-full object-cover border border-border" /> : <CameraIcon />}
                    <span className="text-xs font-semibold uppercase tracking-wider">{fotoPreview ? 'Cambiar fotografía' : 'Subir fotografía'}</span>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={soloLectura ? undefined : handleFotoChange} />
                </div>
              </div>
            </div>

            {/* Rol: solo Ventas e Inventarios; el titular no cambia de rol (RF62) */}
            {!bloqueado && (
              <fieldset className={card}>
                <legend className="sr-only">Asignación de rol</legend>
                <CardHeader icon={<ShieldIcon />} title="Asignación de Rol" subtitle="Defina el nivel de acceso al sistema" />
                <div className="flex flex-col gap-3">
                  {ROLES_INTERNOS.map((rol) => {
                    const activo = rolSeleccionado === rol.value && !estaDeshabilitado;
                    return (
                      <label key={rol.value}
                        className={`flex items-start gap-4 px-4 py-4 rounded-xl border-2 transition duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/20 ${estaDeshabilitado ? 'border-border bg-surface cursor-not-allowed opacity-60' : activo ? 'border-primary bg-primary/5 cursor-pointer' : 'border-border bg-white hover:border-divider hover:bg-surface cursor-pointer'}`}>
                        <input type="radio" value={rol.value} className="sr-only" disabled={estaDeshabilitado}
                          {...register('rol', {
                            validate: (v) => ROLES_PERMITIDOS.includes(v) || 'Solo se permiten los roles de Ventas e Inventarios.',
                          })} />
                        <span className={`mt-0.5 shrink-0 ${activo ? 'text-primary' : 'text-faint'}`}><RolIcono rol={rol.value} size={22} /></span>
                        <div>
                          <p className={`text-sm font-semibold ${activo ? 'text-primary' : 'text-ink'}`}>{rol.label}</p>
                          <p className="text-xs text-muted mt-0.5 leading-relaxed">{rol.descripcion}</p>
                        </div>
                        <span className={`ml-auto mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${activo ? 'border-primary' : 'border-divider'}`}>
                          {activo && <span className="w-2 h-2 rounded-full bg-primary block" />}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {errors.rol
                  ? <p className={`${errMsg} mt-3`}>{errors.rol.message}</p>
                  : <p className="text-xs text-muted mt-3">El rol Gerente no se asigna desde aquí.</p>}
              </fieldset>
            )}
          </div>

          <div className="flex flex-col gap-5">
            <div className={`${card} flex flex-col items-center gap-3`}>
              <div className={`w-20 h-20 rounded-full text-xl font-bold flex items-center justify-center overflow-hidden shrink-0 ${estaDeshabilitado ? 'bg-surface text-muted' : 'bg-primary-tint text-primary'}`}>
                {fotoPreview ? <img src={fotoPreview} alt={usuario.nombre} className="w-full h-full object-cover" /> : iniciales(usuario.nombre)}
              </div>
              <p className="text-sm font-bold text-ink text-center">{usuario.nombre ?? '—'}</p>
              <p className="text-xs text-muted text-center break-all">{usuario.correo ?? ''}</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${usuario.rol === 'ADMINISTRADOR' ? 'bg-primary-tint text-primary' : 'bg-border text-faint'}`}>
                {ROL_LABEL[usuario.rol] ?? usuario.rol}
              </span>
            </div>

            {!bloqueado && (
              <div className={`bg-white rounded-2xl border shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-6 ${estaDeshabilitado ? 'border-green-200' : 'border-[#ffb4a9]'}`}>
                <div className={`flex items-center gap-2 mb-3 ${estaDeshabilitado ? 'text-green-600' : 'text-danger'}`}>
                  {estaDeshabilitado ? <CheckCircleIcon /> : <WarningIcon />}
                  <span className="text-sm font-bold">{estaDeshabilitado ? 'Zona de Acción' : 'Zona de Peligro'}</span>
                </div>
                <p className="text-xs text-muted leading-relaxed mb-4">
                  {estaDeshabilitado
                    ? 'Al habilitar este usuario, recuperará acceso al sistema con su rol y permisos asignados.'
                    : 'Al deshabilitar este usuario, su sesión se cerrará de inmediato. Podrás habilitarlo cuando lo necesites.'}
                </p>
                <button type="button" onClick={() => setModalEstado(true)} disabled={isSubmitting}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition duration-300 active:scale-[0.97] disabled:opacity-60 ${estaDeshabilitado ? 'bg-green-500 hover:bg-green-600' : 'bg-danger hover:bg-danger-dark'}`}>
                  {estaDeshabilitado ? <><CheckCircleIcon />Habilitar Usuario</> : <><BanIcon />Deshabilitar Usuario</>}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07)] px-6 py-4 flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate('/usuarios')} disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-border text-ink text-sm font-medium rounded-xl hover:bg-divider transition duration-300 active:scale-[0.97] disabled:opacity-60">
            {bloqueado ? 'Volver' : 'Descartar'}
          </button>
          {!bloqueado && (
            <button type="submit" disabled={isSubmitting || estaDeshabilitado}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition duration-300 active:scale-[0.97] shadow-[0_2px_8px_rgba(158,32,22,0.25)] disabled:opacity-60">
              <ContenidoCarga cargando={isSubmitting} textoCargando="Guardando...">
                <SaveIcon />Guardar Cambios
              </ContenidoCarga>
            </button>
          )}
        </div>

      </form>

      <ModalEstadoUsuario
        usuario={modalEstado ? usuario : null}
        onConfirmar={cambiarEstado}
        onCerrar={() => setModalEstado(false)}
      />

      {/* La key monta un aviso nuevo por mensaje: SuccessToast conserva el onClose con el que se abrió. */}
      <SuccessToast
        key={`${toast.type}-${toast.msg}`}
        message={toast.msg}
        show={toast.show}
        onClose={() => {
          setToast(t => ({ ...t, show: false }));
          if (toast.type === 'success') navigate('/usuarios');
        }}
        duration={1500}
        type={toast.type}
      />
    </AppLayout>
  );
}
