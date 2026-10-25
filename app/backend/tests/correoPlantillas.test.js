const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { plantillaCorreo, escaparHtml, urlSegura } = require('../src/services/mail/plantillas');
const { crearCargadorLogo, adjuntoLogo, cargarLogo, LOGO_CID } = require('../src/services/mail/logo');
const { mensajeEnlace, mensajeAviso, enlaceRestablecer } = require('../src/services/recuperacion/correos');
const { crearServicioCorreo } = require('../src/services/mail/fabrica.service');
const { crearProveedorConsola } = require('../src/services/mail/consola.provider');

const URL = enlaceRestablecer('http://localhost:5173', 'A'.repeat(43));
const USUARIO = { email: 'ana@example.test', nombre_completo: 'Ana Pérez' };
const BASE = { titulo: 'Título', saludo: 'Hola', parrafos: ['Uno'], boton: { texto: 'Ir', url: URL }, notas: ['Nota'] };
const sinAviso = { warn() {} };

// Texto y asunto tal como estaban en HEAD (a0d24bb) antes del diseño HTML.
const TEXTO_ENLACE_HEAD = [
  'Hola, Ana Pérez:', '',
  'Recibimos una solicitud para restablecer la contraseña de tu cuenta en Librería Oskar.',
  'Abre este enlace para elegir una contraseña nueva:', '', URL, '',
  'El enlace vence en 30 minutos y solo puede usarse una vez.',
  'Si no lo pediste, ignora este mensaje: tu contraseña no cambiará.',
  'Si tienes dudas, escribe al administrador del sistema.',
].join('\n');
const TEXTO_AVISO_HEAD = [
  'Hola, Ana Pérez:', '',
  'Se cambió la contraseña de tu cuenta en Librería Oskar y se cerraron las sesiones anteriores.',
  'Si no fuiste tú, contacta al administrador del sistema de inmediato.',
].join('\n');

const hrefs = (html) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);

test('plantilla: documento con tablas role=presentation, viewport y color-scheme', () => {
  const html = plantillaCorreo(BASE);
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<table role="presentation"/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.match(html, /<meta name="color-scheme" content="light">/);
  assert.match(html, /<meta name="supported-color-schemes" content="light">/);
  assert.match(html, /max-width:600px/);
  assert.match(html, /'Fira Sans', Arial, Helvetica, sans-serif/);
});

test('plantilla: usa la paleta de la página', () => {
  const html = plantillaCorreo(BASE);
  for (const color of ['#f3f3f3', '#252525', '#e19922', '#e8c85e', '#b07c19', '#e5e7eb', '#ffffff']) {
    assert.ok(html.includes(color), color);
  }
  assert.match(html, /bgcolor="#e19922"/);
});

test('plantilla: el botón y el enlace en texto llevan el mismo URL', () => {
  const html = plantillaCorreo(BASE);
  assert.deepEqual(hrefs(html), [URL, URL]);
  assert.ok(html.includes(`>${URL}</a>`));
  assert.match(html, /word-break:break-all/);
});

test('plantilla: escapa <script>, comillas y & en los datos dinámicos', () => {
  const nombre = `<script>alert("x")</script> & 'y'`;
  const html = plantillaCorreo({ ...BASE, saludo: nombre, titulo: nombre, parrafos: [nombre], preencabezado: nombre });
  assert.equal(html.includes('<script'), false);
  assert.ok(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;'));
  assert.equal(escaparHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
});

test('plantilla: javascript:, sin protocolo o con espacios → sin botón ni href, sin lanzar', () => {
  for (const url of ['javascript:alert(1)', 'JAVASCRIPT:x', 'localhost:5173/x', '//evil.test', 'http://a b', 42, {}]) {
    const html = plantillaCorreo({ ...BASE, boton: { texto: 'Ir', url } });
    assert.deepEqual(hrefs(html), [], String(url));
    assert.equal(html.includes('bgcolor="#e19922"'), false);
  }
  assert.ok(plantillaCorreo({ ...BASE, boton: { url: 'javascript:alert(1)' } }).includes('javascript:alert(1)</p>'));
  assert.equal(urlSegura('https://x.co/a#token=b'), 'https://x.co/a#token=b');
});

test('plantilla y escape: datos nulos, undefined, números o largos no lanzan', () => {
  const raro = { [Symbol.toPrimitive]() { throw new Error('x'); } };
  for (const datos of [undefined, null, 42, 'texto', {}, { parrafos: null, notas: 7, boton: 'x' },
    { titulo: raro, saludo: raro, parrafos: [raro, null, 3], boton: { texto: raro, url: raro }, logoCid: raro },
    { saludo: 'x'.repeat(50000), logoCid: 12 }]) {
    assert.doesNotThrow(() => plantillaCorreo(datos));
  }
  assert.equal(escaparHtml(raro), '');
  assert.equal(escaparHtml(null), '');
  assert.equal(escaparHtml(5), '5');
});

test('plantilla: sin <script, <link ni @import; la única <img es cid: y solo con logoCid', () => {
  const sin = plantillaCorreo(BASE);
  const con = plantillaCorreo({ ...BASE, logoCid: LOGO_CID });
  for (const html of [sin, con]) {
    assert.equal(/<script|<link|@import|<style/i.test(html), false);
  }
  assert.equal(/<img/i.test(sin), false);
  const imgs = con.match(/<img[^>]*>/g);
  assert.deepEqual(imgs, [`<img src="cid:${LOGO_CID}" width="48" height="48" alt="Librería Oskar" style="display:block;border:0;border-radius:50%;">`]);
  assert.equal(/<img/.test(plantillaCorreo({ ...BASE, logoCid: 'x" onerror="alert(1)' })), false);
});

test('correos: texto y asunto idénticos a HEAD; html con botón; tamaño < 15 kB', () => {
  const enlace = mensajeEnlace({ usuario: USUARIO, enlace: URL, vencimientoMinutos: 30 });
  const aviso = mensajeAviso({ usuario: USUARIO });
  assert.equal(enlace.asunto, 'Restablece tu contraseña - Librería Oskar');
  assert.equal(enlace.texto, TEXTO_ENLACE_HEAD);
  assert.equal(aviso.asunto, 'Se cambió tu contraseña - Librería Oskar');
  assert.equal(aviso.texto, TEXTO_AVISO_HEAD);

  assert.ok(enlace.html.includes('>Restablecer contraseña</a>'));
  assert.deepEqual(hrefs(enlace.html), [URL, URL]);
  assert.match(enlace.html, /30 minutos y solo puede usarse una vez/);
  assert.deepEqual(hrefs(aviso.html), [], 'el aviso no lleva botón');
  for (const m of [enlace, aviso]) {
    assert.ok(Buffer.byteLength(m.html) < 15 * 1024, `${Buffer.byteLength(m.html)} bytes`);
    assert.deepEqual(m.adjuntos.map((a) => [a.tipo, a.cid]), [['image/png', LOGO_CID]]);
    assert.ok(m.html.includes(`src="cid:${LOGO_CID}"`));
  }
});

test('logo: PNG real, se lee una sola vez (caché)', () => {
  const logo = cargarLogo();
  assert.ok(Buffer.isBuffer(logo));
  assert.equal(logo.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.ok(logo.length <= 20 * 1024);
  assert.equal(cargarLogo(), logo);
  assert.equal(adjuntoLogo().contenido, logo);
});

test('logo ausente: null, un solo aviso [MAIL] sin rutas; el correo sale con encabezado de texto', async () => {
  const avisos = [];
  const ruta = path.join(__dirname, 'no-existe', 'logo-correo.png');
  const cargar = crearCargadorLogo(ruta, { warn: (m) => avisos.push(m) });
  assert.equal(cargar(), null);
  assert.equal(cargar(), null);
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /^\[MAIL\]/);
  assert.equal(avisos[0].includes('/'), false, 'sin rutas del sistema');

  const mensaje = mensajeEnlace({ usuario: USUARIO, enlace: URL, vencimientoMinutos: 30, cargarLogo: cargar });
  assert.deepEqual(mensaje.adjuntos, []);
  assert.equal(/<img|cid:/.test(mensaje.html), false);
  assert.ok(mensaje.html.includes('Librería <span'));
  assert.equal(mensajeAviso({ usuario: USUARIO, cargarLogo: cargar }).adjuntos.length, 0);

  const servicio = crearServicioCorreo({ proveedor: crearProveedorConsola({ nodeEnv: 'test' }), logger: sinAviso });
  assert.equal((await servicio.enviar(mensaje)).ok, true);
  assert.deepEqual(servicio.bandeja[0].adjuntos, []);

  const roto = () => { throw new Error('disco'); };
  assert.equal(adjuntoLogo(roto), null);
  assert.equal(crearCargadorLogo(ruta, { warn() { throw new Error('logger'); } })(), null);
});
