// src/pages/administrador/EsquemaLiquidacion.jsx — RF65/RF66: parámetros de crédito y liquidación
// Política de crédito por defecto de la distribuidora y esquema con que se liquidan las planillas.
import { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import SuccessToast from '../../components/SuccessToast';
import ContenidoCarga from '../../components/ui/ContenidoCarga';
import {
  USAR_MOCK, obtenerPoliticaDefecto, guardarPoliticaDefecto,
  obtenerEsquemaLiquidacion, guardarEsquemaLiquidacion,
} from '../../services/creditoService';
import {
  ESQUEMAS, POLITICAS_VENCIMIENTO, calcularLiquidacion, etiquetaEsquema, formatoCOP, mensajeError,
} from '../../components/ventas/creditoUtils';

// Ejemplo del plan de pruebas (QA Iteración 3, §3.3): 20 despachadas, 5 devueltas.
const EJEMPLO = { producto: 'Paleta de ejemplo', despachadas: 20, devueltas: 5, pvp: 2000, precioComerciante: 1600 };

const POLITICA_INICIAL = { cupo: 50000, plazoDias: 0, politica: 'SOLO_ALERTA' };

const card  = 'bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.05)]';
const lbl   = 'block text-xs font-semibold text-ink mb-1.5';
const input = 'w-full px-3.5 py-2.5 border border-border rounded-xl text-sm bg-white text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';
const err   = 'text-[11px] text-[#dc2626] mt-1';
const ayuda = 'text-[11px] text-muted mt-1';

function validarPolitica(p) {
  const e = {};
  if (p.cupo === '' || !(Number(p.cupo) >= 0)) e.cupo = 'El cupo debe ser 0 o más.';
  if (p.plazoDias === '' || !Number.isInteger(Number(p.plazoDias)) || Number(p.plazoDias) < 0) e.plazoDias = 'Número entero de días, 0 o más.';
  return e;
}

function validarEsquema(e) {
  if (e.tipo === 'COMISION' && !(Number(e.valor) > 0 && Number(e.valor) <= 100)) return 'La comisión debe ser mayor a 0 y máximo 100 %.';
  if (e.tipo === 'TARIFA_FIJA' && (e.valor === '' || !(Number(e.valor) >= 0))) return 'La tarifa debe ser 0 o más.';
  return '';
}

const igualPolitica = (a, b) => a && b
  && Number(a.cupo) === Number(b.cupo) && Number(a.plazoDias) === Number(b.plazoDias) && a.politica === b.politica;
const igualEsquema = (a, b) => a && b
  && a.tipo === b.tipo && (a.tipo === 'MARGEN' || Number(a.valor) === Number(b.valor));

export default function EsquemaLiquidacion() {
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [politicaGuardada, setPoliticaGuardada] = useState(null);
  const [esquemaGuardado, setEsquemaGuardado]   = useState(null);
  const [politica, setPolitica] = useState(POLITICA_INICIAL);
  const [esquema, setEsquema]   = useState({ tipo: 'MARGEN', valor: '' });
  const [guardando, setGuardando] = useState(false);
  const [errorApi, setErrorApi]   = useState('');
  const [intento, setIntento]     = useState(false);
  const [toast, setToast]         = useState({ show: false, msg: '' });

  useEffect(() => {
    let vivo = true;
    Promise.all([obtenerPoliticaDefecto(), obtenerEsquemaLiquidacion()])
      .then(([p, e]) => {
        if (!vivo) return;
        const pol = { cupo: p?.cupo ?? 50000, plazoDias: p?.plazoDias ?? 0, politica: p?.politica ?? 'SOLO_ALERTA' };
        const esq = { tipo: e?.tipo ?? 'MARGEN', valor: e?.valor ?? '', vigenteDesde: e?.vigenteDesde };
        setPoliticaGuardada(pol);
        setPolitica(pol);
        setEsquemaGuardado(esq);
        setEsquema(esq);
      })
      .catch((e) => { if (vivo) setErrorCarga(mensajeError(e, 'No se pudieron cargar los parámetros.')); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, []);

  const erroresPolitica = validarPolitica(politica);
  const errorEsquema = validarEsquema(esquema);
  const hayErrores = Object.keys(erroresPolitica).length > 0 || !!errorEsquema;
  const cambioPolitica = !igualPolitica(politica, politicaGuardada);
  const cambioEsquema = !igualEsquema(esquema, esquemaGuardado);
  const hayCambios = cambioPolitica || cambioEsquema;

  const descartar = () => {
    setPolitica(politicaGuardada ?? POLITICA_INICIAL);
    setEsquema(esquemaGuardado ?? { tipo: 'MARGEN', valor: '' });
    setIntento(false);
    setErrorApi('');
  };

  const guardar = async () => {
    setIntento(true);
    if (hayErrores || !hayCambios) return;
    setGuardando(true);
    setErrorApi('');
    try {
      if (cambioPolitica) {
        const p = await guardarPoliticaDefecto({
          cupo: Number(politica.cupo), plazoDias: Number(politica.plazoDias), politica: politica.politica,
        });
        const pol = { cupo: p.cupo, plazoDias: p.plazoDias, politica: p.politica };
        setPoliticaGuardada(pol);
        setPolitica(pol);
      }
      if (cambioEsquema) {
        const e = await guardarEsquemaLiquidacion({
          tipo: esquema.tipo, valor: esquema.tipo === 'MARGEN' ? null : Number(esquema.valor),
        });
        const esq = { tipo: e.tipo, valor: e.valor ?? '', vigenteDesde: e.vigenteDesde };
        setEsquemaGuardado(esq);
        setEsquema(esq);
      }
      setIntento(false);
      setToast({ show: true, msg: 'Parámetros guardados. El esquema aplica a las planillas que se liquiden desde ahora.' });
    } catch (e) {
      setErrorApi(mensajeError(e, 'No se pudieron guardar los parámetros.'));
    } finally {
      setGuardando(false);
    }
  };

  const vendidas = EJEMPLO.despachadas - EJEMPLO.devueltas;
  const ejemplo = calcularLiquidacion(
    [{ vendidas, precioComerciante: EJEMPLO.precioComerciante, precioPublico: EJEMPLO.pvp }],
    { tipo: esquema.tipo, valor: esquema.valor === '' ? 0 : esquema.valor },
  );

  const vigente = esquemaGuardado
    ? `Vigente${esquemaGuardado.vigenteDesde ? ` desde ${new Date(esquemaGuardado.vigenteDesde).toLocaleDateString('es-CO')}` : ''}: ${etiquetaEsquema(esquemaGuardado.tipo, esquemaGuardado.valor === '' ? null : esquemaGuardado.valor)}`
    : '';

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in-up">
          <div>
            <p className="text-xs text-muted mb-1">
              Parámetros › <span className="text-primary font-semibold">Liquidación</span>
            </p>
            <h1 className="font-display text-2xl font-extrabold text-ink tracking-tight">Esquema de liquidación</h1>
            <p className="text-sm text-muted mt-1 max-w-2xl">
              Define la política de crédito por defecto y cómo se calcula la planilla diaria de tus comerciantes.
              Los cambios aplican a las planillas que se liquiden desde ahora.
              {USAR_MOCK && ' · modo simulado'}
            </p>
          </div>
          <div className="flex gap-3 self-start sm:self-auto">
            <button
              type="button"
              onClick={descartar}
              disabled={!hayCambios || guardando}
              className="px-4 py-2.5 border border-border bg-white rounded-xl text-sm font-semibold text-ink hover:bg-surface transition disabled:opacity-50"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={guardar}
              disabled={cargando || guardando || !hayCambios}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition active:scale-[0.97] shadow-[0_2px_8px_rgba(158,32,22,0.25)] disabled:opacity-50"
            >
              <ContenidoCarga cargando={guardando} textoCargando="Guardando...">Guardar cambios</ContenidoCarga>
            </button>
          </div>
        </div>

        {errorCarga && (
          <div className="px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm">{errorCarga}</div>
        )}
        {errorApi && (
          <div className="px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm">{errorApi}</div>
        )}

        {cargando ? (
          <div className="flex flex-col gap-4">
            <div className={`${card} h-[220px] animate-pulse`} />
            <div className={`${card} h-[260px] animate-pulse`} />
          </div>
        ) : (
          <>
            {/* 1. Política de crédito por defecto */}
            <section className={`${card} p-6`}>
              <h2 className="font-display text-base font-bold text-ink">1. Política de crédito por defecto</h2>
              <p className="text-xs text-muted mb-5">
                Aplica a todos los comerciantes, salvo a los que tengan condiciones propias en su sección Crédito.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div>
                  <label className={lbl} htmlFor="cupo-defecto">Cupo máximo de crédito *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
                    <input
                      id="cupo-defecto" type="number" min="0" step="1000"
                      value={politica.cupo}
                      onChange={(e) => setPolitica((p) => ({ ...p, cupo: e.target.value }))}
                      className={`${input} pl-7 ${intento && erroresPolitica.cupo ? 'border-[#dc2626]' : ''}`}
                    />
                  </div>
                  {intento && erroresPolitica.cupo ? <p className={err}>{erroresPolitica.cupo}</p> : <p className={ayuda}>Deuda máxima por comerciante. $50.000 por defecto.</p>}
                </div>
                <div>
                  <label className={lbl} htmlFor="plazo-defecto">Plazo máximo de pago *</label>
                  <div className="relative">
                    <input
                      id="plazo-defecto" type="number" min="0" step="1"
                      value={politica.plazoDias}
                      onChange={(e) => setPolitica((p) => ({ ...p, plazoDias: e.target.value }))}
                      className={`${input} pr-12 ${intento && erroresPolitica.plazoDias ? 'border-[#dc2626]' : ''}`}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted">días</span>
                  </div>
                  {intento && erroresPolitica.plazoDias
                    ? <p className={err}>{erroresPolitica.plazoDias}</p>
                    : <p className={ayuda}>0 = el saldo vence el mismo día de la planilla.</p>}
                </div>
              </div>
              <p className={lbl}>Política ante vencimiento *</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3" role="radiogroup" aria-label="Política ante vencimiento">
                {Object.entries(POLITICAS_VENCIMIENTO).map(([v, p]) => {
                  const activa = politica.politica === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={activa}
                      onClick={() => setPolitica((x) => ({ ...x, politica: v }))}
                      className={`text-left flex gap-3 rounded-xl border-2 px-4 py-3 transition ${activa ? 'border-primary bg-[#fef2f2]' : 'border-border hover:border-primary/40'}`}
                    >
                      <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${activa ? 'border-primary' : 'border-[#d6d3d1]'}`}>
                        {activa && <span className="w-2 h-2 rounded-full bg-primary" />}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-ink">{p.label}</span>
                        <span className="block text-xs text-muted mt-0.5">{p.descripcion}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 2. Tipo de esquema */}
            <section className={`${card} p-6`}>
              <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
                <div>
                  <h2 className="font-display text-base font-bold text-ink">2. Tipo de esquema</h2>
                  <p className="text-xs text-muted">Cómo gana el comerciante por lo que vende</p>
                </div>
                {vigente && <span className="px-2.5 py-1 rounded-full bg-surface text-xs font-semibold text-muted">{vigente}</span>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3" role="radiogroup" aria-label="Tipo de esquema">
                {Object.entries(ESQUEMAS).map(([tipo, e]) => {
                  const activo = esquema.tipo === tipo;
                  return (
                    <button
                      key={tipo}
                      type="button"
                      role="radio"
                      aria-checked={activo}
                      onClick={() => setEsquema((x) => ({ ...x, tipo, valor: tipo === esquemaGuardado?.tipo ? esquemaGuardado.valor : '' }))}
                      className={`text-left rounded-xl border-2 px-5 py-4 transition ${activo ? 'border-primary bg-[#fef2f2]' : 'border-border hover:border-primary/40'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-[15px] font-bold text-ink">{e.label}</span>
                        {activo && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-tint text-primary">Seleccionado</span>}
                      </div>
                      <p className="text-xs text-muted mt-1.5">{e.descripcion}</p>
                      <p className="mt-3 px-3 py-2 rounded-lg bg-white border border-border font-mono text-[11px] text-faint">{e.formula}</p>
                    </button>
                  );
                })}
              </div>

              {ESQUEMAS[esquema.tipo]?.conValor && (
                <div className="mt-5 max-w-xs">
                  <label className={lbl} htmlFor="valor-esquema">
                    {esquema.tipo === 'COMISION' ? 'Porcentaje de comisión *' : 'Valor fijo por planilla *'}
                  </label>
                  <div className="relative">
                    {esquema.tipo === 'TARIFA_FIJA' && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>}
                    <input
                      id="valor-esquema"
                      type="number"
                      min="0"
                      max={esquema.tipo === 'COMISION' ? 100 : undefined}
                      step={esquema.tipo === 'COMISION' ? 0.5 : 500}
                      value={esquema.valor}
                      onChange={(e) => setEsquema((x) => ({ ...x, valor: e.target.value }))}
                      className={`${input} ${esquema.tipo === 'TARIFA_FIJA' ? 'pl-7' : 'pr-9'} ${intento && errorEsquema ? 'border-[#dc2626]' : ''}`}
                    />
                    {esquema.tipo === 'COMISION' && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>}
                  </div>
                  {intento && errorEsquema && <p className={err}>{errorEsquema}</p>}
                </div>
              )}
              {esquema.tipo === 'MARGEN' && (
                <p className="mt-5 text-xs text-muted">
                  El margen sale del precio público y del precio al comerciante de cada producto, que se editan en el catálogo.
                </p>
              )}
            </section>

            {/* 3. Vista previa */}
            <section className={`${card} overflow-hidden`}>
              <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border">
                <div>
                  <h2 className="font-display text-base font-bold text-ink">Vista previa</h2>
                  <p className="text-xs text-muted">Planilla de ejemplo con el esquema seleccionado</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#eff6ff] text-[#1d4ed8] text-xs font-semibold">Simulación</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 py-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                      <th className="pb-2 font-semibold">Producto</th>
                      <th className="pb-2 font-semibold text-right">Vend.</th>
                      <th className="pb-2 font-semibold text-right">PVP</th>
                      <th className="pb-2 font-semibold text-right">P. comerciante</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border">
                      <td className="py-2.5">
                        <p className="font-semibold text-ink">{EJEMPLO.producto}</p>
                        <p className="text-xs text-muted">{EJEMPLO.despachadas} desp. · {EJEMPLO.devueltas} dev.</p>
                      </td>
                      <td className="py-2.5 text-right text-ink">{vendidas}</td>
                      <td className="py-2.5 text-right text-ink">{formatoCOP(EJEMPLO.pvp)}</td>
                      <td className="py-2.5 text-right text-ink">{formatoCOP(EJEMPLO.precioComerciante)}</td>
                    </tr>
                  </tbody>
                </table>
                <dl className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted">Total vendido (PVP)</dt><dd className="text-ink">{formatoCOP(ejemplo.totalPublico)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Ganancia del comerciante</dt><dd className="font-semibold text-[#16a34a]">{formatoCOP(ejemplo.ganancia)}</dd></div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-dashed border-border">
                    <dt className="font-bold text-ink">Monto a cobrar</dt>
                    <dd className="font-display text-2xl font-extrabold text-primary">{formatoCOP(ejemplo.montoCobrado)}</dd>
                  </div>
                  <p className="mt-2 px-3 py-2 rounded-lg bg-[#fffbeb] text-[#92400e] text-xs">
                    Cada planilla queda bloqueada con el esquema vigente al liquidarla, aunque luego lo cambies.
                  </p>
                </dl>
              </div>
            </section>
          </>
        )}
      </div>

      <SuccessToast message={toast.msg} show={toast.show} onClose={() => setToast((t) => ({ ...t, show: false }))} />
    </AppLayout>
  );
}
