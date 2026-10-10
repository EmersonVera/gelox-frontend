// node src/hooks/frasesVoz.check.mjs
import assert from 'node:assert/strict';
import { contienePalabraClave, esConfirmar, esCancelar } from './frasesVoz.js';

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

console.log('frasesVoz OK');
