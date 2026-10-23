const { test } = require('node:test');
const assert = require('node:assert/strict');
const { crearServicioCorreo } = require('../src/services/mail/fabrica.service');

const MENSAJE = { para: 'cliente@ejemplo.com', asunto: 'Hola', texto: 'Cuerpo' };

function crearLogger() {
  const lineas = [];
  const registrar = (...args) => lineas.push(args.join(' '));
  return { log: registrar, warn: registrar, error: registrar, lineas };
}

// Proveedor falso: falla las primeras `fallos` veces con el error indicado.
function proveedorFalso({ fallos = 0, error = new Error('caída temporal') } = {}) {
  const proveedor = {
    llamadas: 0,
    async enviar() {
      proveedor.llamadas += 1;
      if (proveedor.llamadas <= fallos) throw error;
    },
    async verificar() {},
  };
  return proveedor;
}

function servicioCon(proveedor, extra = {}) {
  const logger = crearLogger();
  const servicio = crearServicioCorreo({ proveedor, retrasosMs: [1, 1, 1], logger, ...extra });
  return { servicio, logger };
}

test('enviar nunca lanza ni rechaza ante proveedor síncrono, rechazado, entrada inválida o logger roto', async () => {
  const sincrono = { enviar() { throw new Error('boom'); }, verificar() {} };
  const rechaza = { enviar: () => Promise.reject(new Error('no')), verificar() {} };
  const loggerRoto = { log() { throw new Error('x'); }, warn() { throw new Error('x'); }, error() { throw new Error('x'); } };

  for (const proveedor of [sincrono, rechaza]) {
    const { servicio } = servicioCon(proveedor);
    const r = await servicio.enviar(MENSAJE);
    assert.equal(r.ok, false);
    await servicio.esperarPendientes();
  }
  const roto = crearServicioCorreo({ proveedor: rechaza, retrasosMs: [1], logger: loggerRoto });
  assert.equal((await roto.enviar(MENSAJE)).ok, false);
  await roto.esperarPendientes();
  assert.equal((await roto.enviar(null)).motivo, 'invalido');
  assert.equal((await roto.enviar(undefined)).ok, false);
});

test('falla 2 veces y luego entrega con 3 intentos', async () => {
  const proveedor = proveedorFalso({ fallos: 2 });
  const { servicio, logger } = servicioCon(proveedor);
  const r = await servicio.enviar(MENSAJE);
  assert.deepEqual([r.ok, r.intentos, r.reintentando], [false, 1, true]);
  await servicio.esperarPendientes();
  assert.equal(proveedor.llamadas, 3);
  assert.ok(logger.lineas.some((l) => l.includes('Entregado') && l.includes('intento 3')));
});

test('falla siempre: 4 intentos y descarte registrado', async () => {
  const proveedor = proveedorFalso({ fallos: 99 });
  const { servicio, logger } = servicioCon(proveedor);
  await servicio.enviar(MENSAJE);
  await servicio.esperarPendientes();
  assert.equal(proveedor.llamadas, 4);
  assert.ok(logger.lineas.some((l) => l.startsWith('[MAIL]') && l.includes('Descartado')));
});

test('error permanente (EAUTH o 5xx) no se reintenta', async () => {
  for (const error of [Object.assign(new Error('auth'), { code: 'EAUTH' }), Object.assign(new Error('rechazo'), { responseCode: 550 })]) {
    const proveedor = proveedorFalso({ fallos: 99, error });
    const { servicio } = servicioCon(proveedor);
    const r = await servicio.enviar(MENSAJE);
    assert.deepEqual([r.ok, r.intentos, r.reintentando], [false, 1, false]);
    await servicio.esperarPendientes();
    assert.equal(proveedor.llamadas, 1);
  }
});

test('un error 4xx sí se reintenta', async () => {
  const proveedor = proveedorFalso({ fallos: 1, error: Object.assign(new Error('temporal'), { responseCode: 451 }) });
  const { servicio } = servicioCon(proveedor);
  await servicio.enviar(MENSAJE);
  await servicio.esperarPendientes();
  assert.equal(proveedor.llamadas, 2);
});

test('el tope de reintentos pendientes descarta con log', async () => {
  const proveedor = proveedorFalso({ fallos: 99 });
  const { servicio, logger } = servicioCon(proveedor, { maxPendientes: 1 });
  const [a, b] = await Promise.all([servicio.enviar(MENSAJE), servicio.enviar(MENSAJE)]);
  assert.deepEqual([a.reintentando, b.reintentando].sort(), [false, true]);
  assert.ok(logger.lineas.some((l) => l.includes('reintentos pendientes')));
  await servicio.esperarPendientes();
});

test('entrada inválida devuelve invalido sin llamar al proveedor', async () => {
  const proveedor = proveedorFalso();
  const { servicio } = servicioCon(proveedor);
  const invalidos = [
    { ...MENSAJE, para: 'a@b.co\nBcc: x@y.co' },
    { ...MENSAJE, para: ['ok@b.co', 'x@y.co\r'] },
    { ...MENSAJE, asunto: 'Hola\r\nBcc: x@y.co' },
    { ...MENSAJE, asunto: '   ' },
    { ...MENSAJE, asunto: 'a'.repeat(201) },
    { ...MENSAJE, para: 'sin-arroba' },
    { ...MENSAJE, para: [] },
    { ...MENSAJE, para: Array.from({ length: 21 }, (_, i) => `u${i}@ejemplo.com`) },
    { para: MENSAJE.para, asunto: 'Hola' },
    { ...MENSAJE, texto: '  ', html: '' },
    { ...MENSAJE, texto: 'x'.repeat(100 * 1024 + 1) },
  ];
  for (const entrada of invalidos) {
    const r = await servicio.enviar(entrada);
    assert.deepEqual([r.ok, r.motivo, r.intentos, r.reintentando], [false, 'invalido', 0, false]);
  }
  assert.equal(proveedor.llamadas, 0);
  const valido = await servicio.enviar({ ...MENSAJE, para: Array.from({ length: 20 }, (_, i) => `u${i}@ejemplo.com`) });
  assert.equal(valido.ok, true);
});

test('los logs y el motivo nunca contienen la contraseña configurada', async () => {
  const secreto = 'S3cr3t0-Gmail-App';
  const proveedor = proveedorFalso({ fallos: 99, error: new Error(`535 login fallido con ${secreto}`) });
  const { servicio, logger } = servicioCon(proveedor, { secretos: [secreto] });
  const r = await servicio.enviar(MENSAJE);
  await servicio.esperarPendientes();
  assert.ok(logger.lineas.length > 0);
  assert.ok(!logger.lineas.join('\n').includes(secreto));
  assert.ok(!r.motivo.includes(secreto));
  assert.match(r.motivo, /\*\*\*/);
  assert.ok(!(await crearServicioCorreo({
    proveedor: { enviar() {}, verificar: async () => { throw new Error(secreto); } },
    secretos: [secreto],
    logger,
  }).verificar()).motivo.includes(secreto));
});
