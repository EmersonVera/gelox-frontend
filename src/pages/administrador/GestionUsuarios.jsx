import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/AppLayout";
import { useAuth } from "../../context/AuthContext";
import { getUsuarios } from "../../services/usuariosService";

/* ── Constants ── */
const ROL_LABEL = {
  ADMINISTRADOR: "Gerente General",
  ENCARGADO_INVENTARIO: "Encargado de Inventarios",
  ENCARGADO_VENTAS: "Encargado de Ventas",
};

/* ── Helpers ── */
function getInitials(nombre) {
  if (!nombre) return "?";
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

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

/* ── Shared class strings ── */
const btnPrimary =
  "inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition duration-300 active:scale-[0.97] shadow-[0_2px_8px_rgba(158,32,22,0.25)] disabled:opacity-60";

/* ══════════════════════════════════════════════
   Main page
══════════════════════════════════════════════ */
export default function GestionUsuarios() {
  const { perfil } = useAuth();
  const navigate = useNavigate();
  const esAdmin = perfil?.rol === "ADMINISTRADOR";

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargarUsuarios = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getUsuarios();
      setUsuarios(Array.isArray(data) ? data : (data?.usuarios ?? []));
    } catch {
      setError(
        "No se pudo cargar la lista de usuarios. Verifica tu conexión e intenta de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

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

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-ink tracking-tight">
              Seguridad y Gestión de Usuarios
            </h1>
            <p className="text-sm text-muted mt-1 max-w-xl">
              Administra los accesos del personal, define roles y supervisa la
              actividad del sistema GELOX en tiempo real.
            </p>
          </div>
          {esAdmin && (
            <button
              type="button"
              className={`${btnPrimary} shrink-0`}
              onClick={() => navigate("/usuarios/nuevo")}
            >
              <AddUserIcon />
              Añadir Nuevo Usuario
            </button>
          )}
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden animate-fade-in-up [animation-delay:80ms]">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border text-sm font-semibold text-ink">
            <span className="text-faint">
              <UsersIcon />
            </span>
            Directorio de Personal
          </div>

          {error && (
            <div className="px-6 py-4">
              <div className="px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm animate-slide-down">
                {error}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-muted text-sm">
              <span className="w-5 h-5 rounded-full border-2 border-muted/30 border-t-muted animate-spin" />
              Cargando usuarios...
            </div>
          ) : !error && usuarios.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted text-sm">
              No hay usuarios registrados.
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
                  {usuarios.map((u) => {
                    const rolLabel = ROL_LABEL[u.rol] ?? u.rol ?? "—";
                    const esAdminRol = u.rol === "ADMINISTRADOR";

                    return (
                      <tr
                        key={u.id ?? u.correo}
                        className="hover:bg-surface/50 transition duration-150"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary-tint text-primary text-xs font-bold flex items-center justify-center shrink-0 overflow-hidden">
                              {u.foto_url ? (
                                <img
                                  src={u.foto_url}
                                  alt={u.nombre}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                getInitials(u.nombre)
                              )}
                            </div>
                            <div>
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
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              esAdminRol
                                ? "bg-primary-tint text-primary"
                                : "bg-border text-faint"
                            }`}
                          >
                            {rolLabel}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          {(() => {
                            const activo =
                              u.habilitado !== false && u.activo !== false;
                            return (
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
                            );
                          })()}
                        </td>

                        <td className="px-4 py-4 text-sm text-muted">
                          {formatearUltimoAcceso(
                            u.ultimo_acceso ?? u.ultimoAcceso,
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {esAdmin && !esAdminRol ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink bg-surface rounded-lg hover:bg-border transition duration-300 active:scale-95"
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
                          ) : (
                            <span className="text-xs text-divider">—</span>
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
    </AppLayout>
  );
}
