const { test } = require('node:test');
const assert = require('node:assert/strict');
const { crearServicioCorreo } = require('../src/services/mail/fabrica.service');
const { crearProveedorSmtp } = require('../src/services/mail/smtp.provider');
const { crearProveedorConsola } = require('../src/services/mail/consola.provider');
const { validarMensaje } = require('../src/services/mail/validacion.mail');

const PNG = Buffer.from('89504e470d0a1a0a', 'hex');
const ADJUNTO = { nombre: 'logo.png', contenido: PNG, tipo: 'image/png', cid: 'logo.oskar' };
const MENSAJE = { para: 'cliente@ejemplo.com', asunto: 'Hola', texto: 'Cuerpo', html: '<p>HTML-SECRETO</p>' };

function crearLogger() {
  const lineas = [];
  const registrar = (...args) => lineas.push(args.join(' '));
  return { log: registrar, warn: registrar, error: registrar, lineas };
}

function proveedorEspia() {
  const proveedor = { llamadas: 0, async enviar() { proveedor.llamadas += 1; }, async verificar() {} };
  return proveedor;
}

test('adjuntos inválidos → invalido sin llamar al proveedor', async () => {
  const malos = [
    'no-es-arreglo',
    [ADJUNTO, ADJUNTO, ADJUNTO, ADJUNTO],
    [null],
    [{ ...ADJUNTO, contenido: Buffer.alloc(100 * 1024 + 1) }],
    [{ ...ADJUNTO, contenido: Buffer.alloc(0) }],
    [{ ...ADJUNTO, contenido: 'no es Buffer' }],
    [{ ...ADJUNTO, tipo: 'image/svg+xml' }],
    [{ ...ADJUNTO, tipo: 'text/html' }],
    [{ ...ADJUNTO, cid: 'logo"><script>' }],
    [{ ...ADJUNTO, cid: 'logo\r\nX-Inyectado: 1' }],
    [{ ...ADJUNTO, cid: '' }],
    [{ ...ADJUNTO, nombre: 'logo.png\r\nBcc: otro@ejemplo.com' }],
    [{ ...ADJUNTO, nombre: 'logo.png\n' }],
    [{ ...ADJUNTO, nombre: 'a'.repeat(65) }],
  ];
  for (const adjuntos of malos) {
    const proveedor = proveedorEspia();
    const servicio = crearServicioCorreo({ proveedor, logger: crearLogger() });
    const r = await servicio.enviar({ ...MENSAJE, adjuntos });
    assert.deepEqual(r, { ok: false, intentos: 0, reintentando: false, motivo: 'invalido' }, JSON.stringify(adjuntos).slice(0, 80));
    assert.equal(proveedor.llamadas, 0);
  }
});

test('adjuntos válidos: hasta 3, png o jpeg, ≤ 100 kB; se normalizan sin campos extra', () => {
  const tres = [ADJUNTO, { ...ADJUNTO, cid: 'b', tipo: 'image/jpeg' }, { ...ADJUNTO, contenido: Buffer.alloc(100 * 1024), cid: 'c' }];
  const r = validarMensaje({ ...MENSAJE, adjuntos: tres.map((a) => ({ ...a, extra: 'x' })) });
  assert.equal(r.ok, true);
  assert.equal(r.mensaje.adjuntos.length, 3);
  assert.deepEqual(Object.keys(r.mensaje.adjuntos[0]).sort(), ['cid', 'contenido', 'nombre', 'tipo']);
});

test('sin adjuntos el mensaje normalizado es el de siempre (sin clave adjuntos)', () => {
  const r = validarMensaje(MENSAJE);
  assert.deepEqual(Object.keys(r.mensaje), ['para', 'asunto', 'texto', 'html']);
  assert.equal(validarMensaje({ ...MENSAJE, adjuntos: null }).mensaje.adjuntos, undefined);
});

test('SMTP: adjuntos en línea con cid y contentDisposition inline; sin adjuntos no hay attachments', async () => {
  let correo;
  const proveedor = crearProveedorSmtp(
    { host: 'h', port: 587, user: 'u@x.co', password: 'p', from: '', faltantes: [] },
    { crearTransporte: () => ({ sendMail: async (m) => { correo = m; }, verify: async () => true }) },
  );
  const servicio = crearServicioCorreo({ proveedor, logger: crearLogger() });

  assert.equal((await servicio.enviar({ ...MENSAJE, adjuntos: [ADJUNTO] })).ok, true);
  assert.deepEqual(correo.attachments, [{
    filename: 'logo.png', content: PNG, contentType: 'image/png', cid: 'logo.oskar', contentDisposition: 'inline',
  }]);
  assert.equal(correo.html, MENSAJE.html);

  for (const adjuntos of [undefined, []]) {
    await servicio.enviar({ ...MENSAJE, adjuntos });
    assert.equal('attachments' in correo, false);
    assert.deepEqual(Object.keys(correo), ['from', 'to', 'subject', 'text', 'html']);
  }
});

test('consola: la bandeja guarda metadatos y tamaño, sin el contenido; sin adjuntos no hay clave', async () => {
  const proveedor = crearProveedorConsola({ nodeEnv: 'test', logger: crearLogger() });
  const servicio = crearServicioCorreo({ proveedor, logger: crearLogger() });
  await servicio.enviar({ ...MENSAJE, adjuntos: [ADJUNTO] });
  await servicio.enviar(MENSAJE);
  const [con, sin] = servicio.bandeja;
  assert.deepEqual(con.adjuntos, [{ nombre: 'logo.png', tipo: 'image/png', cid: 'logo.oskar', bytes: PNG.length }]);
  assert.equal(con.html, MENSAJE.html);
  assert.equal('adjuntos' in sin, false);
});

test('consola: nunca imprime el html ni los adjuntos (development y production)', async () => {
  for (const nodeEnv of ['development', 'production']) {
    const logger = crearLogger();
    const servicio = crearServicioCorreo({ proveedor: crearProveedorConsola({ nodeEnv, logger }), logger });
    await servicio.enviar({ ...MENSAJE, adjuntos: [ADJUNTO] });
    await servicio.enviar({ ...MENSAJE, texto: undefined, adjuntos: [ADJUNTO] });
    const salida = logger.lineas.join('\n');
    assert.equal(salida.includes('HTML-SECRETO'), false, nodeEnv);
    assert.equal(/logo\.png|logo\.oskar|iVBOR|89504e47/.test(salida), false, nodeEnv);
    if (nodeEnv === 'development') assert.ok(salida.includes('Cuerpo'));
  }
});
