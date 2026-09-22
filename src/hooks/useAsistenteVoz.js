import { useCallback, useEffect, useRef, useState } from 'react';
import { interpretarComando } from '../services/vozService';

const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

// FP-15 §2.5 — máquina de estados del asistente de voz.
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

function mensajeDeError(err) {
  const status = err?.response?.status;
  if (status === 403) return 'No tienes permiso para esa consulta';
  if (status === 410) return 'La confirmación expiró';
  if (status === 422) {
    return err.response?.data?.mensaje ?? err.response?.data?.message ?? MENSAJE_ERROR_GENERICO;
  }
  // 5xx o sin red (status undefined porque la request nunca llegó a completarse)
  return MENSAJE_ERROR_GENERICO;
}

/**
 * Maneja el micrófono (SpeechRecognition) y la voz del asistente
 * (SpeechSynthesis). Devuelve {soportado, permisoDenegado, estado,
 * transcripcionParcial, textoFinal, respuesta, iniciar, cancelar, hablar}.
 */
export function useAsistenteVoz() {
  const soportado = !!SpeechRecognitionCtor;

  const [permisoDenegado, setPermisoDenegado] = useState(false);
  const [estado, setEstado] = useState(ESTADOS_VOZ.INACTIVO);
  const [transcripcionParcial, setTranscripcionParcial] = useState('');
  const [textoFinal, setTextoFinal] = useState('');
  const [respuesta, setRespuesta] = useState(null);

  const reconocedorRef = useRef(null);
  const reintentoNoSpeechRef = useRef(false);

  // Registrados por el efecto de la palabra clave (T40-FE4) para poder
  // silenciar el micrófono en segundo plano mientras el asistente principal
  // está escuchando, y reanudarlo cuando este vuelve a estar inactivo.
  const pausarPalabraClaveRef = useRef(null);
  const reanudarPalabraClaveRef = useRef(null);

  const hablar = useCallback((texto) => {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = 'es-CO';
      window.speechSynthesis.speak(utterance);
    } catch {
      // La narración es un complemento: si el navegador la rechaza (sin voces
      // cargadas, pestaña sin foco, etc.) no debe interrumpir el flujo — por
      // ejemplo, el reintento automático de "no-speech" que sigue a esta
      // llamada en crearReconocedor().
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
        terminar(data?.requiereConfirmacion ? ESTADOS_VOZ.ESPERANDO_CONFIRMACION : ESTADOS_VOZ.COMPLETADO);
      } catch (err) {
        const mensaje = mensajeDeError(err);
        setRespuesta({ textoRespuesta: mensaje });
        hablar(mensaje);
        terminar(ESTADOS_VOZ.ERROR);
      }
    },
    [hablar, terminar]
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
          procesarTextoFinal(alternativa.transcript, alternativa.confidence);
        } else {
          parcial += alternativa.transcript;
        }
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
      reconocimiento.onerror = () => {};
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
  };
}
