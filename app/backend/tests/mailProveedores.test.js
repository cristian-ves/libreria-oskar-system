const { test } = require('node:test');
const assert = require('node:assert/strict');
const { crearServicioCorreo } = require('../src/services/mail/fabrica.service');
const { crearProveedorSmtp } = require('../src/services/mail/smtp.provider');
const { crearProveedorConsola } = require('../src/services/mail/consola.provider');

const MENSAJE = { para: 'cliente@ejemplo.com', asunto: 'Hola', texto: 'Cuerpo' };

function crearLogger() {
  const lineas = [];
  const registrar = (...args) => lineas.push(args.join(' '));
  return { log: registrar, warn: registrar, error: registrar, lineas };
}

test('SMTP: opciones por puerto 587 y 465, autenticación, tiempos y respaldo de MAIL_FROM', async () => {
  const base = { host: 'smtp.gmail.com', user: 'tienda@gmail.com', password: 'clave', from: '', faltantes: [] };
  const casos = [[587, false, true], [465, true, false]];
  for (const [port, secure, requireTLS] of casos) {
    let opciones;
    let correo;
    const proveedor = crearProveedorSmtp({ ...base, port }, {
      crearTransporte: (o) => {
        opciones = o;
        return { sendMail: async (m) => { correo = m; }, verify: async () => true };
      },
    });
    assert.equal(opciones.host, 'smtp.gmail.com');
    assert.equal(opciones.port, port);
    assert.equal(opciones.secure, secure);
    assert.equal(opciones.requireTLS, requireTLS);
    assert.deepEqual(opciones.auth, { user: 'tienda@gmail.com', pass: 'clave' });
    assert.deepEqual(
      [opciones.connectionTimeout, opciones.greetingTimeout, opciones.socketTimeout],
      [10000, 10000, 20000],
    );
    await proveedor.enviar({ para: ['a@b.co'], asunto: 'S', texto: 'T' });
    assert.equal(correo.from, 'tienda@gmail.com');
    assert.deepEqual(correo.to, ['a@b.co']);
    assert.equal(await proveedor.verificar(), true);
  }
});

test('SMTP con configuración incompleta falla sin red y sin reintentos', async () => {
  let creado = false;
  const proveedor = crearProveedorSmtp(
    { host: 'h', port: 587, user: '', password: '', from: '', faltantes: ['MAIL_USER', 'MAIL_PASSWORD'] },
    { crearTransporte: () => { creado = true; return { sendMail: async () => { throw new Error('red'); } }; } },
  );
  assert.ok(creado);
  const servicio = crearServicioCorreo({ proveedor, retrasosMs: [1], logger: crearLogger() });
  const r = await servicio.enviar(MENSAJE);
  assert.deepEqual([r.ok, r.intentos, r.reintentando], [false, 1, false]);
  assert.match(r.motivo, /MAIL_USER, MAIL_PASSWORD/);
  assert.equal((await servicio.verificar()).ok, false);
});

test('consola: bandeja con tope 100, destinatario enmascarado y cuerpo solo en development', async () => {
  const { lineas, ...logger } = crearLogger();
  const dev = crearServicioCorreo({
    proveedor: crearProveedorConsola({ nodeEnv: 'development', logger, from: 'x@y.co' }),
    logger,
  });
  await dev.enviar(MENSAJE);
  const salida = lineas.join('\n');
  assert.match(salida, /c\*\*\*@ejemplo\.com/);
  assert.ok(!salida.includes('cliente@ejemplo.com'));
  assert.ok(salida.includes('Cuerpo'));

  for (const nodeEnv of ['production', 'test']) {
    const l = crearLogger();
    const s = crearServicioCorreo({ proveedor: crearProveedorConsola({ nodeEnv, logger: l }), logger: l });
    await s.enviar(MENSAJE);
    assert.ok(!l.lineas.join('\n').includes('Cuerpo:'), nodeEnv);
    if (nodeEnv === 'test') assert.equal(l.lineas.length, 0);
  }

  const l = crearLogger();
  const s = crearServicioCorreo({ proveedor: crearProveedorConsola({ nodeEnv: 'test', logger: l }), logger: l });
  for (let i = 0; i < 105; i += 1) await s.enviar({ ...MENSAJE, asunto: `Mensaje ${i}` });
  assert.equal(s.bandeja.length, 100);
  assert.equal(s.bandeja[0].asunto, 'Mensaje 5');
  s.vaciarBandeja();
  assert.equal(s.bandeja.length, 0);
});
