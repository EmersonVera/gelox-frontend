// node src/hooks/frasesVoz.check.mjs
import assert from 'node:assert/strict';
import { contienePalabraClave, esConfirmar, esCancelar, FRASES_AYUDA } from './frasesVoz.js';

for (const t of ['Hola GELOX', 'hola, Gélox.', 'Hola jelox', 'hola helox', 'Hola gelos', 'hola yelox',
  'ola gelox', 'Hola gel ox', 'hola glox', 'hola chelos', 'hola gelo', 'oye, hola GELOX ¿cuántas cajas quedan?']) {
  assert.ok(contienePalabraClave(t), t);
}
for (const t of ['hola', 'hola los productos', 'hola el pedido', 'cuántas cajas de Festival quedan', 'gelox']) {
  assert.ok(!contienePalabraClave(t), t);
}

for (const t of ['Confirmar', 'confirmar.', 'Sí', 'sí, confirmo', 'dale', 'Listo', 'confirmar por favor', 'ok',
  'Con firmar', 'bueno, sí confirmo', 'eh confirmar', 'acepto', 'perfecto', 'adelante', 'confirmar el pedido',
  'sí señora', 'de acuerdo']) {
  assert.ok(esConfirmar(t), t);
}
for (const t of ['Total $5.000. ¿Confirmas?', 'no', 'confirmar no', 'Venta ventanilla: 2 cajas de Festival',
  'Cancelar']) assert.ok(!esConfirmar(t), t);

for (const t of ['Cancelar', 'cancela', 'No', 'no, cancelar', 'olvídalo', 'Rechazar', 'rechazo', 'recházalo',
  'anular', 'mejor no', 'no gracias', 'bueno, cancela la venta']) assert.ok(esCancelar(t), t);
for (const t of ['confirmar', 'no sé qué decir', '¿Confirmas?', 'sí']) assert.ok(!esCancelar(t), t);

// RF55 — la ayuda muestra las frases del diseño (§2.11.5)
for (const t of ['¿Qué me recomiendas pedir con dos millones?', 'Aprueba el Mango Biche',
  'Cambia el Mango Biche a 3 cajas', 'Aprueba todo', 'Genera el pedido']) {
  assert.ok(FRASES_AYUDA.includes(t), t);
}
// Ninguna frase de ayuda debe confundirse con confirmar o cancelar
for (const t of FRASES_AYUDA) assert.ok(!esConfirmar(t) && !esCancelar(t), t);

console.log('frasesVoz OK');
