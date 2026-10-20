// node src/hooks/frasesVoz.check.mjs
import assert from 'node:assert/strict';
import {
  contienePalabraClave, esConfirmar, esCancelar, FRASES_AYUDA, fraseRecomendacion, montoDicho, numeroDicho,
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

// RF55 — montos y cantidades dichos de viva voz
assert.equal(montoDicho('con dos millones'), 2_000_000);
assert.equal(montoDicho('dos millones quinientos mil'), 2_500_000);
assert.equal(montoDicho('ocho millones y medio'), 8_500_000);
assert.equal(montoDicho('con $8.500.000'), 8_500_000);
assert.equal(montoDicho('un millón'), 1_000_000);
assert.equal(montoDicho('quinientos mil pesos'), 500_000);
assert.equal(montoDicho('qué me recomiendas pedir'), null);
assert.equal(numeroDicho('veinte'), 20);
assert.equal(numeroDicho('treinta y cinco'), 35);
assert.equal(numeroDicho('12'), 12);

// RF55 — los ejemplos de la ayuda que son del módulo se reconocen
assert.deepEqual(fraseRecomendacion('¿Qué me recomiendas pedir con dos millones?'),
  { intencion: 'CONSULTAR_RECOMENDACION', presupuesto: 2_000_000 });
assert.deepEqual(fraseRecomendacion('Aprueba el Festival'),
  { intencion: 'DECIDIR_RECOMENDACION', accion: 'APROBAR', producto: 'festival' });
assert.deepEqual(fraseRecomendacion('Genera el pedido'),
  { intencion: 'DECIDIR_RECOMENDACION', accion: 'GENERAR_PEDIDO' });
for (const t of FRASES_AYUDA.slice(2)) assert.ok(fraseRecomendacion(t), t);

assert.deepEqual(fraseRecomendacion('GELOX, ¿qué me recomiendas pedir?'),
  { intencion: 'CONSULTAR_RECOMENDACION', presupuesto: null });
assert.equal(fraseRecomendacion('Dame la recomendación de compra con ocho millones y medio').presupuesto, 8_500_000);
assert.deepEqual(fraseRecomendacion('cambia el Festival a veinte cajas'),
  { intencion: 'DECIDIR_RECOMENDACION', accion: 'MODIFICAR', producto: 'festival', cajas: 20 });
assert.deepEqual(fraseRecomendacion('deja la Paleta Drácula en 0 cajas'),
  { intencion: 'DECIDIR_RECOMENDACION', accion: 'MODIFICAR', producto: 'paleta dracula', cajas: 0 });
assert.deepEqual(fraseRecomendacion('rechaza el Brownie Polet'),
  { intencion: 'DECIDIR_RECOMENDACION', accion: 'RECHAZAR', producto: 'brownie polet' });
assert.equal(fraseRecomendacion('genera el pedido con la recomendación').accion, 'GENERAR_PEDIDO');

// No deben robarle frases a otras intenciones
for (const t of ['Genera un pedido con 20 cajas de Solo Lack', 'Registra dos cajas de Festival',
  '¿Cuántas cajas de Festival quedan?', 'Al pedido pendiente agrégale 10 de Festival', 'cuánto ganamos hoy',
  'rechazar', 'cancelar']) {
  assert.equal(fraseRecomendacion(t), null, t);
}

console.log('frasesVoz OK');
