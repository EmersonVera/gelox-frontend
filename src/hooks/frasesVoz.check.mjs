// node src/hooks/frasesVoz.check.mjs
import assert from 'node:assert/strict';
import {
  contienePalabraClave, esConfirmar, esCancelar, esAprobarEsa, esModificar, detectarInterrupcion, sinEcoInicial,
  palabrasDe, FRASES_AYUDA,
} from './frasesVoz.js';

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

// "Sí, aprueba esa" confirma una aprobación
for (const t of ['sí, aprueba esa', 'apruébala', 'Aprueba esa', 'sí apruébala por favor', 'dale, apruébala',
  'aprueba eso', 'aprueba todo']) assert.ok(esAprobarEsa(t), t);
for (const t of ['aprueba el mango biche', 'no', 'rechaza esa']) assert.ok(!esAprobarEsa(t), t);

// "Déjame modificar" abre la recomendación
for (const t of ['déjame modificar', 'Déjame modificarla', 'quiero cambiar algo', 'no, mejor modificar',
  'modifícala', 'quiero editar la recomendación', 'espera, déjame revisarla']) assert.ok(esModificar(t), t);
for (const t of ['cambia el mango biche a 3 cajas', 'modificar el pedido 2', 'confirmar', 'sí']) {
  assert.ok(!esModificar(t), t);
}

// Interrumpir mientras el asistente habla: el eco de la narración no corta, la voz del usuario sí
const narrado = palabrasDe('Pedido: 20 cajas de Solo Lack y 5 cajas de Festival para doña Marta. ¿Confirmas?');
for (const eco of ['pedido 20 cajas de solo lack', 'y 5 cajas de festival', 'para doña marta confirmas', 'cajas']) {
  assert.equal(detectarInterrupcion(eco, narrado), null, eco);
}
assert.equal(detectarInterrupcion('espera', narrado), 'corte');
assert.equal(detectarInterrupcion('cajas de festival detente', narrado), 'corte');
assert.equal(detectarInterrupcion('para', narrado), null, '"para" lo dice la narración: no corta');
assert.equal(detectarInterrupcion('sí', narrado), 'voz');
assert.equal(detectarInterrupcion('quita el minions mejor', narrado), 'voz');
assert.equal(detectarInterrupcion('de festival déjame modificar', narrado), 'voz');
assert.equal(sinEcoInicial('cajas de festival quita el minions', narrado), 'quita el minions');
assert.equal(sinEcoInicial('detente sí confirmo', narrado), 'si confirmo');

console.log('frasesVoz OK');
