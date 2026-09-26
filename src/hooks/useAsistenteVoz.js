import { useCallback, useEffect, useRef, useState } from 'react';
import { interpretarComando, confirmarComando } from '../services/vozService';

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

// T40-FE4 — clave de localStorage y evento custom que debe disparar el
// interruptor del panel (aún no existe) al cambiar la preferencia, para que
// este hook reaccione sin necesidad de remontarse:
//   localStorage.setItem(CLAVE_PALABRA_CLAVE, '1' | '0');
//   window.dispatchEvent(new Event(EVENTO_PALABRA_CLAVE));
export const CLAVE_PALABRA_CLAVE = 'gelox_voz_palabra_clave';
export const EVENTO_PALABRA_CLAVE = 'gelox:voz-palabra-clave-cambio';

// Variantes (ya normalizadas: sin tildes, en minúsculas) que el reconocedor
// suele transcribir para "Hola GELOX".
const VARIANTES_PALABRA_CLAVE = ['hola gelox', 'hola jelox', 'hola helox'];

const MENSAJE_NO_TE_ESCUCHE = 'No te escuché, repite el comando';
const MENSAJE_ERROR_GENERICO = 'No pude procesar el comando';
const MENSAJE_CANCELADO_POR_TIEMPO = 'Operación cancelada por falta de respuesta';


const CONFIRMAR_REGEX = /^(confirmar|confirmo|si|dale)$/;
const CANCELAR_REGEX = /^(cancelar|cancela|no)$/;
const AGREGAR_REGEX = /agrega/;

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes
    .replace(/[^a-z\s]/g, ' ') // el reconocedor a veces agrega puntuación
    .replace(/\s+/g, ' ')
    .trim();
}

function contienePalabraClave(texto) {
  const normalizado = normalizar(texto);
  return VARIANTES_PALABRA_CLAVE.some((variante) => normalizado.includes(variante));
}

const MONTO_COP_REGEX = /\$\s?(\d+(?:\.\d{3})*)|\b(\d{1,3}(?:\.\d{3})+)\b/g;


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


export function useAsistenteVoz() {
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

  const hablar = useCallback((texto) => {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(paraNarrar(texto));
      utterance.lang = 'es-CO';
      window.speechSynthesis.speak(utterance);
    } catch {
      // Narración best-effort: si speechSynthesis falla no debe romper el flujo de voz.
    }
  }, []);

  const terminar = useCallback((estadoFinal) => {
    setEstado(estadoFinal);
    reanudarPalabraClaveRef.current?.();
  }, []);

  const procesarTextoFinal = useCallback(
    async (texto, confianza) => {
      setTextoFinal(texto);
      setEstado(ESTADOS_VOZ.INTERPRETANDO);
      try {
        const data = await interpretarComando(texto, confianza);
        setRespuesta(data);
        if (data?.textoRespuesta) hablar(data.textoRespuesta);
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
    [hablar, terminar]
  );

  const confirmar = useCallback(
    async (si) => {
      const comandoId = respuesta?.comandoId;
      const intencionPrevia = respuesta?.intencion;
      const datosPrevios = respuesta?.datos;
      if (!comandoId || confirmarEnCursoRef.current) return;
      confirmarEnCursoRef.current = true;
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
          datos: huboDatosNuevos ? { ...datosPrevios, ...data.datos } : (data?.datos ?? null),
        });
        if (data?.textoRespuesta) hablar(data.textoRespuesta);
        terminar(si ? ESTADOS_VOZ.COMPLETADO : ESTADOS_VOZ.CANCELADO);
      } catch (err) {
        const tRed = Date.now() - tLlamada;
        console.info(`[voz-tiempos] confirmarComando FALLÓ en ${(tRed / 1000).toFixed(1)}s de red/servidor — status ${err?.response?.status}`);
        const status = err?.response?.status;
        if (status === 410) {
          const mensaje = err.response?.data?.error || MENSAJE_CANCELADO_POR_TIEMPO;
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
    [respuesta, hablar, terminar]
  );

  const crearReconocedor = useCallback(() => {
    const reconocimiento = new SpeechRecognitionCtor();
    reconocimiento.lang = 'es-CO';
    reconocimiento.interimResults = true;
    reconocimiento.continuous = false;
    reconocimiento.maxAlternatives = 1;

    reconocimiento.onresult = (evento) => {
      let parcial = '';
      for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
        const resultado = evento.results[i];
        const alternativa = resultado[0];
        if (resultado.isFinal) {
          reintentoNoSpeechRef.current = false;

          reconocimiento.onresult = null;
          reconocimiento.onerror = null;
          reconocimiento.abort();
          procesarTextoFinal(alternativa.transcript, alternativa.confidence);
          return;
        }
        parcial += alternativa.transcript;
      }
      if (parcial) {
        setTranscripcionParcial(parcial);
        setEstado(ESTADOS_VOZ.TRANSCRIBIENDO);
      }
    };

    reconocimiento.onerror = (evento) => {
      if (evento.error === 'no-speech') {
        if (!reintentoNoSpeechRef.current) {
          reintentoNoSpeechRef.current = true;
          setRespuesta({ textoRespuesta: MENSAJE_NO_TE_ESCUCHE });
          hablar(MENSAJE_NO_TE_ESCUCHE);
          try {
            reconocimiento.start(); // reintento automático, único
          } catch {
            terminar(ESTADOS_VOZ.CANCELADO);
          }
          return;
        }
        reintentoNoSpeechRef.current = false;
        terminar(ESTADOS_VOZ.CANCELADO);
        return;
      }
      if (evento.error === 'not-allowed' || evento.error === 'service-not-allowed') {
        setPermisoDenegado(true);
        terminar(ESTADOS_VOZ.ERROR);
        return;
      }
      terminar(ESTADOS_VOZ.ERROR);
    };

    return reconocimiento;
  }, [procesarTextoFinal, hablar, terminar]);

  const iniciar = useCallback(() => {
    if (!soportado) return;
    pausarPalabraClaveRef.current?.();
    window.speechSynthesis?.cancel();
    setTranscripcionParcial('');
    setTextoFinal('');
    setRespuesta(null);
    setPermisoDenegado(false);
    reintentoNoSpeechRef.current = false;
    setEstado(ESTADOS_VOZ.ESCUCHANDO);
    const reconocimiento = crearReconocedor();
    reconocedorRef.current = reconocimiento;
    reconocimiento.start();
  }, [soportado, crearReconocedor]);

  const cancelar = useCallback(() => {
    reconocedorRef.current?.abort();
    window.speechSynthesis?.cancel();
    terminar(ESTADOS_VOZ.CANCELADO);
  }, [terminar]);

  useEffect(() => {
    return () => {
      reconocedorRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);


  useEffect(() => {
    if (estado !== ESTADOS_VOZ.ESPERANDO_CONFIRMACION || !soportado) return;

    const intencionActual = respuesta?.intencion;
    const esperandoAclaracion = !!(respuesta?.datos?.requiereAclaracion || respuesta?.datos?.requiereDestinatario);
    const reconocimiento = new SpeechRecognitionCtor();
    let debeSeguirEscuchando = false;
    let reintentoInicioId = null;

    reconocimiento.lang = 'es-CO';
    reconocimiento.interimResults = false;
    reconocimiento.continuous = false;
    reconocimiento.maxAlternatives = 1;

    reconocimiento.onresult = (evento) => {
      for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
        const resultado = evento.results[i];
        if (!resultado.isFinal) continue;
        const alternativa = resultado[0];
        const normalizado = normalizar(alternativa.transcript);
        const tReconocido = respuestaLlegoEnRef.current ? Date.now() - respuestaLlegoEnRef.current : null;
        if (CANCELAR_REGEX.test(normalizado)) {
          console.info(`[voz-tiempos] "cancelar" reconocido por el navegador — ${tReconocido != null ? (tReconocido / 1000).toFixed(1) + 's desde que llegó la respuesta' : 'sin referencia'}`);
          confirmar(false);
          return;
        }
        if (esperandoAclaracion) {

          console.info(`[voz-tiempos] respuesta a aclaración reconocida — ${tReconocido != null ? (tReconocido / 1000).toFixed(1) + 's desde que llegó la respuesta' : 'sin referencia'}`);
          procesarTextoFinal(alternativa.transcript, alternativa.confidence);
          return;
        }
        if (CONFIRMAR_REGEX.test(normalizado)) {
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
  }, [estado, respuesta, soportado, confirmar, procesarTextoFinal]);

  // T40-FE4 — Palabra clave "Hola GELOX" (opcional, apagada por defecto).
  // LIMITACIÓN: solo detecta la palabra clave mientras esta pestaña siga
  // abierta y el permiso del micrófono ya haya sido concedido antes; este
  // reconocedor en segundo plano no puede disparar el prompt de permiso por
  // sí mismo, así que si el usuario nunca aceptó el micrófono no pasa nada.
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
      reconocimiento.maxAlternatives = 1;

      reconocimiento.onresult = (evento) => {
        for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
          if (contienePalabraClave(evento.results[i][0].transcript)) {
            iniciar();
            return;
          }
        }
      };
      // Errores silenciosos: el propio onend decide si reintenta.
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
      try {
        reconocimiento.start();
      } catch {
        /* el navegador puede tardar un tick en soltar el micrófono anterior */
      }
    };

    const sincronizarConPreferencia = () => {
      const habilitado = localStorage.getItem(CLAVE_PALABRA_CLAVE) === '1';
      if (habilitado) escuchar();
      else detener();
    };

    sincronizarConPreferencia();
    pausarPalabraClaveRef.current = detener;
    reanudarPalabraClaveRef.current = sincronizarConPreferencia;

    window.addEventListener('storage', sincronizarConPreferencia);
    window.addEventListener(EVENTO_PALABRA_CLAVE, sincronizarConPreferencia);

    return () => {
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
    iniciar,
    cancelar,
    hablar,
    confirmar,
  };
}
