const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { esperarBaseDatos, leerEsperaMaxima } = require('../src/database/esperarBaseDatos');

const RAIZ_BACKEND = path.resolve(__dirname, '..');

// Reloj falso: `esperar` avanza el reloj sin esperar de verdad.
function entornoFalso({ fallos = Infinity, error = new Error('connect ECONNREFUSED'), resultado = { db_name: 'x' } } = {}) {
  const e = { reloj: 0, intentos: 0, pausas: [], lineas: [], objetos: [] };
  e.conectar = async () => {
    e.intentos += 1;
    if (e.intentos <= fallos) throw typeof error === 'function' ? error(e.intentos) : error;
    return resultado;
  };
  e.esperar = async (ms) => { e.pausas.push(ms); e.reloj += ms; };
  e.ahora = () => e.reloj;
  e.log = { warn: (...args) => { e.objetos.push(...args); e.lineas.push(args.join(' ')); } };
  return e;
}

const opciones = (e, extra = {}) => ({
  conectar: e.conectar, esperar: e.esperar, ahora: e.ahora, log: e.log, ...extra,
});

function errorCon(props, mensaje = 'fallo de conexión') {
  return Object.assign(new Error(mensaje), props);
}

test('éxito al primer intento: devuelve el resultado sin esperas ni logs', async () => {
  const e = entornoFalso({ fallos: 0, resultado: { db_name: 'oskar', current_time: 'ahora' } });
  const r = await esperarBaseDatos(opciones(e, { maxEsperaMs: 60000 }));
  assert.deepEqual(r, { db_name: 'oskar', current_time: 'ahora' });
  assert.deepEqual(e.pausas, []);
  assert.deepEqual(e.lineas, []);
});

test('falla dos veces y luego conecta: pausas 1000 y 2000 y dos líneas de reintento', async () => {
  const e = entornoFalso({ fallos: 2 });
  const r = await esperarBaseDatos(opciones(e, { maxEsperaMs: 60000 }));
  assert.deepEqual(r, { db_name: 'x' });
  assert.deepEqual(e.pausas, [1000, 2000]);
  assert.equal(e.lineas.length, 2);
  assert.match(e.lineas[0], /^\[DATABASE RETRY\]: intento 1 falló \(connect ECONNREFUSED\); reintentando en 1 s$/);
  assert.match(e.lineas[1], /intento 2 falló .*reintentando en 2 s$/);
});

test('nunca conecta: relanza el último error y los intentos cuadran con el reloj falso', async () => {
  const e = entornoFalso({ error: (n) => new Error(`ECONNREFUSED #${n}`) });
  await assert.rejects(
    esperarBaseDatos(opciones(e, { maxEsperaMs: 20000 })),
    (err) => err.message === `ECONNREFUSED #${e.intentos}`
  );
  // Pausas 1000+2000+4000+8000 = 15000, luego 5000 recortada = 20000 exactos.
  assert.deepEqual(e.pausas, [1000, 2000, 4000, 8000, 5000]);
  assert.equal(e.intentos, 6);
  assert.match(e.lineas.at(-1), /^\[DATABASE RETRY\]: se agotó la espera \(6 intentos en 20 s\)$/);
});

test('maxEsperaMs = 0: un solo intento, error original, sin esperas ni logs', async () => {
  const original = new Error('connect ECONNREFUSED');
  const e = entornoFalso({ error: original });
  await assert.rejects(esperarBaseDatos(opciones(e, { maxEsperaMs: 0 })), (err) => err === original);
  assert.equal(e.intentos, 1);
  assert.deepEqual(e.pausas, []);
  assert.deepEqual(e.lineas, []);
});

test('errores fatales se relanzan de inmediato', async () => {
  const fatales = [
    errorCon({ name: 'SequelizeAccessDeniedError' }),
    errorCon({ original: { code: '28P01' } }),
    errorCon({ parent: { code: '28000' } }),
    errorCon({ original: { code: '3D000' } }),
    errorCon({ code: '28P01' }),
  ];
  for (const fatal of fatales) {
    const e = entornoFalso({ error: fatal });
    await assert.rejects(esperarBaseDatos(opciones(e, { maxEsperaMs: 60000 })), (err) => err === fatal);
    assert.equal(e.intentos, 1);
    assert.deepEqual(e.pausas, []);
    assert.deepEqual(e.lineas, []);
  }
});

test('códigos reintentables y errores desconocidos se reintentan', async () => {
  const reintentables = [
    errorCon({ original: { code: 'ECONNREFUSED' } }),
    errorCon({ parent: { code: 'ETIMEDOUT' } }),
    errorCon({ original: { code: 'ENOTFOUND' } }),
    errorCon({ original: { code: '57P03' } }),
    errorCon({ name: 'SequelizeConnectionAcquireTimeoutError' }),
    new Error('algo que nadie esperaba'),
  ];
  for (const err of reintentables) {
    const e = entornoFalso({ fallos: 1, error: err });
    const r = await esperarBaseDatos(opciones(e, { maxEsperaMs: 60000 }));
    assert.deepEqual(r, { db_name: 'x' });
    assert.equal(e.intentos, 2);
    assert.deepEqual(e.pausas, [1000]);
  }
});

test('las pausas respetan pausaMaxMs y se recortan al tiempo restante', async () => {
  const e = entornoFalso({ fallos: 7 });
  await esperarBaseDatos(opciones(e, { maxEsperaMs: 1000000 }));
  assert.deepEqual(e.pausas, [1000, 2000, 4000, 8000, 10000, 10000, 10000]);

  const f = entornoFalso({});
  await assert.rejects(esperarBaseDatos(opciones(f, { maxEsperaMs: 2500, pausaInicialMs: 1000, pausaMaxMs: 1500 })));
  assert.deepEqual(f.pausas, [1000, 1500]);
  assert.equal(f.reloj, 2500);
});

test('leerEsperaMaxima: valores por defecto, válido e inválidos sin mostrar el valor', () => {
  assert.equal(leerEsperaMaxima({ NODE_ENV: 'production' }), 120000);
  assert.equal(leerEsperaMaxima({ NODE_ENV: 'development' }), 0);
  assert.equal(leerEsperaMaxima({}), 0);
  assert.equal(leerEsperaMaxima({ NODE_ENV: 'production', DB_CONNECT_MAX_WAIT_MS: '45000' }), 45000);
  assert.equal(leerEsperaMaxima({ NODE_ENV: 'production', DB_CONNECT_MAX_WAIT_MS: '0' }), 0);
  assert.equal(leerEsperaMaxima({ DB_CONNECT_MAX_WAIT_MS: '600000' }), 600000);

  for (const malo of ['abc-secreto', '-5', '1.5', '600001']) {
    assert.throws(
      () => leerEsperaMaxima({ DB_CONNECT_MAX_WAIT_MS: malo }),
      (err) => err.message.includes('DB_CONNECT_MAX_WAIT_MS') && !err.message.includes(malo)
    );
  }
});

test('el log recorta mensajes largos y no imprime el objeto de error', async () => {
  const largo = 'x'.repeat(500);
  const error = errorCon({ stack: 'STACK-SECRETO', original: { password: 'p4ss' } }, largo);
  const e = entornoFalso({ fallos: 1, error });
  await esperarBaseDatos(opciones(e, { maxEsperaMs: 60000 }));
  assert.equal(e.objetos.length, 1);
  assert.equal(typeof e.objetos[0], 'string');
  assert.ok(e.lineas[0].length < 300);
  assert.ok(e.lineas[0].includes(`${'x'.repeat(200)}...`));
  assert.ok(!e.lineas[0].includes('x'.repeat(201)));
  assert.ok(!e.lineas[0].includes('STACK-SECRETO'));
  assert.ok(!e.lineas[0].includes('p4ss'));
});

// Ejecutores como proceso hijo: el puerto 1 está cerrado, nunca toca una BD real.
const ENTORNO_HIJO = {
  ...process.env,
  NODE_ENV: 'development',
  DB_HOST: '127.0.0.1',
  DB_PORT: '1',
  DATABASE_URL: '',
  DB_CONNECT_MAX_WAIT_MS: '2500',
  JWT_SECRET: 'inventado-solo-para-esta-prueba',
};

for (const script of ['src/database/migrate.js', 'src/database/seed.js', 'src/server.js']) {
  test(`${script} reintenta y sale con código 1 si la BD no responde`, () => {
    const r = spawnSync(process.execPath, [script], {
      cwd: RAIZ_BACKEND,
      env: ENTORNO_HIJO,
      encoding: 'utf8',
      timeout: 40000,
      killSignal: 'SIGKILL',
    });
    const salida = `${r.stdout}${r.stderr}`;
    assert.equal(r.error, undefined, `el proceso no debe colgarse: ${r.error && r.error.message}`);
    assert.equal(r.status, 1);
    assert.ok(salida.includes('[DATABASE RETRY]'));
    assert.ok(salida.includes('[DATABASE CONNECTION FAILED]'));
    assert.ok(!salida.includes('inventado-solo-para-esta-prueba'));
  });
}
