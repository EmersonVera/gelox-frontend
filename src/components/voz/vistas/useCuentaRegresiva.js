import { useEffect, useState } from 'react';

/**
 * Segundos que quedan para confirmar un comando de voz. Se reinicia cuando
 * llega un expiraEnSegundos nuevo y solo descuenta mientras `activo`.
 * Compartido por VistaModificarPedido (RF53) y VistaRecomendacion (RF55).
 */
export default function useCuentaRegresiva(expiraEnSegundos, activo) {
  const [restantes, setRestantes] = useState(expiraEnSegundos ?? null);
  const [expiraPrevio, setExpiraPrevio] = useState(expiraEnSegundos ?? null);

  // Reinicia el contador cuando llega una nueva expiración (nuevo comando de
  // voz), ajustando el estado durante el render en vez de en un efecto.
  if ((expiraEnSegundos ?? null) !== expiraPrevio) {
    setExpiraPrevio(expiraEnSegundos ?? null);
    setRestantes(expiraEnSegundos ?? null);
  }

  useEffect(() => {
    if (!activo || restantes === null || restantes <= 0) return;
    const id = setTimeout(() => setRestantes((r) => Math.max(0, r - 1)), 1000);
    return () => clearTimeout(id);
  }, [activo, restantes]);

  return restantes;
}
