// src/components/ventas/SeccionCredito.jsx — RF65: crédito del comerciante
// Política efectiva (por defecto o excepción), cupo, plazo, deuda, planillas vencidas y abonos.
// Editable solo para el Gerente (ADMINISTRADOR); solo lectura para el Encargado de Ventas.
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ContenidoCarga from '../ui/ContenidoCarga';
import ModalProrroga from './ModalProrroga';
import {
  obtenerCreditoComerciante, guardarCreditoComerciante, usarPoliticaDefecto, registrarAbono,
} from '../../services/creditoService';
import {
  POLITICAS_VENCIMIENTO, formatoCOP, formatoFecha, estadoPlanilla, resumenCredito, distribuirAbono, mensajeError,
} from './creditoUtils';

const card  = 'bg-white rounded-[16px] border border-[#f5f5f4]';
const label = "block font-['Inter'] font-semibold text-[12px] text-[#1b1b1c] mb-1.5";
const input = "w-full bg-white border border-[#e7e5e4] rounded-[10px] px-3.5 py-2.5 font-['Inter'] text-[14px] text-[#1b1b1c] outline-none focus:border-[#9e2016] focus:ring-2 focus:ring-[#9e2016]/20 disabled:bg-[#f6f3f3] disabled:text-[#78716c]";
const ayuda = "font-['Inter'] text-[11px] text-[#a8a29e] mt-1";

function Kpi({ titulo, valor, detalle, tono = 'normal', children }) {
  const tonos = {
    normal: 'text-[#1b1b1c]',
    verde:  'text-[#16a34a]',
    rojo:   'text-[#dc2626]',
  };
  return (
    <div className={`${card} px-5 py-4 ${tono === 'rojo' ? 'border-[#fecaca]' : ''}`}>
      <p className={`font-['Inter'] font-bold text-[10px] uppercase tracking-[0.7px] ${tono === 'rojo' ? 'text-[#dc2626]' : 'text-[#a8a29e]'}`}>{titulo}</p>
      <p className={`font-['Manrope'] font-extrabold text-[24px] leading-tight mt-1.5 ${tonos[tono]}`}>{valor}</p>
      {children}
      <p className="font-['Inter'] text-[11px] text-[#a8a29e] mt-1">{detalle}</p>
    </div>
  );
}

export default function SeccionCredito({ comercianteId, nombre }) {
  const { rol } = useAuth();
  const esGerente = rol === 'ADMINISTRADOR';

  const [credito, setCredito]   = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState('');
  const [aviso, setAviso]       = useState('');

  // Formulario de condiciones
  const [modo, setModo]           = useState('DEFECTO');   // DEFECTO | EXCEPCION
  const [form, setForm]           = useState({ cupo: '', plazoDias: '', politica: 'SOLO_ALERTA' });
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  // Abono
  const [abonoAbierto, setAbonoAbierto] = useState(false);
  const [abono, setAbono]               = useState({ valor: '', observacion: '' });
  const [registrando, setRegistrando]   = useState(false);
  const [errorAbono, setErrorAbono]     = useState('');

  const [prorroga, setProrroga] = useState(null);

  const aplicarCredito = (c) => {
    setCredito(c);
    setModo(c.origen === 'EXCEPCION' ? 'EXCEPCION' : 'DEFECTO');
    setForm({ cupo: c.cupo ?? 0, plazoDias: c.plazoDias ?? 0, politica: c.politica ?? 'SOLO_ALERTA' });
  };

  useEffect(() => {
    let vivo = true;
    obtenerCreditoComerciante(comercianteId)
      .then((c) => {
        if (!vivo) return;
        setCredito(c);
        setModo(c.origen === 'EXCEPCION' ? 'EXCEPCION' : 'DEFECTO');
        setForm({ cupo: c.cupo ?? 0, plazoDias: c.plazoDias ?? 0, politica: c.politica ?? 'SOLO_ALERTA' });
      })
      .catch((err) => { if (vivo) setError(mensajeError(err, 'No se pudo cargar el crédito del comerciante.')); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [comercianteId]);

  if (cargando) {
    return <div className={`${card} h-[180px] animate-pulse`} />;
  }
  if (error || !credito) {
    return (
      <div className={`${card} px-5 py-4 font-['Inter'] text-[14px] text-[#dc2626]`}>{error || 'Sin datos de crédito.'}</div>
    );
  }

  const r = resumenCredito(credito);
  const defecto = credito.politicaDefecto ?? {};
  const editando = esGerente && modo === 'EXCEPCION';
  const valoresForm = modo === 'DEFECTO'
    ? { cupo: defecto.cupo ?? 0, plazoDias: defecto.plazoDias ?? 0, politica: defecto.politica ?? 'SOLO_ALERTA' }
    : form;

  const restablecer = () => {
    setModo(credito.origen === 'EXCEPCION' ? 'EXCEPCION' : 'DEFECTO');
    setForm({ cupo: credito.cupo ?? 0, plazoDias: credito.plazoDias ?? 0, politica: credito.politica ?? 'SOLO_ALERTA' });
    setErrorForm('');
  };

  const guardarCondiciones = async () => {
    setErrorForm('');
    if (modo === 'EXCEPCION') {
      const cupo = Number(form.cupo);
      const plazo = Number(form.plazoDias);
      if (form.cupo === '' || !(cupo >= 0)) { setErrorForm('El cupo debe ser 0 o más.'); return; }
      if (form.plazoDias === '' || !Number.isInteger(plazo) || plazo < 0) { setErrorForm('El plazo debe ser un número entero de días, 0 o más.'); return; }
    }
    setGuardando(true);
    try {
      const c = modo === 'DEFECTO'
        ? await usarPoliticaDefecto(comercianteId)
        : await guardarCreditoComerciante(comercianteId, {
          cupo: Number(form.cupo), plazoDias: Number(form.plazoDias), politica: form.politica,
        });
      aplicarCredito(c);
      setAviso(modo === 'DEFECTO' ? `${nombre} vuelve a la política por defecto.` : 'Condiciones de crédito guardadas.');
    } catch (err) {
      setErrorForm(mensajeError(err, 'No se pudieron guardar las condiciones.'));
    } finally {
      setGuardando(false);
    }
  };

  const montoAbono = Number(abono.valor) || 0;
  const distribucion = distribuirAbono(r.planillas, montoAbono);

  const guardarAbono = async () => {
    setErrorAbono('');
    if (!(montoAbono > 0)) { setErrorAbono('Escribe el valor del abono.'); return; }
    if (montoAbono > r.deuda) { setErrorAbono(`El abono no puede superar la deuda (${formatoCOP(r.deuda)}).`); return; }
    setRegistrando(true);
    try {
      const c = await registrarAbono(comercianteId, { valor: montoAbono, observacion: abono.observacion.trim() });
      aplicarCredito(c);
      setAbono({ valor: '', observacion: '' });
      setAbonoAbierto(false);
      setAviso(`Abono de ${formatoCOP(montoAbono)} registrado.`);
    } catch (err) {
      setErrorAbono(mensajeError(err, 'No se pudo registrar el abono.'));
    } finally {
      setRegistrando(false);
    }
  };

  const alProrrogar = (fecha) => {
    setCredito((c) => ({
      ...c,
      planillas: c.planillas.map((p) => (p.planillaId === prorroga.planillaId
        ? { ...p, fechaLimitePago: fecha, vencida: false, diasMora: undefined }
        : p)),
    }));
    setAviso(`Fecha límite extendida al ${formatoFecha(fecha)}.`);
    setProrroga(null);
  };

  return (
    <section className="flex flex-col gap-4" aria-labelledby="titulo-credito">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 id="titulo-credito" className="font-['Manrope'] font-bold text-[18px] text-[#1b1b1c]">Crédito</h2>
          <p className="font-['Inter'] text-[12px] text-[#a8a29e]">
            {credito.origen === 'EXCEPCION' ? 'Condiciones propias de este comerciante' : 'Usa la política por defecto de la distribuidora'}
            {!esGerente && ' · solo lectura'}
          </p>
        </div>
        <span className={`font-['Inter'] font-semibold text-[12px] px-2.5 py-1 rounded-full ${
          r.vencidas.length === 0
            ? 'bg-[#f0fdf4] text-[#16a34a]'
            : credito.politica === 'BLOQUEAR' ? 'bg-[#fef2f2] text-[#dc2626]' : 'bg-[#fffbeb] text-[#b45309]'
        }`}>
          {r.vencidas.length === 0 ? 'Crédito al día' : credito.politica === 'BLOQUEAR' ? 'Crédito bloqueado' : 'Crédito con alerta'}
        </span>
      </div>

      {aviso && (
        <div className="px-4 py-3 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] text-sm flex justify-between gap-3">
          <span>{aviso}</span>
          <button type="button" onClick={() => setAviso('')} aria-label="Cerrar aviso" className="opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi titulo="Deuda total" valor={formatoCOP(r.deuda)} detalle={`${Math.round(r.usoCupo)} % del cupo de ${formatoCOP(r.cupo)}`}>
          <div className="h-1.5 rounded-full bg-[#f5f5f4] mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${r.usoCupo >= 100 ? 'bg-[#dc2626]' : r.usoCupo >= 80 ? 'bg-[#d97706]' : 'bg-[#16a34a]'}`}
              style={{ width: `${r.usoCupo}%` }}
            />
          </div>
        </Kpi>
        <Kpi titulo="Cupo disponible" valor={formatoCOP(r.cupoDisponible)} detalle="Para nuevos despachos" tono={r.cupoDisponible > 0 ? 'verde' : 'rojo'} />
        <Kpi
          titulo="Planillas vencidas"
          valor={r.vencidas.length ? `${r.vencidas.length} · ${formatoCOP(r.totalVencido)}` : '0'}
          detalle={r.vencidas.length ? `La más antigua: ${r.moraMaxima} días de mora` : 'Sin planillas vencidas'}
          tono={r.vencidas.length ? 'rojo' : 'normal'}
        />
        <Kpi
          titulo="Próximo vencimiento"
          valor={r.proxima ? formatoFecha(r.proxima.fechaLimitePago) : '—'}
          detalle={r.proxima ? `${r.proxima.codigo ?? 'Planilla'} · ${formatoCOP(r.proxima.saldo)}` : 'Sin saldos por vencer'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-4 items-start">

        {/* Condiciones de crédito */}
        <div className={card}>
          <div className="px-5 py-4 border-b border-[#f5f5f4]">
            <h3 className="font-['Manrope'] font-bold text-[15px] text-[#1b1b1c]">Condiciones de crédito</h3>
            <p className="font-['Inter'] text-[12px] text-[#a8a29e]">Aplican a los despachos de este comerciante</p>
          </div>
          <div className="px-5 py-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 bg-[#f6f3f3] rounded-[10px] p-1" role="radiogroup" aria-label="Origen de la política">
              {[['DEFECTO', 'Usar política por defecto'], ['EXCEPCION', 'Personalizar']].map(([v, t]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={modo === v}
                  disabled={!esGerente}
                  onClick={() => setModo(v)}
                  className={`py-2 rounded-[8px] font-['Inter'] text-[13px] transition ${
                    modo === v ? 'bg-white text-[#9e2016] font-bold shadow-sm' : 'text-[#78716c]'
                  } ${esGerente ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="px-3.5 py-2.5 rounded-[10px] bg-[#eff6ff] text-[#1e40af] font-['Inter'] text-[12px]">
              Política por defecto: cupo {formatoCOP(defecto.cupo)}, plazo {defecto.plazoDias ?? 0} día{defecto.plazoDias === 1 ? '' : 's'},{' '}
              {POLITICAS_VENCIMIENTO[defecto.politica]?.corto.toLowerCase() ?? '—'}.
              {credito.origen === 'EXCEPCION' ? ' Este comerciante tiene condiciones propias.' : ''}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label} htmlFor="cupo-credito">Cupo máximo de crédito *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#a8a29e]">$</span>
                  <input
                    id="cupo-credito"
                    type="number" min="0" step="1000"
                    disabled={!editando}
                    value={valoresForm.cupo}
                    onChange={(e) => setForm((f) => ({ ...f, cupo: e.target.value }))}
                    className={`${input} pl-7`}
                  />
                </div>
              </div>
              <div>
                <label className={label} htmlFor="plazo-credito">Plazo máximo de pago *</label>
                <div className="relative">
                  <input
                    id="plazo-credito"
                    type="number" min="0" step="1"
                    disabled={!editando}
                    value={valoresForm.plazoDias}
                    onChange={(e) => setForm((f) => ({ ...f, plazoDias: e.target.value }))}
                    className={`${input} pr-12`}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] text-[#a8a29e]">días</span>
                </div>
                <p className={ayuda}>Contados desde la fecha de la planilla</p>
              </div>
            </div>

            <div>
              <p className={label}>Política ante vencimiento *</p>
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Política ante vencimiento">
                {Object.entries(POLITICAS_VENCIMIENTO).map(([v, p]) => {
                  const activa = valoresForm.politica === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={activa}
                      disabled={!editando}
                      onClick={() => setForm((f) => ({ ...f, politica: v }))}
                      className={`text-left flex gap-3 rounded-[12px] border px-4 py-3 transition ${
                        activa ? 'border-[#9e2016] bg-[#fffafa]' : 'border-[#e7e5e4]'
                      } ${editando ? 'cursor-pointer hover:border-[#9e2016]/50' : 'cursor-default'}`}
                    >
                      <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${activa ? 'border-[#9e2016]' : 'border-[#d6d3d1]'}`}>
                        {activa && <span className="w-2 h-2 rounded-full bg-[#9e2016]" />}
                      </span>
                      <span>
                        <span className="block font-['Inter'] font-semibold text-[13px] text-[#1b1b1c]">{p.label}</span>
                        <span className="block font-['Inter'] text-[12px] text-[#78716c] mt-0.5">{p.descripcion}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {errorForm && (
              <div className="px-4 py-3 rounded-xl bg-[#fef2f2] border border-[#fca5a5] text-[#dc2626] text-sm">{errorForm}</div>
            )}
          </div>

          {esGerente && (
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-[#f5f5f4]">
              <button type="button" onClick={restablecer} className="px-4 py-2.5 border border-[#e7e5e4] rounded-[10px] font-['Inter'] font-semibold text-[13px] text-[#1b1b1c] hover:bg-[#f6f3f3] transition cursor-pointer">
                Restablecer
              </button>
              <button
                type="button"
                onClick={guardarCondiciones}
                disabled={guardando}
                className="px-4 py-2.5 bg-[#9e2016] hover:bg-[#7c0202] disabled:opacity-60 text-white rounded-[10px] font-['Manrope'] font-bold text-[13px] transition cursor-pointer"
              >
                <ContenidoCarga cargando={guardando} textoCargando="Guardando...">Guardar condiciones</ContenidoCarga>
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {/* Planillas con saldo */}
          <div className={`${card} overflow-hidden`}>
            <div className="px-5 py-4">
              <h3 className="font-['Manrope'] font-bold text-[15px] text-[#1b1b1c]">Planillas con saldo</h3>
              <p className="font-['Inter'] text-[12px] text-[#a8a29e]">
                {r.planillas.length} planilla{r.planillas.length === 1 ? '' : 's'} a crédito · {r.vencidas.length} vencida{r.vencidas.length === 1 ? '' : 's'}
              </p>
            </div>
            {r.planillas.length === 0 ? (
              <p className="px-5 pb-5 font-['Inter'] text-[13px] text-[#a8a29e]">El comerciante no tiene saldos pendientes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px]">
                  <thead>
                    <tr className="bg-[#f6f3f3] text-left">
                      {['Planilla', 'Vence', 'Valor', 'Saldo', 'Estado', ''].map((h, i) => (
                        <th key={h || i} className={`px-4 py-2.5 font-['Inter'] font-bold text-[10px] uppercase tracking-[0.7px] text-[#a8a29e] ${i === 2 || i === 3 ? 'text-right' : ''}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f5f5f4]">
                    {[...r.planillas].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))).map((p) => {
                      const est = estadoPlanilla(p);
                      return (
                        <tr key={p.planillaId} className={est.codigo === 'VENCIDA' ? 'bg-[#fffafa]' : ''}>
                          <td className="px-4 py-3">
                            <p className="font-['Inter'] font-semibold text-[13px] text-[#1b1b1c] font-mono">{p.codigo ?? `#${String(p.planillaId).slice(-6).toUpperCase()}`}</p>
                            <p className="font-['Inter'] text-[11px] text-[#a8a29e]">{formatoFecha(p.fecha)}</p>
                          </td>
                          <td className="px-4 py-3 font-['Inter'] text-[13px] text-[#1b1b1c]">{formatoFecha(p.fechaLimitePago)}</td>
                          <td className="px-4 py-3 font-['Inter'] text-[13px] text-[#1b1b1c] text-right">{formatoCOP(p.valor)}</td>
                          <td className={`px-4 py-3 font-['Manrope'] font-bold text-[13px] text-right ${est.codigo === 'VENCIDA' ? 'text-[#dc2626]' : 'text-[#1b1b1c]'}`}>
                            {formatoCOP(p.saldo)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-['Inter'] font-semibold text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${est.clase}`}>{est.label}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {esGerente && (
                              <button
                                type="button"
                                onClick={() => setProrroga(p)}
                                className="font-['Inter'] font-semibold text-[12px] text-[#9e2016] hover:underline cursor-pointer whitespace-nowrap"
                              >
                                Prorrogar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-between px-5 py-3 border-t border-[#f5f5f4]">
              <span className="font-['Inter'] text-[13px] text-[#78716c]">Deuda total</span>
              <span className="font-['Manrope'] font-bold text-[15px] text-[#1b1b1c]">{formatoCOP(r.deuda)}</span>
            </div>
          </div>

          {/* Abonos */}
          <div className={card}>
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#f5f5f4]">
              <div>
                <h3 className="font-['Manrope'] font-bold text-[15px] text-[#1b1b1c]">Abonos</h3>
                <p className="font-['Inter'] text-[12px] text-[#a8a29e]">Se aplican primero a las planillas más antiguas</p>
              </div>
              {esGerente && !abonoAbierto && r.deuda > 0 && (
                <button
                  type="button"
                  onClick={() => { setAbonoAbierto(true); setErrorAbono(''); }}
                  className="px-3.5 py-2 bg-[#9e2016] hover:bg-[#7c0202] text-white rounded-[10px] font-['Manrope'] font-bold text-[13px] transition cursor-pointer"
                >
                  + Registrar abono
                </button>
              )}
            </div>

            {abonoAbierto && (
              <div className="px-5 py-4 border-b border-[#f5f5f4] flex flex-col gap-3 bg-[#fffafa]">
                <div>
                  <label className={label} htmlFor="valor-abono">Monto del abono *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#a8a29e]">$</span>
                    <input
                      id="valor-abono"
                      autoFocus
                      type="number" min="1" step="1000"
                      value={abono.valor}
                      onChange={(e) => setAbono((a) => ({ ...a, valor: e.target.value }))}
                      className={`${input} pl-7`}
                    />
                  </div>
                </div>
                {montoAbono > 0 && (
                  <div className="rounded-[10px] border border-[#f0eded] bg-white overflow-hidden">
                    <p className="px-3.5 py-2 bg-[#f6f3f3] font-['Inter'] font-bold text-[10px] uppercase tracking-[0.7px] text-[#a8a29e]">Distribución del abono</p>
                    {distribucion.aplicado.map(({ planilla, valor, saldoRestante }) => (
                      <div key={planilla.planillaId} className="flex items-center justify-between gap-2 px-3.5 py-2 border-t border-[#f5f5f4] font-['Inter'] text-[13px]">
                        <span><span className="font-mono font-semibold">{planilla.codigo ?? 'Planilla'}</span> · {formatoCOP(valor)}</span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${saldoRestante === 0 ? 'bg-[#f0fdf4] text-[#16a34a]' : 'bg-[#fffbeb] text-[#b45309]'}`}>
                          {saldoRestante === 0 ? 'Saldada' : `Queda ${formatoCOP(saldoRestante)}`}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between px-3.5 py-2 border-t border-[#f5f5f4] bg-[#fffafa] font-['Inter'] text-[13px]">
                      <span className="font-semibold">Deuda después del abono</span>
                      <span className="font-['Manrope'] font-bold">{formatoCOP(Math.max(0, r.deuda - montoAbono))}</span>
                    </div>
                  </div>
                )}
                <div>
                  <label className={label} htmlFor="obs-abono">Observación</label>
                  <input
                    id="obs-abono"
                    value={abono.observacion}
                    maxLength={200}
                    onChange={(e) => setAbono((a) => ({ ...a, observacion: e.target.value }))}
                    placeholder="Ej. Abono recibido al cierre de la jornada"
                    className={input}
                  />
                </div>
                {errorAbono && (
                  <div className="px-4 py-3 rounded-xl bg-[#fef2f2] border border-[#fca5a5] text-[#dc2626] text-sm">{errorAbono}</div>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setAbonoAbierto(false); setAbono({ valor: '', observacion: '' }); setErrorAbono(''); }}
                    className="px-4 py-2.5 border border-[#e7e5e4] rounded-[10px] font-['Inter'] font-semibold text-[13px] text-[#1b1b1c] hover:bg-[#f6f3f3] transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={guardarAbono}
                    disabled={registrando}
                    className="px-4 py-2.5 bg-[#9e2016] hover:bg-[#7c0202] disabled:opacity-60 text-white rounded-[10px] font-['Manrope'] font-bold text-[13px] transition cursor-pointer"
                  >
                    <ContenidoCarga cargando={registrando} textoCargando="Registrando...">Registrar abono</ContenidoCarga>
                  </button>
                </div>
              </div>
            )}

            {(credito.abonos ?? []).length === 0 ? (
              <p className="px-5 py-4 font-['Inter'] text-[13px] text-[#a8a29e]">Aún no hay abonos registrados.</p>
            ) : (
              <ul className="divide-y divide-[#f5f5f4]">
                {credito.abonos.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="font-['Inter'] text-[13px] text-[#1b1b1c] truncate">{a.observacion || 'Abono'}</p>
                      <p className="font-['Inter'] text-[11px] text-[#a8a29e]">
                        {formatoFecha(a.fecha)}{a.usuarioNombre ? ` · recibió ${a.usuarioNombre}` : ''}
                      </p>
                    </div>
                    <span className="font-['Manrope'] font-bold text-[14px] text-[#16a34a] shrink-0">{formatoCOP(a.valor)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {prorroga && (
        <ModalProrroga planilla={prorroga} onClose={() => setProrroga(null)} onGuardado={alProrrogar} />
      )}
    </section>
  );
}
