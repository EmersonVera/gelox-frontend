import { useEffect, useRef, useState } from 'react';

/**
 * Devuelve { ref, isActive }.
 * isActive = true mientras la sección esté suficientemente visible en el viewport.
 */
export function useScrollHighlight(threshold = 0.25) {
  const ref = useRef(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsActive(entry.isIntersecting),
      {
        threshold,
        rootMargin: '-64px 0px 0px 0px', // descuenta altura del navbar
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isActive };
}
