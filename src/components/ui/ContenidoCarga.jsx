const SPINNER_BLANCO = (
  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin shrink-0" />
);

/**
 * Contenido de un botón que, mientras envía, muestra un spinner y otro texto sin cambiar de tamaño.
 * Las dos versiones ocupan la misma celda de un grid y solo se oculta (invisible) la que no aplica,
 * así el botón mide siempre lo que la más ancha y no "salta" al hacer clic.
 *
 * spinner: por defecto el spinner blanco de los botones primary / danger; se puede pasar el
 * spinner propio del botón o null cuando el botón solo cambia el texto.
 */
export default function ContenidoCarga({ cargando, textoCargando, spinner = SPINNER_BLANCO, children }) {
  const capa = 'col-start-1 row-start-1 flex items-center justify-center gap-2';
  return (
    <span className="grid">
      <span className={`${capa} ${cargando ? 'invisible' : ''}`}>{children}</span>
      <span className={`${capa} ${cargando ? '' : 'invisible'}`}>
        {spinner}
        {textoCargando}
      </span>
    </span>
  );
}
