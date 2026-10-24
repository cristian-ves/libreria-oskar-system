process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const limiter = require('../src/middlewares/rateLimit');
const { createRateLimit } = limiter;
const { parseSecurityConfig } = require('../src/config/security.config');
const { crearPoliticaCors } = require('../src/config/cors.config');

const withServer = async (fn) => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try { await fn(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
};

test('CORS permite el origen de desarrollo, expone Content-Disposition y responde preflight PATCH', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/libros`, { headers: { Origin: 'http://localhost:5173' } });
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.equal(response.headers.get('access-control-expose-headers'), 'Content-Disposition');
    const preflight = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'PATCH' },
    });
    assert.equal(preflight.status, 204);
    assert.match(preflight.headers.get('access-control-allow-methods'), /PATCH/);
  });
});

test('CORS configurado rechaza origen no autorizado; producción requiere CORS_ORIGINS', () => {
  assert.throws(() => parseSecurityConfig({ NODE_ENV: 'production' }), /CORS_ORIGINS es obligatoria/);
  assert.deepEqual(parseSecurityConfig({ NODE_ENV: 'production', CORS_ORIGINS: 'https://catalogo.example, https://admin.example' }).corsOrigins,
    ['https://catalogo.example', 'https://admin.example']);
  assert.throws(() => parseSecurityConfig({ NODE_ENV: 'production', CORS_ORIGINS: 'https://ok.example, basura' }), /origen inválido/);
  const policy = crearPoliticaCors({ origins: ['https://catalogo.example'], permissive: false });
  policy('https://catalogo.example', (error, allowed) => { assert.equal(error, null); assert.equal(allowed, true); });
  policy('https://attacker.example', (error) => { assert.equal(error.code, 'CORS_ORIGIN_DENIED'); });
  policy(undefined, (error, allowed) => { assert.equal(error, null); assert.equal(allowed, false); });
});

test('TRUST_PROXY acepta solo saltos enteros no negativos y no confía por defecto', () => {
  assert.equal(parseSecurityConfig({}).trustProxy, 0);
  assert.equal(app.get('trust proxy'), 0);
  assert.equal(parseSecurityConfig({ TRUST_PROXY: '2' }).trustProxy, 2);
  for (const value of ['true', '*', '-1', '1.5', '1,2']) {
    assert.throws(() => parseSecurityConfig({ TRUST_PROXY: value }), /TRUST_PROXY debe ser/);
  }
});

test('rate limit permite 10, bloquea el intento 11 y renueva ventana con reloj simulado', () => {
  let time = 1000;
  const localLimiter = createRateLimit({ max: 10, windowMs: 15 * 60 * 1000, now: () => time, scheduleCleanup: false });
  let passed = 0;
  let status;
  const req = { ip: '192.0.2.10', socket: { remoteAddress: '192.0.2.10' } };
  const res = { status(code) { status = code; return this; }, json() { return this; } };
  const invoke = () => localLimiter(req, res, () => { passed += 1; });

  for (let count = 0; count < 10; count += 1) invoke();
  invoke();
  assert.equal(passed, 10);
  assert.equal(status, 429);

  time += 15 * 60 * 1000;
  invoke();
  assert.equal(passed, 11);
  assert.equal(localLimiter.store.get(req.ip).count, 1);
  localLimiter.close();
});

test('los contadores vencidos se eliminan del almacenamiento sin esperar tiempo real', () => {
  let time = 0;
  const localLimiter = createRateLimit({ max: 10, windowMs: 1000, now: () => time, scheduleCleanup: false });
  const req = { ip: '192.0.2.11', socket: { remoteAddress: '192.0.2.11' } };
  localLimiter(req, {}, () => {});
  assert.equal(localLimiter.store.size, 1);
  time = 1000;
  localLimiter.cleanup();
  assert.equal(localLimiter.store.size, 0);
  localLimiter.close();
});

test('login limita por IP sin usar X-Forwarded-For y responde 429 con formato fail', async () => {
  limiter.reset();
  try {
    await withServer(async (baseUrl) => {
      let forwardedOctet = 1;
      const send = () => fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `198.51.100.${forwardedOctet++}` },
        body: JSON.stringify({}),
      });
      for (let index = 0; index < 10; index += 1) assert.notEqual((await send()).status, 429);
      const blocked = await send();
      assert.equal(blocked.status, 429);
      const body = await blocked.json();
      assert.equal(body.status, 'fail');
      assert.equal(body.message, 'Demasiados intentos. Inténtalo de nuevo más tarde.');
      assert.equal(JSON.stringify(body).includes('stack'), false);
      assert.equal(limiter.store.size, 1, 'X-Forwarded-For distinto no crea contadores por IP cuando TRUST_PROXY=0');
    });
  } finally { limiter.reset(); }
});

test('JSON mal formado devuelve 400 sin detalles internos', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{malformado',
    });
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.deepEqual(body, { status: 'fail', message: 'El JSON enviado no es válido.' });
  });
});

test('payload sobre 1 MB devuelve 413 sin filtrar detalles internos', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload: 'x'.repeat(1024 * 1024) }),
    });
    const body = await response.json();
    assert.equal(response.status, 413);
    assert.deepEqual(body, { status: 'fail', message: 'El cuerpo de la solicitud supera el tamaño permitido.' });
  });
});

test('regresión de endpoints públicos y protegidos', async () => {
  await withServer(async (baseUrl) => {
    const [publicResponse, protectedResponse] = await Promise.all([
      fetch(`${baseUrl}/api/libros`), fetch(`${baseUrl}/api/auth/me`),
    ]);
    assert.equal(publicResponse.status, 200);
    assert.equal(protectedResponse.status, 401);
  });
});
