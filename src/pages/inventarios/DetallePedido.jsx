// src/pages/inventarios/DetallePedido.jsx — RF22 (Vista 2): Comparación de pedido
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/AppLayout';

const base = import.meta.env.VITE_API_BASE_URL ?? '';

const BADGE_ESTADO = {
  CORRECTO: 'bg-[#f0fdf4] text-[#16a34a]',
  FALTANTE: 'bg-[#fef2f2] text-[#dc2626]',
  SOBRANTE: 'bg-[#fefce8] text-[#ca8a04]',
};
const ICONO_ESTADO = { CORRECTO: '✓', FALTANTE: '⊘', SOBRANTE: '↑' };

export default function DetallePedido() {
  const { id }      = useParams();
  const { token }   = useAuth();
  const navigate    = useNavigate();
  const [pedido, setPedido]   = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch(`${base}/api/inventario/pedidos/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        // 500/404 = endpoint GET por ID aún no implementado en el backend
        if (!r.ok) return null;
        return r.json();
      })
      .then(data => { if (data) setPedido(data); })
      .catch(() => { /* endpoint no disponible */ })
      .finally(() => setCargando(false));
  }, [id, token]);

  if (cargando) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="h-8 bg-[#f6f3f3] rounded w-48" />
          <div className="h-20 bg-[#f6f3f3] rounded-[12px]" />
          <div className="h-64 bg-[#f6f3f3] rounded-[12px]" />
        </div>
      </AppLayout>
    );
  }

  if (!pedido) {
    return (
      <AppLayout>
        <div className="text-center py-16 font-['Inter'] text-[#78716c]">
          Pedido no encontrado.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">

        {/* Breadcrumb */}
        <button
          onClick={() => navigate('/inventarios/reporte-pedido')}
          className="flex items-center gap-2 font-['Inter'] font-medium text-[14px] text-[#57534e] hover:text-[#1b1b1c] cursor-pointer transition-colors w-fit"
        >
          ← Todos los pedidos
        </button>

        {/* Info pedido */}
        <div className="bg-white rounded-[12px] border border-[#f5f5f4] p-5 flex items-center gap-4">
          <span className="font-['Manrope'] font-bold text-[18px] text-[#1b1b1c]">
            {pedido.id_pedido ?? pedido.id}
          </span>
          <span
            className={`inline-flex items-center font-['Inter'] font-bold text-[12px] uppercase px-3 py-1 rounded-full ${
              pedido.estado === 'DISCREPANCIA'
                ? 'bg-[#fef2f2] text-[#dc2626]'
                : pedido.estado === 'COMPLETO'
                ? 'bg-[#f0fdf4] text-[#16a34a]'
                : 'bg-[#fefce8] text-[#ca8a04]'
            }`}
          >
            {pedido.estado}
          </span>
          <div className="flex items-center gap-1 text-[#78716c] ml-2">
            <span>📅</span>
            <span className="font-['Inter'] font-normal text-[14px]">{pedido.fecha}</span>
          </div>
        </div>

        {/* Tabla comparación */}
        <div className="bg-white rounded-[12px] border border-[#f5f5f4] overflow-hidden">
          <div className="p-6 border-b border-[#fafaf9]">
            <h2 className="font-['Manrope'] font-semibold text-[18px] text-[#1b1b1c]">
              Comparación de Productos
            </h2>
          </div>

          {/* Encabezados */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 bg-[#fafaf9] border-b border-[#f5f5f4]">
            {['Producto', 'ID SKU', 'Cant. Pedida', 'Cant. Recibida', 'Diferencia', 'Estado'].map(h => (
              <span
                key={h}
                className="font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#a8a29e]"
              >
                {h}
              </span>
            ))}
          </div>

          {/* Filas */}
          {(!pedido.items || pedido.items.length === 0) ? (
            <div className="px-6 py-12 text-center font-['Inter'] text-[14px] text-[#a8a29e]">
              Sin ítems registrados.
            </div>
          ) : (
            pedido.items.map(item => {
              const dif        = (item.cantidad_recibida ?? 0) - item.cantidad_pedida;
              const estadoItem = dif === 0 ? 'CORRECTO' : dif < 0 ? 'FALTANTE' : 'SOBRANTE';
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-4 border-b border-[#fafaf9] items-center"
                >
                  {/* Producto */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[6px] bg-[#f6f3f3] shrink-0 overflow-hidden">
                      {(item.imagenUrl || item.imagen_url) && (
                        <img
                          src={item.imagenUrl ?? item.imagen_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <p className="font-['Manrope'] font-semibold text-[14px] text-[#1b1b1c]">
                        {item.nombre}
                      </p>
                      <p className="font-['Inter'] font-normal text-[12px] text-[#a8a29e]">
                        {item.descripcion}
                      </p>
                    </div>
                  </div>
                  {/* SKU */}
                  <span className="font-['Inter'] font-medium text-[14px] text-[#57534e]">
                    {item.codigoTecnico ?? item.codigo_tecnico}
                  </span>
                  {/* Cant. pedida */}
                  <span className="font-['Inter'] font-medium text-[14px] text-[#1b1b1c]">
                    {item.cantidad_pedida}
                  </span>
                  {/* Cant. recibida */}
                  <span className="font-['Inter'] font-medium text-[14px] text-[#1b1b1c]">
                    {item.cantidad_recibida ?? '—'}
                  </span>
                  {/* Diferencia */}
                  <span
                    className={`font-['Inter'] font-bold text-[14px] ${
                      dif < 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'
                    }`}
                  >
                    {dif > 0 ? `+${dif}` : dif}
                  </span>
                  {/* Estado badge */}
                  <span
                    className={`inline-flex items-center gap-1 font-['Inter'] font-bold text-[12px] uppercase px-3 py-1 rounded-full ${
                      BADGE_ESTADO[estadoItem]
                    }`}
                  >
                    {ICONO_ESTADO[estadoItem]} {estadoItem}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
