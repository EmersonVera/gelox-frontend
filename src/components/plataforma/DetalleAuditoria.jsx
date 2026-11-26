// src/components/plataforma/DetalleAuditoria.jsx — RF71: muestra legible el detalle de una fila de auditoría.
// FP-15 §2.14.1 / §2.16.3: auditoria.detalle es JSON guardado como texto. Si llega una frase (datos viejos),
// se muestra tal cual, resaltando el valor nuevo de «antes → después».
import { ESTADOS_DISTRIBUIDORA, ETIQUETA_ROL, formatoMB, formatoNumero, formatoPesos } from './plataformaUtils';

const ETIQUETAS = {
  nombre: 'nombre', descripcion: 'descripción', precioMensual: 'precio',
  maxUsuarios: 'máx. usuarios', maxProductos: 'máx. productos', maxComerciantes: 'máx. comerciantes',
  maxAlmacenamientoMb: 'almacenamiento máx.', maxLlamadasIaMes: 'llamadas IA/mes',
  correo: 'correo', correoGerente: 'correo del gerente', rol: 'rol', estado: 'estado',
  cupo: 'cupo', plazoDias: 'plazo', politica: 'política', tipo: 'esquema', esquema: 'esquema',
  totalCobrado: 'total cobrado', efectivoRecibido: 'efectivo recibido', comerciantes: 'comerciantes',
  sku: 'SKU', proveedor: 'proveedor', modo: 'modo', campos: 'campos',
  tiempoEntregaDias: 'entrega', montoMinimoPedido: 'pedido mínimo', valor: 'valor', plan: 'plan',
};

const PESOS = new Set(['precioMensual', 'cupo', 'totalCobrado', 'efectivoRecibido', 'montoMinimoPedido', 'valor']);

/** «SOLO_ALERTA» → «Solo alerta». */
const humanizar = (codigo) => {
  const t = String(codigo).toLowerCase().replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** «correoGerente» → «correo gerente» para claves sin etiqueta. */
const etiqueta = (clave) => ETIQUETAS[clave] ?? clave.replace(/([A-Z])/g, ' $1').toLowerCase();

function valor(clave, v) {
  if (v === null || v === undefined || v === '') return clave.startsWith('max') ? 'sin límite' : '—';
  if (Array.isArray(v)) return v.map((x) => valor(clave, x)).join(', ');
  if (typeof v === 'boolean') return v ? 'sí' : 'no';
  if (clave === 'rol') return ETIQUETA_ROL[v] ?? humanizar(v);
  if (clave === 'estado' || clave === 'estadoAnterior' || clave === 'estadoNuevo') return ESTADOS_DISTRIBUIDORA[v]?.label ?? humanizar(v);
  if (clave === 'maxAlmacenamientoMb') return formatoMB(v);
  if (clave === 'plazoDias') return `${v} día${Number(v) === 1 ? '' : 's'}`;
  if (clave === 'tiempoEntregaDias') return `${v} día${Number(v) === 1 ? '' : 's'}`;
  if (PESOS.has(clave) && typeof v === 'number') return formatoPesos(v);
  if (typeof v === 'number') return formatoNumero(v);
  if (typeof v === 'string' && /^[A-Z][A-Z_]+$/.test(v)) return humanizar(v);
  return String(v);
}

/** Esquema de liquidación: «Comisión 12 %», «Tarifa fija $15.000», «Margen». */
function esquema(e) {
  if (!e?.tipo) return '—';
  if (e.tipo === 'COMISION') return `Comisión ${formatoNumero(e.valor)} %`;
  if (e.tipo === 'TARIFA_FIJA') return `Tarifa fija ${formatoPesos(e.valor)}`;
  return humanizar(e.tipo);
}

const Nuevo = ({ children }) => <strong className="font-semibold text-ink">{children}</strong>;

/** «antes → **después**» para cada campo que cambió. */
function cambiosDe(lista) {
  return lista.map(({ campo, antes, despues }, i) => (
    <span key={campo ?? i}>
      {i > 0 && '; '}
      {etiqueta(campo)} {valor(campo, antes)} → <Nuevo>{valor(campo, despues)}</Nuevo>
    </span>
  ));
}

function DetalleTexto({ texto }) {
  const m = /^(.*?→\s)([^;]+?)((?:\.\s|;|\.$)[\s\S]*)?$/.exec(texto ?? '');
  if (!m) return texto || '—';
  return <>{m[1]}<Nuevo>{m[2]}</Nuevo>{m[3]}</>;
}

export default function DetalleAuditoria({ detalle }) {
  let d;
  try {
    d = typeof detalle === 'string' ? JSON.parse(detalle) : detalle;
  } catch {
    return <DetalleTexto texto={detalle} />;
  }
  if (typeof d === 'string') return <DetalleTexto texto={d} />;
  if (!d || typeof d !== 'object' || Object.keys(d).length === 0) return '—';

  const partes = [];
  const usadas = new Set();
  const usar = (...claves) => claves.forEach((c) => usadas.add(c));

  // Sujeto de la operación.
  if (d.cambios || d.cuotas) {
    if (d.plan) { partes.push(<span key="suj">Plan {d.plan}: </span>); usar('plan'); }
    else if (d.nombre) { partes.push(<span key="suj">«{d.nombre}»: </span>); usar('nombre'); }
  } else if (d.nombre && d.sku) {
    partes.push(<span key="suj">Producto «{d.nombre}» (SKU {d.sku}){d.proveedor ? <>, proveedor {d.proveedor}</> : null}. </span>);
    usar('nombre', 'sku', 'proveedor');
  } else if (d.nombre && (d.rol || d.correo)) {
    partes.push(<span key="suj">Usuario «{d.nombre}»{d.rol ? <> con rol {valor('rol', d.rol)}</> : null}. </span>);
    usar('nombre', 'rol');
  } else if (d.comerciante) {
    partes.push(<span key="suj">Comerciante «{d.comerciante}»: </span>);
    usar('comerciante');
  }

  // Cambios de estado o de plan, con su motivo.
  if ('estadoAnterior' in d || 'estadoNuevo' in d) {
    partes.push(<span key="est">{valor('estadoAnterior', d.estadoAnterior)} → <Nuevo>{valor('estadoNuevo', d.estadoNuevo)}</Nuevo>. </span>);
    usar('estadoAnterior', 'estadoNuevo');
  }
  if ('planAnterior' in d || 'planNuevo' in d) {
    partes.push(<span key="plan">{d.planAnterior ?? '—'} → <Nuevo>{d.planNuevo ?? '—'}</Nuevo>. </span>);
    usar('planAnterior', 'planNuevo');
  }

  // Pares «xAnterior» / «xNuevo» (ESQUEMA_LIQUIDACION_CAMBIAR: tipoAnterior, valorAnterior, tipoNuevo, valorNuevo).
  const pares = Object.keys(d)
    .filter((k) => k.endsWith('Anterior') && !usadas.has(k) && `${k.slice(0, -'Anterior'.length)}Nuevo` in d)
    .map((k) => k.slice(0, -'Anterior'.length));
  if (pares.length) {
    const cambios = pares.filter((c) => d[`${c}Anterior`] !== d[`${c}Nuevo`]);
    partes.push(
      <span key="pares">
        {cambios.length
          ? cambiosDe(cambios.map((campo) => ({ campo, antes: d[`${campo}Anterior`], despues: d[`${campo}Nuevo`] })))
          : 'sin cambios'}.{' '}
      </span>,
    );
    pares.forEach((c) => usar(`${c}Anterior`, `${c}Nuevo`));
  }

  // Antes / después de un objeto (política de crédito o esquema de liquidación).
  if (d.antes && d.despues && typeof d.antes === 'object') {
    if ('tipo' in d.despues) {
      partes.push(<span key="ad">{esquema(d.antes)} → <Nuevo>{esquema(d.despues)}</Nuevo>. </span>);
    } else {
      const campos = Object.keys(d.despues).filter((k) => d.antes[k] !== d.despues[k]);
      partes.push(<span key="ad">{cambiosDe(campos.map((campo) => ({ campo, antes: d.antes[campo], despues: d.despues[campo] })))}. </span>);
    }
    usar('antes', 'despues');
  }

  if (Array.isArray(d.cambios)) {
    partes.push(<span key="cam">{d.cambios.length ? cambiosDe(d.cambios) : 'sin cambios'}. </span>);
    usar('cambios');
  }

  // Plan creado: precio y cuotas.
  if (d.cuotas && typeof d.cuotas === 'object') {
    const lista = [
      ...('precioMensual' in d ? [`${formatoPesos(d.precioMensual)} /mes`] : []),
      ...Object.entries(d.cuotas).map(([k, v]) => `${etiqueta(k)} ${valor(k, v)}`),
    ];
    partes.push(<span key="cuo">{lista.join(' · ')}. </span>);
    usar('cuotas', 'precioMensual');
  }

  if (d.motivo) { partes.push(<span key="mot">Motivo: {d.motivo}</span>); usar('motivo'); }

  // El resto de claves: «clave: valor».
  const resto = Object.entries(d).filter(([k]) => !usadas.has(k));
  if (resto.length) {
    partes.push(
      <span key="resto">
        {resto.map(([k, v]) => `${etiqueta(k)}: ${typeof v === 'object' && v !== null && !Array.isArray(v) ? JSON.stringify(v) : valor(k, v)}`).join(' · ')}
      </span>,
    );
  }
  return <>{partes}</>;
}
