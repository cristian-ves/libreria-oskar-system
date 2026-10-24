const parsePositiveInteger = (value, name, fallback, allowZero = false) => {
  if (value === undefined || value === '') return fallback;
  if (!/^(0|[1-9]\d*)$/.test(String(value))) {
    throw new Error(`${name} debe ser un número entero${allowZero ? ' no negativo' : ' positivo'}.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || (allowZero ? parsed < 0 : parsed < 1)) {
    throw new Error(`${name} debe ser un número entero${allowZero ? ' no negativo' : ' positivo'}.`);
  }
  return parsed;
};

const parseSecurityConfig = (source = process.env) => {
  const isProduction = (source.NODE_ENV || 'development') === 'production';
  const rawOrigins = source.CORS_ORIGINS;
  if (isProduction && !rawOrigins?.split(',').map((origin) => origin.trim()).filter(Boolean).length) {
    throw new Error('CORS_ORIGINS es obligatoria en entorno de producción.');
  }
  const origins = rawOrigins
    ? rawOrigins.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];
  for (const origin of origins) {
    let parsed;
    try { parsed = new URL(origin); } catch { throw new Error('CORS_ORIGINS contiene un origen inválido.'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new Error('CORS_ORIGINS contiene un origen inválido.');
    }
  }

  return {
    corsOrigins: origins,
    corsPermissive: !rawOrigins && !isProduction,
    trustProxy: parsePositiveInteger(source.TRUST_PROXY, 'TRUST_PROXY', 0, true),
    loginRateLimit: parsePositiveInteger(source.LOGIN_RATE_LIMIT, 'LOGIN_RATE_LIMIT', 10),
    loginRateWindowMs: parsePositiveInteger(source.LOGIN_RATE_WINDOW_MS, 'LOGIN_RATE_WINDOW_MS', 15 * 60 * 1000),
  };
};

module.exports = { parseSecurityConfig };
