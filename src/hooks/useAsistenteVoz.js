import { useCallback, useEffect, useRef, useState } from 'react';
import { interpretarComando, confirmarComando } from '../services/vozService';
import {
  contienePalabraClave, detectarInterrupcion, esAprobarEsa, esCancelar, esConfirmar, esModificar, normalizar,
  palabrasDe, sinEcoInicial,
} from './frasesVoz';

const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;


export const ESTADOS_VOZ = Object.freeze({
  INACTIVO: 'INACTIVO',
  ESCUCHANDO: 'ESCUCHANDO',
  TRANSCRIBIENDO: 'TRANSCRIBIENDO',
  INTERPRETANDO: 'INTERPRETANDO',
  ESPERANDO_CONFIRMACION: 'ESPERANDO_CONFIRMACION',
  EJECUTANDO: 'EJECUTANDO',
  COMPLETADO: 'COMPLETADO',
  CANCELADO: 'CANCELADO',
  ERROR: 'ERROR',
});

// T40-FE4 — preferencia de la palabra clave "Hola GELOX" (encendida salvo
// que el usuario la apague desde el panel).
export const CLAVE_PALABRA_CLAVE = 'gelox_voz_palabra_clave';
export const EVENTO_PALABRA_CLAVE = 'gelox:voz-palabra-clave-cambio';

export const palabraClaveHabilitada = () => localStorage.getItem(CLAVE_PALABRA_CLAVE) !== '0';

export function setPalabraClaveHabilitada(habilitada) {
  localStorage.setItem(CLAVE_PALABRA_CLAVE, habilitada ? '1' : '0');
  window.dispatchEvent(new Event(EVENTO_PALABRA_CLAVE));
}

// Calibración de la escucha: el comando se da por terminado tras esta pausa
// sin hablar (antes se cortaba en la primera pausa que detectaba el navegador).
const SILENCIO_FIN_MS = 2500;
const ESCUCHA_MAX_MS = 30000;
// Tras interrumpir al asistente, pausa que da por terminado lo que dijo el usuario.
const SILENCIO_INTERRUPCION_MS = 1500;
const RUTA_RECOMENDACIONES = '/inventarios/recomendaciones';

const MENSAJE_NO_TE_ESCUCHE = 'No te escuché, repite el comando';
const MENSAJE_ERROR_GENERICO = 'No pude procesar el comando';
const MENSAJE_CANCELADO_POR_TIEMPO = 'Operación cancelada por falta de respuesta';


const AGREGAR_REGEX = /agrega/;

const ERRORES_PERMISO = ['not-allowed', 'service-not-allowed'];

/** Suelta un reconocedor sin que sus eventos sigan disparando el flujo. */
function soltar(reconocimiento) {
  if (!reconocimiento) return;
  reconocimiento.onresult = null;
  reconocimiento.onerror = null;
  reconocimiento.onend = null;
  reconocimiento.abort();
}

// Los centavos (",00" que manda el backend) no se narran.
const MONTO_COP_REGEX = /\$\s?(\d+(?:\.\d{3})*)(?:,\d{1,2})?|\b(\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?\b/g;


const UNIDADES = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const ESPECIALES_10_19 = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
const ESPECIALES_VEINTE = ['veinte', 'veintiún', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const DECENAS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function centenaATexto(n) {
  if (n === 0) return '';
  if (n === 100) return 'cien';
  const centenas = Math.floor(n / 100);
  const resto = n % 100;
  const partes = [];
  if (centenas > 0) partes.push(CENTENAS[centenas]);
  if (resto > 0) {
    if (resto < 10) partes.push(UNIDADES[resto]);
    else if (resto < 20) partes.push(ESPECIALES_10_19[resto - 10]);
    else {
      const decena = Math.floor(resto / 10);
      const unidad = resto % 10;
      if (decena === 2) partes.push(ESPECIALES_VEINTE[unidad]);
      else partes.push(unidad > 0 ? `${DECENAS[decena]} y ${UNIDADES[unidad]}` : DECENAS[decena]);
    }
  }
  return partes.join(' ');
}

function numeroATextoEsp(n) {
  if (n === 0) return 'cero';
  const millones = Math.floor(n / 1000000);
  const miles = Math.floor((n % 1000000) / 1000);
  const resto = n % 1000;
  const partes = [];
  if (millones > 0) partes.push(millones === 1 ? 'un millón' : `${numeroATextoEsp(millones)} millones`);
  if (miles > 0) partes.push(miles === 1 ? 'mil' : `${centenaATexto(miles)} mil`);
  if (resto > 0) partes.push(centenaATexto(resto));
  return partes.join(' ');
}

function montoEnPalabras(digitos) {
  const monto = Math.round(Math.abs(Number(digitos)));
  if (!Number.isFinite(monto)) return `${digitos} pesos`;
  if (monto === 1) return 'un peso';
  const millones = Math.floor(monto / 1000000);
  const resto = monto % 1000000;
  const necesitaDe = millones > 0 && resto === 0; // "un millón DE pesos", pero "un millón quinientos mil pesos"
  return `${numeroATextoEsp(monto)}${necesitaDe ? ' de pesos' : ' pesos'}`;
}

const NUMERO_SUELTO_REGEX = /\b\d{4,}\b/g;

function paraNarrar(texto) {
  const conMontos = texto.replace(MONTO_COP_REGEX, (_, conSigno, sinSigno) => {
    const digitos = (conSigno ?? sinSigno).replace(/\./g, '');
    return montoEnPalabras(digitos);
  });
  return conMontos.replace(NUMERO_SUELTO_REGEX, (numero) => numeroATextoEsp(Number(numero)));
}

function mensajeDeError(err) {
  const status = err?.response?.status;
  const mensajeBackend = err?.response?.data?.error;
  if (status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (status === 403) return mensajeBackend || 'No tienes permiso para esa consulta';
  if (status === 410) return mensajeBackend || 'La confirmación expiró';
  // 422, 5xx o sin red (status undefined porque la request nunca llegó a completarse)
  return mensajeBackend || MENSAJE_ERROR_GENERICO;
}


export function useAsistenteVoz({ alActivarPorVoz } = {}) {
  const soportado = !!SpeechRecognitionCtor;

  const [permisoDenegado, setPermisoDenegado] = useState(false);
  const [estado, setEstado] = useState(ESTADOS_VOZ.INACTIVO);
  const [transcripcionParcial, setTranscripcionParcial] = useState('');
  const [textoFinal, setTextoFinal] = useState('');
  const [respuesta, setRespuesta] = useState(null);

  const reconocedorRef = useRef(null);
  const reintentoNoSpeechRef = useRef(false);
  const confirmarEnCursoRef = useRef(false);
  const respuestaLlegoEnRef = useRef(null);

  const pausarPalabraClaveRef = useRef(null);
  const reanudarPalabraClaveRef = useRef(null);
  const alActivarPorVozRef = useRef(alActivarPorVoz);
  useEffect(() => {
    alActivarPorVozRef.current = alActivarPorVoz;
  }, [alActivarPorVoz]);

  // Estado vigente para los callbacks del micrófono (que no se recrean en cada render).
  const estadoRef = useRef(estado);
  const respuestaRef = useRef(respuesta);
  const esperandoRespuestaRef = useRef(false);
  useEffect(() => { estadoRef.current = estado; }, [estado]);
  useEffect(() => { respuestaRef.current = respuesta; }, [respuesta]);

  const esperaNarracionRef = useRef(null);
  const esperaPreguntaRef = useRef({ timer: null, turno: 0 });

  // Interrupción por voz: mientras GELOX habla, un reconocedor escucha. El eco de la narración
  // se descarta (frasesVoz.detectarInterrupcion); si el usuario habla, la narración se corta y lo
  // dicho se atiende según lo que se estaba esperando (alInterrumpirRef).
  const narracionRef = useRef(null);
  const alInterrumpirRef = useRef(null);
  const reanudarPendienteRef = useRef(false);
  const [narrando, setNarrando] = useState(false);

  const detenerEscuchaNarracion = (narracion) => {
    const rec = narracion?.rec;
    if (!rec) return;
    narracion.rec = null;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try { rec.abort(); } catch { /* ya terminó */ }
  };

  // Corta la narración en curso sin ejecutar lo que venía después (al iniciar o cancelar a mano).
  const callarNarracion = useCallback(() => {
    const narracion = narracionRef.current;
    if (narracion) {
      narracion.interrumpida = true;
      detenerEscuchaNarracion(narracion);
      narracionRef.current = null;
    }
    setNarrando(false);
    window.speechSynthesis?.cancel();
  }, []);

  const escucharInterrupcion = useCallback((narracion, narrado) => {
    if (!SpeechRecognitionCtor) return;
    // Si el micrófono ya está escuchando un comando, no se abre otro.
    if (estadoRef.current === ESTADOS_VOZ.ESCUCHANDO || estadoRef.current === ESTADOS_VOZ.TRANSCRIBIENDO) return;
    const narradas = palabrasDe(narrado);
    const rec = new SpeechRecognitionCtor();
    rec.lang = 'es-CO';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    narracion.rec = rec;

    let interrumpido = false;
    let finales = '';
    let parcial = '';
    let confianza = 1;
    let silencioId = null;

    rec.onresult = (evento) => {
      for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
        const resultado = evento.results[i];
        const transcrito = resultado[0].transcript;
        if (!interrumpido) {
          if (!detectarInterrupcion(transcrito, narradas)) continue;
          interrumpido = true;
          narracion.interrumpida = true;
          clearTimeout(esperaNarracionRef.current);
          clearTimeout(esperaPreguntaRef.current.timer);
          esperaPreguntaRef.current.turno += 1;
          window.speechSynthesis?.cancel();
          setNarrando(false);
          console.info('[voz] el usuario interrumpió la narración');
        }
        if (resultado.isFinal) {
          finales = `${finales} ${transcrito}`;
          if (resultado[0].confidence) confianza = resultado[0].confidence;
          parcial = '';
        } else {
          parcial = transcrito;
        }
      }
      if (!interrumpido) return;
      const visible = sinEcoInicial(`${finales} ${parcial}`, narradas);
      if (visible) setTranscripcionParcial(visible);
      setEstado(ESTADOS_VOZ.TRANSCRIBIENDO);
      clearTimeout(silencioId);
      silencioId = setTimeout(() => rec.stop(), SILENCIO_INTERRUPCION_MS);
    };
    rec.onerror = () => { };
    rec.onend = () => {
      clearTimeout(silencioId);
      if (narracion.rec === rec) narracion.rec = null;
      if (!interrumpido) return;
      alInterrumpirRef.current?.(sinEcoInicial(`${finales} ${parcial}`, narradas), confianza);
    };
    try {
      rec.start();
    } catch {
      narracion.rec = null; // el micrófono está ocupado: la narración sigue sin interrupción
    }
  }, []);

  // alTerminar: lo que sigue cuando GELOX termina de hablar (p. ej. escuchar "confirmar"). Si el
  // usuario interrumpe, no se llama: la interrupción decide qué hacer con lo que dijo.
  const hablar = useCallback((texto, alTerminar) => {
    if (!window.speechSynthesis) {
      alTerminar?.();
      return;
    }
    const narracion = { interrumpida: false, terminada: false, rec: null };
    const fin = () => {
      if (narracion.terminada) return;
      narracion.terminada = true;
      if (narracionRef.current === narracion) {
        narracionRef.current = null;
        setNarrando(false);
      }
      if (narracion.interrumpida) return; // sigue escuchando al usuario; lo atiende alInterrumpirRef
      detenerEscuchaNarracion(narracion);
      if (alTerminar) {
        alTerminar();
      } else if (reanudarPendienteRef.current) {
        reanudarPendienteRef.current = false;
        reanudarPalabraClaveRef.current?.();
      }
    };
    try {
      window.speechSynthesis.cancel();
      const narrado = paraNarrar(texto);
      const utterance = new SpeechSynthesisUtterance(narrado);
      utterance.lang = 'es-CO';
      utterance.onend = fin;
      utterance.onerror = fin;
      utterance.onstart = () => {
        if (narracion.terminada) return;
        escucharInterrupcion(narracion, narrado);
      };
      narracionRef.current = narracion;
      setNarrando(true);
      window.speechSynthesis.speak(utterance);
    } catch {
      // Narración best-effort: si speechSynthesis falla no debe romper el flujo de voz.
      fin();
    }
  }, [escucharInterrupcion]);

  // La confirmación se escucha solo cuando GELOX termina de leer el resumen: si
  // no, el micrófono capta la narración y el "confirmar" queda pegado a ella.
  const [escuchandoConfirmacion, setEscuchandoConfirmacion] = useState(false);

  const dejarDeEsperarNarracion = useCallback(() => {
    clearTimeout(esperaNarracionRef.current);
    setEscuchandoConfirmacion(false);
  }, []);

  const hablarYLuegoEscuchar = useCallback((texto) => {
    dejarDeEsperarNarracion();
    const listo = () => {
      clearTimeout(esperaNarracionRef.current);
      setEscuchandoConfirmacion(true);
    };
    // ponytail: Chrome a veces no avisa el final de una narración larga; este tope lo cubre.
    esperaNarracionRef.current = setTimeout(listo, Math.min(20000, 1500 + (texto?.length ?? 0) * 75));
    hablar(texto ?? '', listo);
  }, [hablar, dejarDeEsperarNarracion]);

  // true mientras el asistente espera la respuesta a una pregunta suya (ver hablarYResponder).
  const [esperandoRespuesta, setEsperandoRespuesta] = useState(false);

  useEffect(() => { esperandoRespuestaRef.current = esperandoRespuesta; }, [esperandoRespuesta]);

  const terminar = useCallback((estadoFinal) => {
    dejarDeEsperarNarracion();
    setEsperandoRespuesta(false);
    setEstado(estadoFinal);
    // "Hola GELOX" vuelve cuando GELOX termine de hablar: mientras habla, el micrófono escucha interrupciones.
    if (narracionRef.current) reanudarPendienteRef.current = true;
    else reanudarPalabraClaveRef.current?.();
  }, [dejarDeEsperarNarracion]);

  // El backend hizo una pregunta (datos.esperaRespuesta): al terminar de leerla se vuelve a
  // abrir el micrófono y lo que se diga se envía como respuesta, sin repetir el comando.
  const iniciarRef = useRef(null);
  // true mientras la escucha en curso es la respuesta a una pregunta (se manda como continuacion).
  const respondiendoRef = useRef(false);

  const dejarDeEsperarPregunta = useCallback(() => {
    clearTimeout(esperaPreguntaRef.current.timer);
    esperaPreguntaRef.current.turno += 1; // invalida la escucha que estaba por arrancar
  }, []);

  const hablarYResponder = useCallback((texto) => {
    dejarDeEsperarPregunta();
    const turno = esperaPreguntaRef.current.turno;
    setEsperandoRespuesta(true);
    const escuchar = () => {
      if (esperaPreguntaRef.current.turno !== turno) return; // cancelado o ya arrancó
      esperaPreguntaRef.current.turno += 1;
      clearTimeout(esperaPreguntaRef.current.timer);
      iniciarRef.current?.({ conservarRespuesta: true });
    };
    // ponytail: igual que en la confirmación, por si el navegador no avisa el final de la narración.
    esperaPreguntaRef.current.timer = setTimeout(escuchar, Math.min(60000, 1500 + (texto?.length ?? 0) * 75));
    hablar(texto ?? '', escuchar);
  }, [hablar, dejarDeEsperarPregunta]);

  const hablarYSeguir = useCallback((texto) => {
    hablar(texto, () => iniciarRef.current?.({ conservarRespuesta: true, continuacion: false, silencioso: true }));
  }, [hablar]);

  const procesarTextoFinal = useCallback(
    async (texto, confianza, continuacion) => {
      setTextoFinal(texto);
      setEstado(ESTADOS_VOZ.INTERPRETANDO);
      try {
        const data = await interpretarComando(texto, confianza, continuacion);
        setRespuesta(data);
        if (data?.datos?.esperaRespuesta && !data?.requiereConfirmacion) {
          // Pregunta del asistente: queda esperando la respuesta, sin volver a la palabra clave.
          setEstado(ESTADOS_VOZ.COMPLETADO);
          hablarYResponder(data.textoRespuesta);
          return;
        }
        setEsperandoRespuesta(false);
        if (!data?.requiereConfirmacion && data?.ok && data?.datos?.recomendacionId
            && data?.intencion !== 'NAVEGACION' && data?.textoRespuesta) {
          // Tras narrar una recomendación el micrófono queda abierto un momento para seguir:
          // "sí, apruébala", "déjame modificarla"…
          setEstado(ESTADOS_VOZ.COMPLETADO);
          hablarYSeguir(data.textoRespuesta);
          return;
        }
        if (data?.requiereConfirmacion) hablarYLuegoEscuchar(data.textoRespuesta);
        else if (data?.textoRespuesta) hablar(data.textoRespuesta);
        if (data?.requiereConfirmacion) {
          respuestaLlegoEnRef.current = Date.now();
          console.info(`[voz-tiempos] respuesta con requiereConfirmacion recibida. expiraEnSegundos=${data.expiraEnSegundos}`);
          setEstado(ESTADOS_VOZ.ESPERANDO_CONFIRMACION);
        } else {
          terminar(ESTADOS_VOZ.COMPLETADO);
        }
      } catch (err) {
        const mensaje = mensajeDeError(err);
        setEsperandoRespuesta(false);
        setRespuesta({ textoRespuesta: mensaje });
        hablar(mensaje);
        terminar(ESTADOS_VOZ.ERROR);
      }
    },
    [hablar, hablarYLuegoEscuchar, hablarYResponder, hablarYSeguir, terminar]
  );

  const confirmar = useCallback(
    async (si) => {
      const comandoId = respuesta?.comandoId;
      const intencionPrevia = respuesta?.intencion;
      const datosPrevios = respuesta?.datos;
      if (!comandoId || confirmarEnCursoRef.current) return;
      confirmarEnCursoRef.current = true;
      dejarDeEsperarNarracion();
      setEstado(ESTADOS_VOZ.EJECUTANDO);
      const tLlamada = Date.now();
      const tDesdeRespuesta = respuestaLlegoEnRef.current ? tLlamada - respuestaLlegoEnRef.current : null;
      console.info(`[voz-tiempos] confirmar(${si}) llamado — ${tDesdeRespuesta != null ? (tDesdeRespuesta / 1000).toFixed(1) + 's desde que llegó la respuesta' : 'sin referencia'}`);
      try {
        const data = await confirmarComando(comandoId, si);
        const tRed = Date.now() - tLlamada;
        console.info(`[voz-tiempos] confirmarComando resolvió OK en ${(tRed / 1000).toFixed(1)}s de red/servidor`);
        const huboDatosNuevos = si && data?.datos && Object.keys(data.datos).length > 0;
        setRespuesta({
          comandoId,
          intencion: intencionPrevia,
          requiereConfirmacion: false,
          expiraEnSegundos: null,
          textoRespuesta: data?.textoRespuesta,
          // Se conservan los ítems ya mostrados: al confirmar el backend solo manda lo nuevo
          // (pedidoId, exportUrl) y al cancelar no manda nada.
          datos: huboDatosNuevos ? { ...datosPrevios, ...data.datos } : datosPrevios,
          cancelado: !si,
        });
        const seguir = si && intencionPrevia === 'DECIDIR_RECOMENDACION' && !data?.datos?.pedidoId
          && datosPrevios?.recomendacionId && data?.textoRespuesta;
        if (seguir) {
          setEstado(ESTADOS_VOZ.COMPLETADO);
          hablarYSeguir(data.textoRespuesta);
          return;
        }
        if (data?.textoRespuesta) hablar(data.textoRespuesta);
        terminar(si ? ESTADOS_VOZ.COMPLETADO : ESTADOS_VOZ.CANCELADO);
      } catch (err) {
        const tRed = Date.now() - tLlamada;
        console.info(`[voz-tiempos] confirmarComando FALLÓ en ${(tRed / 1000).toFixed(1)}s de red/servidor — status ${err?.response?.status}`);
        const status = err?.response?.status;
        if (status === 410) {
          const mensaje = err.response?.data?.error || MENSAJE_CANCELADO_POR_TIEMPO;
          setRespuesta((r) => ({ ...r, requiereConfirmacion: false, cancelado: true, textoRespuesta: mensaje }));
          hablar(mensaje);
          terminar(ESTADOS_VOZ.CANCELADO);
        } else if (status === 422) {
          const mensaje = err.response?.data?.error || MENSAJE_ERROR_GENERICO;
          setRespuesta({ textoRespuesta: mensaje });
          hablar(mensaje);
          terminar(ESTADOS_VOZ.INACTIVO);
        } else {
          const mensaje = mensajeDeError(err);
          setRespuesta({ textoRespuesta: mensaje });
          hablar(mensaje);
          terminar(ESTADOS_VOZ.ERROR);
        }
      } finally {
        confirmarEnCursoRef.current = false;
      }
    },
    [respuesta, hablar, hablarYSeguir, terminar, dejarDeEsperarNarracion]
  );

  // Escucha continua: junta lo dicho entre pausas cortas y solo envía el
  // comando cuando el usuario lleva SILENCIO_FIN_MS callado.
  // silencioso: escucha de seguimiento; si no se dice nada, termina sin "No te escuché".
  const crearReconocedor = useCallback((opciones = {}) => {
    const reconocimiento = new SpeechRecognitionCtor();
    reconocimiento.lang = 'es-CO';
    reconocimiento.interimResults = true;
    reconocimiento.continuous = true;
    reconocimiento.maxAlternatives = 1;

    let finales = '';
    let parcialActual = '';
    const confianzas = [];
    let ultimoError = null;
    let silencioId = null;
    let maximoId = setTimeout(() => reconocimiento.stop(), ESCUCHA_MAX_MS);

    reconocimiento.onresult = (evento) => {
      let parcial = '';
      for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
        const resultado = evento.results[i];
        const alternativa = resultado[0];
        if (resultado.isFinal) {
          finales = `${finales} ${alternativa.transcript}`.trim();
          confianzas.push(alternativa.confidence);
        } else {
          parcial += alternativa.transcript;
        }
      }
      parcialActual = parcial;
      const visible = `${finales} ${parcial}`.trim();
      if (visible) {
        setTranscripcionParcial(visible);
        setEstado(ESTADOS_VOZ.TRANSCRIBIENDO);
      }
      clearTimeout(silencioId);
      // stop() y no abort(): el navegador entrega como final lo que aún tenía en parcial.
      silencioId = setTimeout(() => reconocimiento.stop(), SILENCIO_FIN_MS);
    };

    reconocimiento.onerror = (evento) => {
      ultimoError = evento.error;
    };

    reconocimiento.onend = () => {
      clearTimeout(silencioId);
      clearTimeout(maximoId);
      const texto = (finales || parcialActual).trim();
      if (texto) {
        reintentoNoSpeechRef.current = false;
        const confianza = confianzas.length
          ? confianzas.reduce((a, b) => a + b, 0) / confianzas.length
          : 0; // solo hubo parcial: que el backend pida confirmación
        procesarTextoFinal(texto, confianza, respondiendoRef.current);
        return;
      }
      if (ERRORES_PERMISO.includes(ultimoError)) {
        setPermisoDenegado(true);
        terminar(ESTADOS_VOZ.ERROR);
        return;
      }
      if (opciones.silencioso) {
        terminar(ESTADOS_VOZ.COMPLETADO);
        return;
      }
      if (reintentoNoSpeechRef.current) {
        reintentoNoSpeechRef.current = false;
        terminar(ESTADOS_VOZ.CANCELADO);
        return;
      }
      // Un solo reintento: sin voz, o el micrófono aún ocupado por la escucha de "Hola GELOX".
      reintentoNoSpeechRef.current = true;
      const reintentar = () => {
        if (reconocedorRef.current !== reconocimiento) return; // cancelado mientras tanto
        ultimoError = null;
        maximoId = setTimeout(() => reconocimiento.stop(), ESCUCHA_MAX_MS);
        setEstado(ESTADOS_VOZ.ESCUCHANDO);
        try {
          reconocimiento.start();
        } catch {
          terminar(ESTADOS_VOZ.CANCELADO);
        }
      };
      if (ultimoError === 'no-speech') {
        setRespuesta({ textoRespuesta: MENSAJE_NO_TE_ESCUCHE });
        hablar(MENSAJE_NO_TE_ESCUCHE, reintentar);
      } else {
        setTimeout(reintentar, 300);
      }
    };

    return reconocimiento;
  }, [procesarTextoFinal, hablar, terminar]);

  // { conservarRespuesta: true }: escucha la respuesta a una pregunta sin borrar la pregunta de la pantalla.
  // Al usarse como onClick recibe el evento, que no trae esa opción: arranca de cero.
  const iniciar = useCallback((opciones) => {
    if (!soportado) return;
    const respondiendo = opciones?.conservarRespuesta === true;
    respondiendoRef.current = typeof opciones?.continuacion === 'boolean' ? opciones.continuacion : respondiendo;
    if (!respondiendo) {
      dejarDeEsperarPregunta();
      setEsperandoRespuesta(false);
    }
    reanudarPendienteRef.current = false;
    pausarPalabraClaveRef.current?.();
    callarNarracion();
    soltar(reconocedorRef.current);
    setTranscripcionParcial('');
    setTextoFinal('');
    if (!respondiendo) setRespuesta(null);
    setPermisoDenegado(false);
    reintentoNoSpeechRef.current = false;
    setEstado(ESTADOS_VOZ.ESCUCHANDO);
    const reconocimiento = crearReconocedor({ silencioso: opciones?.silencioso === true });
    reconocedorRef.current = reconocimiento;
    try {
      reconocimiento.start();
    } catch {
      // El navegador puede tardar un instante en soltar el micrófono de la palabra clave.
      setTimeout(() => {
        if (reconocedorRef.current !== reconocimiento) return;
        try {
          reconocimiento.start();
        } catch {
          terminar(ESTADOS_VOZ.ERROR);
        }
      }, 300);
    }
  }, [soportado, crearReconocedor, terminar, dejarDeEsperarPregunta, callarNarracion]);

  useEffect(() => {
    iniciarRef.current = iniciar;
  }, [iniciar]);

  // Responder la pregunta sin hablar (p. ej. tocando una de las opciones en el panel).
  const responder = useCallback((texto) => {
    if (!texto) return;
    dejarDeEsperarPregunta();
    soltar(reconocedorRef.current);
    reconocedorRef.current = null;
    callarNarracion();
    respondiendoRef.current = false;
    procesarTextoFinal(texto, 1, true);
  }, [dejarDeEsperarPregunta, procesarTextoFinal, callarNarracion]);

  const cancelar = useCallback(() => {
    dejarDeEsperarPregunta();
    setEsperandoRespuesta(false);
    soltar(reconocedorRef.current);
    reconocedorRef.current = null;
    callarNarracion();
    terminar(ESTADOS_VOZ.CANCELADO);
  }, [terminar, dejarDeEsperarPregunta, callarNarracion]);

  // "Déjame modificar": cancela lo que esperaba confirmación y abre la recomendación en pantalla.
  const irAModificar = useCallback(async () => {
    const r = respuestaRef.current;
    const id = r?.datos?.recomendacionId;
    dejarDeEsperarNarracion();
    if (r?.comandoId && r?.requiereConfirmacion) {
      try {
        await confirmarComando(r.comandoId, false);
      } catch {
        // ya había expirado: no hay nada que cancelar
      }
    }
    const texto = 'Te abro la recomendación para que la modifiques.';
    setRespuesta({
      intencion: 'NAVEGACION',
      ok: true,
      textoRespuesta: texto,
      datos: { ruta: id ? `${RUTA_RECOMENDACIONES}?id=${id}` : RUTA_RECOMENDACIONES, pantalla: 'Recomendación de Compras' },
    });
    hablar(texto);
    terminar(ESTADOS_VOZ.COMPLETADO);
  }, [hablar, terminar, dejarDeEsperarNarracion]);

  /**
   * Lo dicho mientras se espera "confirmar" (o "cancelar", "déjame modificar", "sí, apruébala"…).
   * Devuelve false si no es nada de eso.
   */
  const atenderEnConfirmacion = useCallback((alternativas, confianza) => {
    const r = respuestaRef.current;
    const principal = alternativas[0] ?? '';
    const esperandoAclaracion = !!(r?.datos?.requiereAclaracion || r?.datos?.requiereDestinatario);
    const tReconocido = respuestaLlegoEnRef.current ? Date.now() - respuestaLlegoEnRef.current : null;
    const cuando = tReconocido != null ? `${(tReconocido / 1000).toFixed(1)}s desde que llegó la respuesta` : 'sin referencia';
    if (r?.datos?.recomendacionId && alternativas.some(esModificar)) {
      irAModificar();
      return true;
    }
    if (alternativas.some(esCancelar)) {
      console.info(`[voz-tiempos] "cancelar" reconocido por el navegador — ${cuando}`);
      confirmar(false);
      return true;
    }
    if (esperandoAclaracion) {
      console.info(`[voz-tiempos] respuesta a aclaración reconocida — ${cuando}`);
      procesarTextoFinal(principal, confianza);
      return true;
    }
    const esAprobacion = /^aprobar\b/i.test(r?.textoRespuesta ?? '');
    if (alternativas.some(esConfirmar) || (esAprobacion && alternativas.some(esAprobarEsa))) {
      console.info(`[voz-tiempos] "confirmar" reconocido por el navegador — ${cuando}`);
      confirmar(true);
      return true;
    }
    if (AGREGAR_REGEX.test(normalizar(principal)) && r?.intencion === 'REGISTRAR_VENTA') {
      procesarTextoFinal(principal, confianza);
      return true;
    }
    return false;
  }, [confirmar, procesarTextoFinal, irAModificar]);

  // Qué hacer con lo que el usuario dijo al interrumpir a GELOX. Texto vacío = solo dijo "espera"/"para":
  // se pasa directo a escuchar.
  const atenderInterrupcion = useCallback((dicho, confianza) => {
    const texto = (dicho ?? '').trim();
    const r = respuestaRef.current;
    if (estadoRef.current === ESTADOS_VOZ.ESPERANDO_CONFIRMACION || r?.requiereConfirmacion) {
      setEstado(ESTADOS_VOZ.ESPERANDO_CONFIRMACION);
      if (!texto) {
        setEscuchandoConfirmacion(true);
        return;
      }
      if (atenderEnConfirmacion([texto], confianza)) return;
      procesarTextoFinal(texto, confianza, false); // otra cosa: comando nuevo
      return;
    }
    if (esperandoRespuestaRef.current) {
      if (!texto) iniciar({ conservarRespuesta: true });
      else procesarTextoFinal(texto, confianza, true);
      return;
    }
    if (!texto) {
      iniciar({ conservarRespuesta: true, continuacion: false });
      return;
    }
    if (r?.datos?.recomendacionId && esModificar(texto)) {
      irAModificar();
      return;
    }
    procesarTextoFinal(texto, confianza, false);
  }, [atenderEnConfirmacion, procesarTextoFinal, iniciar, irAModificar]);

  useEffect(() => {
    alInterrumpirRef.current = atenderInterrupcion;
  }, [atenderInterrupcion]);

  useEffect(() => {
    return () => {
      soltar(reconocedorRef.current);
      detenerEscuchaNarracion(narracionRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);


  useEffect(() => {
    if (estado !== ESTADOS_VOZ.ESPERANDO_CONFIRMACION || !escuchandoConfirmacion || !soportado) return;

    const esperandoAclaracion = !!(respuesta?.datos?.requiereAclaracion || respuesta?.datos?.requiereDestinatario);
    const reconocimiento = new SpeechRecognitionCtor();
    let debeSeguirEscuchando = false;
    let reintentoInicioId = null;

    reconocimiento.lang = 'es-CO';
    reconocimiento.interimResults = false;
    // Continuo para no perder lo dicho en los reinicios; una aclaración ("doña Marta") va en una sola frase.
    reconocimiento.continuous = !esperandoAclaracion;
    reconocimiento.maxAlternatives = 3;

    reconocimiento.onresult = (evento) => {
      for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
        const resultado = evento.results[i];
        if (!resultado.isFinal) continue;
        // A veces "confirmar" solo aparece en la 2.ª o 3.ª alternativa del reconocedor.
        const alternativas = Array.from(resultado, (alt) => alt.transcript);
        if (atenderEnConfirmacion(alternativas, resultado[0].confidence)) return;
        // no matcheó ninguno de los patrones: se ignora, sigue escuchando
      }
    };
    reconocimiento.onerror = () => { };
    reconocimiento.onend = () => {
      if (debeSeguirEscuchando) {
        try {
          reconocimiento.start();
        } catch {
          /* ya en curso */
        }
      }
    };

    debeSeguirEscuchando = true;
    const intentarIniciar = (intentosRestantes) => {
      if (!debeSeguirEscuchando) return;
      try {
        reconocimiento.start();
      } catch {
        if (intentosRestantes > 0) {
          reintentoInicioId = setTimeout(() => intentarIniciar(intentosRestantes - 1), 250);
        } else {
          console.warn('[voz] el micrófono de confirmación no pudo iniciar tras varios intentos.');
        }
      }
    };
    intentarIniciar(3);

    return () => {
      debeSeguirEscuchando = false;
      clearTimeout(reintentoInicioId);
      reconocimiento.onend = null;
      reconocimiento.abort();
    };
  }, [estado, escuchandoConfirmacion, respuesta, soportado, atenderEnConfirmacion]);

  // T40-FE4 — Palabra clave "Hola GELOX" (encendida por defecto, se apaga en el panel).
  // Solo arranca con el permiso del micrófono ya concedido, para no pedirlo al
  // cargar la página: la primera vez hay que usar el botón.
  useEffect(() => {
    if (!soportado) return;

    let reconocimiento = null;
    let debeSeguirEscuchando = false;

    const detener = () => {
      debeSeguirEscuchando = false;
      if (reconocimiento) {
        reconocimiento.onend = null;
        reconocimiento.abort();
        reconocimiento = null;
      }
    };

    const escuchar = () => {
      if (reconocimiento) return; // ya está escuchando
      reconocimiento = new SpeechRecognitionCtor();
      reconocimiento.lang = 'es-CO';
      reconocimiento.interimResults = true;
      reconocimiento.continuous = true;
      reconocimiento.maxAlternatives = 3;

      reconocimiento.onresult = (evento) => {
        for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
          if (Array.from(evento.results[i], (alt) => alt.transcript).some(contienePalabraClave)) {
            detener();
            alActivarPorVozRef.current?.();
            iniciar();
            return;
          }
        }
      };
      // El propio onend reintenta; sin permiso no tiene sentido seguir.
      reconocimiento.onerror = (evento) => {
        if (ERRORES_PERMISO.includes(evento.error)) debeSeguirEscuchando = false;
      };
      reconocimiento.onend = () => {
        if (debeSeguirEscuchando) {
          try {
            reconocimiento.start();
          } catch {
            /* ya en curso */
          }
        }
      };

      debeSeguirEscuchando = true;
      try {
        reconocimiento.start();
      } catch {
        /* el navegador puede tardar un tick en soltar el micrófono anterior */
      }
    };

    let vigente = true;
    const sincronizarConPreferencia = async () => {
      if (!palabraClaveHabilitada()) {
        detener();
        return;
      }
      try {
        const permiso = await navigator.permissions?.query({ name: 'microphone' });
        if (permiso && permiso.state !== 'granted') return;
      } catch {
        // Navegador sin Permissions API para el micrófono: se intenta igual.
      }
      if (vigente) escuchar();
    };

    sincronizarConPreferencia();
    pausarPalabraClaveRef.current = detener;
    reanudarPalabraClaveRef.current = sincronizarConPreferencia;

    window.addEventListener('storage', sincronizarConPreferencia);
    window.addEventListener(EVENTO_PALABRA_CLAVE, sincronizarConPreferencia);

    return () => {
      vigente = false;
      detener();
      pausarPalabraClaveRef.current = null;
      reanudarPalabraClaveRef.current = null;
      window.removeEventListener('storage', sincronizarConPreferencia);
      window.removeEventListener(EVENTO_PALABRA_CLAVE, sincronizarConPreferencia);
    };
  }, [soportado, iniciar]);

  return {
    soportado,
    permisoDenegado,
    estado,
    transcripcionParcial,
    textoFinal,
    respuesta,
    escuchandoConfirmacion,
    esperandoRespuesta,
    narrando,
    iniciar,
    responder,
    cancelar,
    hablar,
    confirmar,
  };
}
