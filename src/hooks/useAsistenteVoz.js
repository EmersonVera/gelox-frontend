import { useCallback, useEffect, useRef, useState } from 'react';
import { interpretarComando, confirmarComando } from '../services/vozService';
import { contienePalabraClave, esCancelar, esConfirmar, normalizar } from './frasesVoz';

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

  // alTerminar: para volver a escuchar sin que el micrófono capte la propia narración.
  const hablar = useCallback((texto, alTerminar) => {
    if (!window.speechSynthesis) {
      alTerminar?.();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(paraNarrar(texto));
      utterance.lang = 'es-CO';
      if (alTerminar) {
        utterance.onend = alTerminar;
        utterance.onerror = alTerminar;
      }
      window.speechSynthesis.speak(utterance);
    } catch {
      // Narración best-effort: si speechSynthesis falla no debe romper el flujo de voz.
      alTerminar?.();
    }
  }, []);

  // La confirmación se escucha solo cuando GELOX termina de leer el resumen: si
  // no, el micrófono capta la narración y el "confirmar" queda pegado a ella.
  const [escuchandoConfirmacion, setEscuchandoConfirmacion] = useState(false);
  const esperaNarracionRef = useRef(null);

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

  const terminar = useCallback((estadoFinal) => {
    dejarDeEsperarNarracion();
    setEstado(estadoFinal);
    reanudarPalabraClaveRef.current?.();
  }, [dejarDeEsperarNarracion]);

  const procesarTextoFinal = useCallback(
    async (texto, confianza) => {
      setTextoFinal(texto);
      setEstado(ESTADOS_VOZ.INTERPRETANDO);
      try {
        const data = await interpretarComando(texto, confianza);
        setRespuesta(data);
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
        setRespuesta({ textoRespuesta: mensaje });
        hablar(mensaje);
        terminar(ESTADOS_VOZ.ERROR);
      }
    },
    [hablar, hablarYLuegoEscuchar, terminar]
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
    [respuesta, hablar, terminar, dejarDeEsperarNarracion]
  );

  // Escucha continua: junta lo dicho entre pausas cortas y solo envía el
  // comando cuando el usuario lleva SILENCIO_FIN_MS callado.
  const crearReconocedor = useCallback(() => {
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
        procesarTextoFinal(texto, confianza);
        return;
      }
      if (ERRORES_PERMISO.includes(ultimoError)) {
        setPermisoDenegado(true);
        terminar(ESTADOS_VOZ.ERROR);
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

  const iniciar = useCallback(() => {
    if (!soportado) return;
    pausarPalabraClaveRef.current?.();
    window.speechSynthesis?.cancel();
    soltar(reconocedorRef.current);
    setTranscripcionParcial('');
    setTextoFinal('');
    setRespuesta(null);
    setPermisoDenegado(false);
    reintentoNoSpeechRef.current = false;
    setEstado(ESTADOS_VOZ.ESCUCHANDO);
    const reconocimiento = crearReconocedor();
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
  }, [soportado, crearReconocedor, terminar]);

  const cancelar = useCallback(() => {
    soltar(reconocedorRef.current);
    reconocedorRef.current = null;
    window.speechSynthesis?.cancel();
    terminar(ESTADOS_VOZ.CANCELADO);
  }, [terminar]);

  useEffect(() => {
    return () => {
      soltar(reconocedorRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);


  useEffect(() => {
    if (estado !== ESTADOS_VOZ.ESPERANDO_CONFIRMACION || !escuchandoConfirmacion || !soportado) return;

    const intencionActual = respuesta?.intencion;
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
        const alternativa = resultado[0];
        const normalizado = normalizar(alternativa.transcript);
        // A veces "confirmar" solo aparece en la 2.ª o 3.ª alternativa del reconocedor.
        const alternativas = Array.from(resultado, (alt) => alt.transcript);
        const tReconocido = respuestaLlegoEnRef.current ? Date.now() - respuestaLlegoEnRef.current : null;
        if (alternativas.some(esCancelar)) {
          console.info(`[voz-tiempos] "cancelar" reconocido por el navegador — ${tReconocido != null ? (tReconocido / 1000).toFixed(1) + 's desde que llegó la respuesta' : 'sin referencia'}`);
          confirmar(false);
          return;
        }
        if (esperandoAclaracion) {

          console.info(`[voz-tiempos] respuesta a aclaración reconocida — ${tReconocido != null ? (tReconocido / 1000).toFixed(1) + 's desde que llegó la respuesta' : 'sin referencia'}`);
          procesarTextoFinal(alternativa.transcript, alternativa.confidence);
          return;
        }
        if (alternativas.some(esConfirmar)) {
          console.info(`[voz-tiempos] "confirmar" reconocido por el navegador — ${tReconocido != null ? (tReconocido / 1000).toFixed(1) + 's desde que llegó la respuesta' : 'sin referencia'}`);
          confirmar(true);
          return;
        }
        if (AGREGAR_REGEX.test(normalizado) && intencionActual === 'REGISTRAR_VENTA') {
          procesarTextoFinal(alternativa.transcript, alternativa.confidence);
          return;
        }
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
  }, [estado, escuchandoConfirmacion, respuesta, soportado, confirmar, procesarTextoFinal]);

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
    iniciar,
    cancelar,
    hablar,
    confirmar,
  };
}
