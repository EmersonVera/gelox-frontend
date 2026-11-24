// src/pages/inventarios/GenerarPedido.jsx — RF21: Generar Pedido a Proveedor
// Flujo: 1) elegir un proveedor activo → 2) ajustar cantidades de sus productos →
// resumen con fecha estimada de entrega (días hábiles) y aviso de monto mínimo.
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/AppLayout';
import SuccessToast from '../../components/SuccessToast';
import Pagination from '../../components/ui/Pagination';
import useDatosVoz from '../../hooks/useDatosVoz';
import { listarProveedoresActivos } from '../../services/proveedoresService';
import {
  formatoCOP, iniciales, sumarDiasHabiles, formatoFechaCorta, formatoDias, mensajeError, productosDeProveedor,
} from '../../components/inventarios/proveedoresUtils';
import { presentacion, etiquetaPresentacion } from '../../components/catalogo/unidadesUtils';

const base = import.meta.env.VITE_API_BASE_URL ?? '';
const PAGE_SIZE = 8;
const CLAVE_MODELO = (proveedorId) => `gelox_pedido_modelo_${proveedorId}`;

/* RF21 — producto por debajo (o en) su stock mínimo configurado (sin mínimo configurado no aplica) */
const estaBajoMinimo = (p) =>
  p.stockActual != null && p.stockMinimo != null && p.stockMinimo > 0 && p.stockActual <= p.stockMinimo;

const estaEnAlerta = (p) =>
  !estaBajoMinimo(p) && p.stockActual != null && p.stockMedio != null && p.stockMedio > 0 && p.stockActual <= p.stockMedio;

/** Cantidad sugerida en la presentación de compra: reponer hasta el stock medio (o el mínimo). */
function cantidadSugerida(p) {
  const objetivo = Math.max(p.stockMedio ?? 0, p.stockMinimo ?? 0);
  const faltante = Math.max(1, objetivo - (p.stockActual ?? 0));
  const { agrupa, factor } = presentacion(p);
  return agrupa ? Math.ceil(faltante / factor) : faltante;
}

/** Costo de una línea: precioCosto es por presentación de compra (o por unidad si no agrupa). */
const subtotal = (p, cantidad) => Number(p.precioCosto ?? 0) * cantidad;

function EstadoStock({ producto }) {
  if (producto.stockActual === 0 || estaBajoMinimo(producto)) {
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#fef2f2] text-[#dc2626]">Crítico</span>;
  }
  if (estaEnAlerta(producto)) {
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#fffbeb] text-[#d97706]">Alerta</span>;
  }
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f0fdf4] text-[#16a34a]">Estable</span>;
}

function stockEnPresentacion(p) {
  if (p.stockActual == null) return '—';
  const pr = presentacion(p);
  if (!pr.agrupa) return `${p.stockActual} ${pr.venta.abrev}`;
  const n = Math.floor(p.stockActual / pr.factor);
  return `${n} ${(n === 1 ? pr.singular : pr.plural).toLowerCase()}`;
}

function Cantidad({ value, onChange }) {
  const activo = value > 0;
  return (
    <div className={`inline-flex items-center rounded-lg border bg-white ${activo ? 'border-primary' : 'border-border'}`}>
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="w-7 h-8 text-primary hover:bg-primary/5 rounded-l-lg" aria-label="Restar">−</button>
      <input
        value={value}
        inputMode="numeric"
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0))}
        className="w-10 text-center text-sm font-bold text-ink outline-none bg-transparent"
        aria-label="Cantidad"
      />
      <button type="button" onClick={() => onChange(value + 1)} className="w-7 h-8 text-primary hover:bg-primary/5 rounded-r-lg" aria-label="Sumar">+</button>
    </div>
  );
}

export default function GenerarPedido() {
  const { token } = useAuth();
  const [proveedores, setProveedores] = useState([]);
  const [proveedorId, setProveedorId] = useState('');
  const [productos, setProductos]     = useState([]);
  // { [productoId]: cantidad en la presentación de compra }; solo cantidades > 0
  const [cantidades, setCantidades]   = useState({});
  const [busqueda, setBusqueda]       = useState('');
  const [soloStockBajo, setSoloStockBajo] = useState(false);
  const [pagina, setPagina]           = useState(1);
  const [cargando, setCargando]       = useState(true);
  const [generando, setGenerando]     = useState(false);
  const [error, setError]             = useState('');
  const [preseleccionados, setPreseleccionados] = useState(0);
  const [toast, setToast]             = useState({ show: false, msg: '', type: 'success' });

  const mostrarToast = (msg, type = 'success') => setToast({ show: true, msg, type });

  /* ── Carga inicial: proveedores activos + catálogo ── */
  useEffect(() => {
    let vivo = true;
    const catalogo = fetch(`${base}/api/catalogo/productos?page=0&size=500`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (res) => {
      if (!res.ok) throw Object.assign(new Error(), { status: res.status });
      const data = await res.json();
      const list = Array.isArray(data.content) ? data.content : (data.productos ?? data);
      return Array.isArray(list) ? list : [];
    });

    Promise.all([listarProveedoresActivos(), catalogo])
      .then(([provs, prods]) => {
        if (!vivo) return;
        setProveedores(provs);
        setProductos(prods);
      })
      .catch((e) => {
        if (!vivo) return;
        if (e?.response) setError(mensajeError(e, 'No se pudieron cargar los proveedores.'));
        else if (!e?.status || e instanceof TypeError) setError('Sin conexión a internet. No se pudo cargar el catálogo de productos.');
        else if (e.status === 403) setError('No tienes permisos para ver el catálogo de productos.');
        else if (e.status >= 500) setError('Error en el servidor al cargar el catálogo. Intenta más tarde.');
        else setError('No se pudo cargar el catálogo de productos. Intenta de nuevo.');
      })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [token]);

  const proveedor = proveedores.find((p) => p.id === proveedorId) ?? null;
  const { lista: productosProveedor, sinAsignar } = useMemo(
    () => (proveedorId ? productosDeProveedor(productos, proveedorId) : { lista: [], sinAsignar: false }),
    [productos, proveedorId],
  );

  /* RF21 — al elegir el proveedor se preseleccionan sus productos bajo el stock mínimo */
  const elegirProveedor = (id) => {
    if (id === proveedorId) return;
    // Lo dictado por voz antes de elegir proveedor se conserva en lugar de la preselección.
    if (!proveedorId && Object.keys(cantidades).length > 0) {
      setProveedorId(id);
      setPreseleccionados(0);
      return;
    }
    const { lista } = productosDeProveedor(productos, id);
    const sugeridos = Object.fromEntries(lista.filter(estaBajoMinimo).map((p) => [p.id, cantidadSugerida(p)]));
    setProveedorId(id);
    setCantidades(sugeridos);
    setPreseleccionados(Object.keys(sugeridos).length);
    setBusqueda('');
    setSoloStockBajo(false);
    setPagina(1);
  };

  // Viene del asistente de voz ("Editar en Generar pedido"): el pedido es lo dictado.
  const itemsVoz = useDatosVoz('itemsVoz', !cargando);
  if (itemsVoz) {
    const porId = new Map(productos.map((p) => [p.id, p]));
    const dictados = itemsVoz.filter((i) => porId.has(i.productoId));
    const proveedorVoz = dictados.map((i) => porId.get(i.productoId).proveedorId).find(Boolean);
    if (proveedorVoz && proveedores.some((p) => p.id === proveedorVoz)) setProveedorId(proveedorVoz);
    setCantidades(Object.fromEntries(dictados.map((i) => {
      const { agrupa } = presentacion(porId.get(i.productoId));
      return [i.productoId, agrupa ? i.cajas : i.unidades];
    }).filter(([, n]) => n > 0)));
    setPreseleccionados(0);
  }

  const cambiarCantidad = (id, n) =>
    setCantidades((prev) => {
      const sig = { ...prev };
      if (n > 0) sig[id] = n; else delete sig[id];
      return sig;
    });

  /* ── Lista visible ── */
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productosProveedor
      .filter((p) => !soloStockBajo || p.stockActual === 0 || estaBajoMinimo(p) || estaEnAlerta(p))
      .filter((p) => !q
        || p.nombre?.toLowerCase().includes(q)
        || (p.sku ?? p.codigoTecnico)?.toLowerCase().includes(q)
        || p.marca?.toLowerCase().includes(q))
      .sort((a, b) => {
        const urg = (p) => (p.stockActual === 0 || estaBajoMinimo(p) ? 0 : estaEnAlerta(p) ? 1 : 2);
        return urg(a) - urg(b) || (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es');
      });
  }, [productosProveedor, busqueda, soloStockBajo]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  /* ── Resumen ── */
  const porId = useMemo(() => new Map(productosProveedor.map((p) => [p.id, p])), [productosProveedor]);
  const lineas = Object.entries(cantidades)
    .filter(([id]) => porId.has(id))
    .map(([id, cantidad]) => ({ producto: porId.get(id), cantidad }));
  const totalPresentaciones = lineas.reduce((s, l) => s + l.cantidad, 0);
  const total = lineas.reduce((s, l) => s + subtotal(l.producto, l.cantidad), 0);
  const minimo = Number(proveedor?.montoMinimo ?? 0);
  const avance = minimo > 0 ? Math.min(100, (total / minimo) * 100) : 100;
  const bajoMinimo = minimo > 0 && total < minimo;
  const entrega = proveedor ? sumarDiasHabiles(proveedor.tiempoEntregaDias) : null;
  const sinCosto = lineas.some((l) => !Number(l.producto.precioCosto));

  /* ── Pedido modelo (por proveedor) ── */
  const guardarModelo = () => {
    if (!proveedor || lineas.length === 0) return;
    localStorage.setItem(CLAVE_MODELO(proveedor.id), JSON.stringify(
      lineas.map((l) => ({ productoId: l.producto.id, nombre: l.producto.nombre, cantidad: l.cantidad })),
    ));
    mostrarToast(`Pedido modelo de ${proveedor.nombreComercial} guardado.`);
  };

  const cargarModelo = () => {
    if (!proveedor) return;
    let modelo;
    try { modelo = JSON.parse(localStorage.getItem(CLAVE_MODELO(proveedor.id)) ?? '[]'); } catch { modelo = []; }
    if (!Array.isArray(modelo)) modelo = [];
    const cargados = modelo.filter((m) => porId.has(m.productoId) && m.cantidad > 0);
    if (cargados.length === 0) {
      mostrarToast(`No hay un pedido modelo guardado para ${proveedor.nombreComercial}.`, 'info');
      return;
    }
    setCantidades(Object.fromEntries(cargados.map((m) => [m.productoId, m.cantidad])));
    setPreseleccionados(0);
    mostrarToast('Pedido modelo cargado. Puedes ajustar las cantidades.');
  };

  /* ── Generar ── */
  const generar = async (debajoMinimo = false) => {
    if (!proveedor || lineas.length === 0) return;
    setGenerando(true);
    try {
      const res = await fetch(`${base}/api/inventario/pedidos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proveedorId: proveedor.id,
          debajoMinimo,
          items: lineas.map(({ producto, cantidad }) => {
            const pr = presentacion(producto);
            return {
              productoId:       producto.id,
              cantidadCajas:    pr.agrupa ? cantidad : 0,
              cantidadUnidades: pr.agrupa ? 0 : cantidad,
              unidadCompra:     pr.codigo,
              factorConversion: pr.factor,
            };
          }),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error ?? errData.mensaje ?? errData.message ?? '';
        if (res.status === 400) throw new Error(msg || 'Datos del pedido inválidos. Revisa las cantidades.');
        if (res.status >= 500)  throw new Error('Error en el servidor al generar el pedido. Intenta más tarde.');
        throw new Error(msg || 'No se pudo generar el pedido.');
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const slug = proveedor.nombreComercial.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      a.href     = url;
      a.download = `pedido-${slug}-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setCantidades({});
      setPreseleccionados(0);
      mostrarToast(`Pedido a ${proveedor.nombreComercial} generado y descargado.`);
    } catch (e) {
      mostrarToast(e.message || 'No se pudo generar el pedido. Intenta de nuevo.', 'error');
    } finally {
      setGenerando(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs text-muted mb-1">
              Inventario › <span className="text-primary font-semibold">Generar pedido</span>
            </p>
            <h1 className="font-display text-2xl font-extrabold text-ink tracking-tight">Generar pedido</h1>
            <p className="text-sm text-muted mt-1">
              Elige el proveedor, ajusta las cantidades y genera el archivo con su plantilla de exportación.
            </p>
          </div>
          <button
            type="button"
            onClick={cargarModelo}
            disabled={!proveedor}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-border bg-white rounded-xl text-sm font-semibold text-ink hover:bg-surface transition disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto"
          >
            ★ Cargar pedido modelo
          </button>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm">{error}</div>
        )}

        {/* 1. Proveedor */}
        <section className="bg-white rounded-2xl border border-border p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-ink">1. Proveedor</h2>
              <p className="text-xs text-muted">Solo se muestran los proveedores activos</p>
            </div>
            <span className="text-xs text-muted">{proveedores.length} activo{proveedores.length === 1 ? '' : 's'}</span>
          </div>

          {cargando ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-[96px] rounded-xl bg-surface animate-pulse" />)}
            </div>
          ) : proveedores.length === 0 ? (
            <p className="text-sm text-muted py-4">
              No hay proveedores activos. Regístralos o actívalos en <strong>Proveedores</strong>.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3" role="radiogroup" aria-label="Proveedor">
              {proveedores.map((p) => {
                const activo = p.id === proveedorId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={activo}
                    onClick={() => elegirProveedor(p.id)}
                    className={`text-left rounded-xl border-2 px-4 py-3.5 transition ${
                      activo ? 'border-primary bg-[#fef2f2]' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${activo ? 'border-primary' : 'border-[#d6d3d1]'}`}>
                        {activo && <span className="w-2 h-2 rounded-full bg-primary" />}
                      </span>
                      <span className="w-7 h-7 rounded-lg bg-surface text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                        {iniciales(p.nombreComercial)}
                      </span>
                      <span className={`text-sm font-bold truncate ${activo ? 'text-primary' : 'text-ink'}`}>{p.nombreComercial}</span>
                    </div>
                    <p className="text-xs text-muted mt-2 pl-[26px]">
                      Mínimo <strong className="text-ink">{formatoCOP(p.montoMinimo)}</strong>
                    </p>
                    <p className="text-xs text-muted pl-[26px]">
                      Entrega {formatoDias(p.tiempoEntregaDias)} hábiles{p.plantilla ? ` · ${p.plantilla}` : ''}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {!proveedor && Object.keys(cantidades).length > 0 && (
          <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl px-4 py-3 text-sm text-[#1e40af]">
            Tienes {Object.keys(cantidades).length} producto(s) dictados por voz. Elige el proveedor para revisarlos y generar el pedido.
          </div>
        )}

        {proveedor && preseleccionados > 0 && (
          <div className="bg-[#fffbeb] border border-[#fcd34d] rounded-xl px-4 py-3 flex items-start gap-2.5 text-sm text-[#92400e]">
            <span className="flex-1">
              Se agregaron {preseleccionados} producto(s) de {proveedor.nombreComercial} que están por debajo de su stock mínimo,
              con la cantidad sugerida para reponer hasta el stock medio. Puedes ajustarlas o dejarlas en 0.
            </span>
            <button onClick={() => setPreseleccionados(0)} className="opacity-60 hover:opacity-100" aria-label="Cerrar aviso">✕</button>
          </div>
        )}

        {proveedor && (
          <div className="grid gap-6 items-start xl:grid-cols-[minmax(0,1fr)_380px]">

            {/* 2. Productos del proveedor */}
            <section className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-6 py-4">
                <div>
                  <h2 className="font-display text-base font-bold text-ink">2. Productos de {proveedor.nombreComercial}</h2>
                  <p className="text-xs text-muted">
                    {productosProveedor.length} producto{productosProveedor.length === 1 ? '' : 's'} de este proveedor · cantidades en unidad de compra
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="search"
                    value={busqueda}
                    onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                    placeholder="Buscar producto"
                    className="w-[200px] px-3.5 py-2 border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    aria-pressed={soloStockBajo}
                    onClick={() => { setSoloStockBajo((v) => !v); setPagina(1); }}
                    className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition ${
                      soloStockBajo ? 'bg-primary border-primary text-white' : 'bg-white border-border text-ink hover:bg-surface'
                    }`}
                  >
                    Con stock bajo
                  </button>
                </div>
              </div>

              {sinAsignar && (
                <div className="mx-6 mb-3 px-4 py-2.5 rounded-xl bg-[#fffbeb] border border-[#fcd34d] text-[#92400e] text-xs">
                  El catálogo todavía no trae el proveedor de cada producto, así que se muestran todos.
                  Asigna el proveedor en el catálogo para filtrar este pedido.
                </div>
              )}

              {filtrados.length === 0 ? (
                <p className="text-sm text-muted text-center py-12">
                  {busqueda || soloStockBajo
                    ? 'Ningún producto coincide con la búsqueda o el filtro.'
                    : 'Este proveedor no tiene productos en el catálogo.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead>
                      <tr className="bg-surface text-left">
                        <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Producto</th>
                        <th className="px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wider text-right">Stock</th>
                        <th className="px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Unidad</th>
                        <th className="px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wider text-right">Costo</th>
                        <th className="px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wider text-center">Cantidad</th>
                        <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {visibles.map((p) => {
                        const cantidad = cantidades[p.id] ?? 0;
                        const tenue = cantidad === 0 ? 'opacity-60' : '';
                        return (
                          <tr key={p.id}>
                            <td className={`px-6 py-3 ${tenue}`}>
                              <p className="text-sm font-semibold text-ink">{p.nombre}</p>
                              <p className="text-xs text-muted font-mono">
                                {p.sku ?? p.codigoTecnico}{p.marca ? ` · ${p.marca}` : ''}
                              </p>
                            </td>
                            <td className={`px-3 py-3 text-right ${tenue}`}>
                              <p className="text-sm text-ink whitespace-nowrap">{stockEnPresentacion(p)}</p>
                              <EstadoStock producto={p} />
                            </td>
                            <td className={`px-3 py-3 text-sm text-ink whitespace-nowrap ${tenue}`}>{etiquetaPresentacion(p)}</td>
                            <td className={`px-3 py-3 text-sm text-ink text-right whitespace-nowrap ${tenue}`}>
                              {p.precioCosto ? formatoCOP(p.precioCosto) : '—'}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <Cantidad value={cantidad} onChange={(n) => cambiarCantidad(p.id, n)} />
                            </td>
                            <td className={`px-6 py-3 text-sm font-bold text-ink text-right whitespace-nowrap ${tenue}`}>
                              {formatoCOP(subtotal(p, cantidad))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="border-t border-border px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-muted">
                  {lineas.length} producto{lineas.length === 1 ? '' : 's'} con cantidad · {totalPresentaciones} en unidad de compra
                </p>
                {totalPaginas > 1 && <Pagination page={paginaActual} totalPages={totalPaginas} onPageChange={setPagina} />}
              </div>
            </section>

            {/* Resumen */}
            <aside className="bg-white rounded-2xl border border-border xl:sticky xl:top-6">
              <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border">
                <div>
                  <h2 className="font-display text-base font-bold text-ink">Resumen del pedido</h2>
                  <p className="text-xs text-muted">Borrador</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-surface text-xs font-semibold text-muted">Pendiente</span>
              </div>

              <dl className="px-6 py-4 flex flex-col gap-2.5 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-muted">Proveedor</dt><dd className="text-ink text-right">{proveedor.nombreComercial}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted">Productos / cantidad</dt><dd className="text-ink">{lineas.length} / {totalPresentaciones}</dd></div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Entrega estimada</dt>
                  <dd className="text-ink text-right">{formatoFechaCorta(entrega)} · {formatoDias(proveedor.tiempoEntregaDias)} hábiles</dd>
                </div>
                <div className="flex justify-between gap-3"><dt className="text-muted">Archivo</dt><dd className="text-ink text-right">{proveedor.plantilla || 'Formato estándar'} · XLSX</dd></div>
              </dl>

              <div className="px-6 pb-4">
                <div className="border-t border-dashed border-border pt-4 flex items-baseline justify-between">
                  <span className="text-sm font-bold text-ink">Total del pedido</span>
                  <span className="font-display text-2xl font-extrabold text-ink">{formatoCOP(total)}</span>
                </div>
                {minimo > 0 && (
                  <>
                    <div className="flex justify-between text-xs mt-2">
                      <span className="text-muted">Monto mínimo {formatoCOP(minimo)}</span>
                      <span className={`font-bold ${bajoMinimo ? 'text-[#d97706]' : 'text-[#16a34a]'}`}>{Math.floor(avance)} %</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface mt-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${bajoMinimo ? 'bg-[#d97706]' : 'bg-[#16a34a]'}`}
                        style={{ width: `${avance}%` }}
                      />
                    </div>
                  </>
                )}

                {bajoMinimo && lineas.length > 0 && (
                  <div className="mt-4 rounded-xl bg-[#fffbeb] border border-[#fcd34d] px-4 py-3 text-xs text-[#92400e]" role="status">
                    <p className="font-bold">No alcanzas el monto mínimo</p>
                    <p className="mt-1">
                      Faltan <strong>{formatoCOP(minimo - total)}</strong> para el mínimo de {proveedor.nombreComercial}.
                      El proveedor puede rechazar el pedido. Agrega productos o genera el pedido de todas formas.
                    </p>
                  </div>
                )}
                {sinCosto && (
                  <p className="mt-3 text-xs text-muted">
                    Algunos productos no tienen costo registrado: el total puede quedar por debajo del real.
                  </p>
                )}
              </div>

              <div className="px-6 py-4 border-t border-border flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => generar(false)}
                  disabled={generando || lineas.length === 0 || bajoMinimo}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark transition disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  {generando && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
                  {generando ? 'Generando...' : 'Generar pedido'}
                </button>
                {bajoMinimo && lineas.length > 0 && (
                  <button
                    type="button"
                    onClick={() => generar(true)}
                    disabled={generando}
                    className="w-full py-3 border-2 border-[#fcd34d] text-[#b45309] text-sm font-bold rounded-xl hover:bg-[#fffbeb] transition disabled:opacity-60"
                  >
                    Generar por debajo del mínimo
                  </button>
                )}
                {lineas.length > 0 && (
                  <div className="flex items-center justify-between pt-1">
                    <button type="button" onClick={guardarModelo} className="text-xs font-semibold text-primary hover:underline">
                      ★ Guardar como modelo
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCantidades({}); setPreseleccionados(0); }}
                      className="text-xs text-muted hover:text-ink underline"
                    >
                      Vaciar pedido
                    </button>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>

      <SuccessToast
        message={toast.msg}
        show={toast.show}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
        type={toast.type}
      />
    </AppLayout>
  );
}
