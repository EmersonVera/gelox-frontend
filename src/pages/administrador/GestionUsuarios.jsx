// src/pages/administrador/GestionUsuarios.jsx — RF62: usuarios internos de la distribuidora del Gerente
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/AppLayout";
import SuccessToast from "../../components/SuccessToast";
import ModalEstadoUsuario from "../../components/administrador/ModalEstadoUsuario";
import {
  ROL_LABEL, esActivo, esGerenteTitular, iniciales, sinAcciones,
} from "../../components/administrador/usuariosUtils";
import { useAuth } from "../../context/AuthContext";
import { useIdentidad } from "../../context/IdentidadContext";
import { getUsuarios, deshabilitarUsuario, habilitarUsuario } from "../../services/usuariosService";

const FILTROS = [
  { value: "", label: "Todos" },
  { value: "ENCARGADO_VENTAS", label: "Ventas" },
  { value: "ENCARGADO_INVENTARIO", label: "Inventarios" },
];

/* ── Icons ── */
function UsersIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function AddUserIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

/* ── Shared class strings ── */
const btnPrimary =
  "inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition duration-300 active:scale-[0.97] shadow-[0_2px_8px_rgba(158,32,22,0.25)] disabled:opacity-60";
const btnFila =
  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition duration-300 active:scale-95";

function mensajeCarga(err) {
  const status = err?.response?.status;
  if (!err?.response || err instanceof TypeError)
    return "Sin conexión a internet. No se pudo cargar la lista de usuarios.";
  if (status === 401) return "Tu sesión ha expirado. Vuelve a iniciar sesión.";
  if (status === 403) return "No tienes permisos para ver la lista de usuarios.";
  if (status >= 500) return "Error en el servidor al cargar los usuarios. Intenta más tarde.";
  const data = err?.response?.data;
  return (typeof data === "string" && data) || data?.mensaje || data?.message || "No se pudo cargar la lista de usuarios.";
}

const formatearUltimoAcceso = (fechaStr) => {
  if (!fechaStr) return "—";

  const fecha = new Date(fechaStr);
  const ahora = new Date();

  const diffMs = ahora - fecha;
  const diffHoras = diffMs / (1000 * 60 * 60);
  const diffDias = Math.floor(diffHoras / 24);

  const horaFormateada = fecha
    .toLocaleTimeString("es-CO", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();

  if (fecha.toDateString() === ahora.toDateString()) {
    return `Hoy, ${horaFormateada}`;
  }
  if (diffHoras < 48) {
    return `Ayer, ${horaFormateada}`;
  }
  if (diffDias > 30) {
    return "Más de 30 días";
  }
  return `Hace ${diffDias} día${diffDias !== 1 ? "s" : ""}`;
};

/* ══════════════════════════════════════════════
   Main page
══════════════════════════════════════════════ */
export default function GestionUsuarios() {
  const { perfil } = useAuth();
  const { identidad } = useIdentidad();
  const navigate = useNavigate();
  const esAdmin = perfil?.rol === "ADMINISTRADOR";
  const nombreDistribuidora = identidad?.nombreComercial;

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtroRol, setFiltroRol] = useState("");
  const [usuarioEstado, setUsuarioEstado] = useState(null); // fila del modal deshabilitar / habilitar
  const [toast, setToast] = useState({ show: false, msg: "", type: "success" });

  useEffect(() => {
    let vivo = true;
    getUsuarios()
      .then(({ data }) => {
        if (vivo) setUsuarios(Array.isArray(data) ? data : (data?.usuarios ?? []));
      })
      .catch((err) => { if (vivo) setError(mensajeCarga(err)); })
      .finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, []);

  const visibles = filtroRol ? usuarios.filter((u) => u.rol === filtroRol) : usuarios;

  const cambiarEstado = async () => {
    const u = usuarioEstado;
    const deshabilitar = esActivo(u);
    try {
      if (deshabilitar) await deshabilitarUsuario(u.id);
      else              await habilitarUsuario(u.id);
    } catch (err) {
      // 404: ya no pertenece a la distribuidora (o fue eliminado); se quita de la lista.
      if (err?.response?.status === 404) {
        setUsuarios((lista) => lista.filter((x) => x.id !== u.id));
        setToast({ show: true, msg: "Ese usuario no pertenece a tu distribuidora.", type: "error" });
        return;
      }
      throw err;
    }
    setUsuarios((lista) => lista.map((x) => (x.id === u.id ? { ...x, activo: !deshabilitar, habilitado: !deshabilitar } : x)));
    setToast({
      show: true,
      msg: deshabilitar ? `Se deshabilitó a ${u.nombre}.` : `Se habilitó a ${u.nombre}.`,
      type: "success",
    });
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in-up">
          <div>
            <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-1">
              Usuarios de {nombreDistribuidora ?? "tu distribuidora"}
            </p>
            <h1 className="font-display text-2xl font-extrabold text-ink tracking-tight">
              Seguridad y Gestión de Usuarios
            </h1>
            <p className="text-sm text-muted mt-1 max-w-xl">
              Administra los accesos de tu personal de Ventas e Inventarios y supervisa su actividad en GELOX.
            </p>
          </div>
          {esAdmin && (
            <button
              type="button"
              className={`${btnPrimary} shrink-0 self-start sm:self-auto`}
              onClick={() => navigate("/usuarios/nuevo")}
            >
              <AddUserIcon />
              Añadir Nuevo Usuario
            </button>
          )}
        </div>

        {/* Alcance: solo la propia distribuidora (RF62) */}
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-surface text-sm text-faint animate-fade-in-up [animation-delay:40ms]">
          <span className="text-primary shrink-0 mt-0.5"><InfoIcon /></span>
          <p>
            Solo ves y administras los usuarios de{" "}
            <strong className="text-ink">{nombreDistribuidora ?? "tu distribuidora"}</strong>. Puedes crear, editar y
            deshabilitar cuentas de Encargado de Ventas y Encargado de Inventarios.
          </p>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden animate-fade-in-up [animation-delay:80ms]">
          <div className="flex items-center justify-between gap-3 flex-wrap px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-ink">
              <span className="text-faint">
                <UsersIcon />
              </span>
              Directorio de Personal
            </div>
            <div className="flex items-center gap-1.5">
              {FILTROS.map((f) => {
                const activo = filtroRol === f.value;
                return (
                  <button
                    key={f.value || "todos"}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => setFiltroRol(f.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition duration-300 active:scale-[0.97] ${
                      activo
                        ? "bg-primary border-primary text-white shadow-[0_2px_8px_rgba(158,32,22,0.25)]"
                        : "bg-white border-border text-ink hover:bg-surface"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="px-6 py-4">
              <div className="px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm animate-slide-down flex items-start gap-2">
                <svg width="15" height="15" className="shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-muted text-sm">
              <span className="w-5 h-5 rounded-full border-2 border-muted/30 border-t-muted animate-spin" />
              Cargando usuarios...
            </div>
          ) : !error && visibles.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted text-sm">
              {usuarios.length === 0
                ? "No hay usuarios registrados."
                : `No hay usuarios de ${FILTROS.find((f) => f.value === filtroRol)?.label}.`}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface text-left">
                    <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                      Rol de Acceso
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                      Último Acceso
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibles.map((u) => {
                    const rolLabel = ROL_LABEL[u.rol] ?? u.rol ?? "—";
                    const esAdminRol = u.rol === "ADMINISTRADOR";
                    const activo = esActivo(u);

                    return (
                      <tr
                        key={u.id ?? u.correo}
                        className="hover:bg-surface/50 transition duration-150"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center shrink-0 overflow-hidden ${
                              activo ? "bg-primary-tint text-primary" : "bg-surface text-muted"
                            }`}>
                              {u.fotoUrl ? (
                                <img
                                  src={u.fotoUrl}
                                  alt={u.nombre}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                iniciales(u.nombre)
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-ink">
                                {u.nombre}
                              </div>
                              <div className="text-xs text-muted">
                                {u.correo}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              esAdminRol
                                ? "bg-primary-tint text-primary"
                                : "bg-border text-faint"
                            }`}
                          >
                            {rolLabel}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              activo
                                ? "bg-green-50 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${activo ? "bg-green-500" : "bg-gray-400"}`}
                            />
                            {activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-muted whitespace-nowrap">
                          {formatearUltimoAcceso(
                            u.ultimo_acceso ?? u.ultimoAcceso,
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {!esAdmin ? (
                            <span className="text-xs text-divider">—</span>
                          ) : sinAcciones(u) ? (
                            <span className="text-xs text-muted whitespace-nowrap">
                              {esGerenteTitular(u) ? "Titular · sin acciones" : "Sin acciones"}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className={`${btnFila} text-ink bg-surface hover:bg-border`}
                                onClick={() =>
                                  navigate(`/usuarios/${u.id}/editar`, {
                                    state: u,
                                  })
                                }
                                title={`Editar a ${u.nombre}`}
                              >
                                <PencilIcon />
                                Editar
                              </button>
                              {/* Ambas etiquetas comparten la celda del grid: el botón mide lo mismo
                                  en todas las filas y no cambia de ancho al habilitar o deshabilitar. */}
                              <button
                                type="button"
                                className={`${btnFila} ${activo
                                  ? "text-error-fg bg-error-bg hover:bg-[#ffc8c2]"
                                  : "text-green-700 bg-green-50 hover:bg-green-100"}`}
                                onClick={() => setUsuarioEstado(u)}
                                title={`${activo ? "Deshabilitar" : "Habilitar"} a ${u.nombre}`}
                              >
                                <span className="grid">
                                  <span className={`col-start-1 row-start-1 flex items-center justify-center gap-1.5 ${activo ? "" : "invisible"}`}>
                                    <BanIcon />
                                    Deshabilitar
                                  </span>
                                  <span className={`col-start-1 row-start-1 flex items-center justify-center gap-1.5 ${activo ? "invisible" : ""}`}>
                                    <CheckIcon />
                                    Habilitar
                                  </span>
                                </span>
                              </button>
                            </div>
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

      <ModalEstadoUsuario
        usuario={usuarioEstado}
        onConfirmar={cambiarEstado}
        onCerrar={() => setUsuarioEstado(null)}
      />

      <SuccessToast
        message={toast.msg}
        show={toast.show}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />
    </AppLayout>
  );
}
