const dotenv = require('dotenv');
const path = require('path');
const { leerConfigCorreo } = require('./mail.config');
const { parseSecurityConfig } = require('./security.config');
const { leerConfigDosFactores } = require('./twoFactor.config');
const { leerConfigRecuperacion } = require('./recuperacion.config');

// Cargar variables de entorno desde .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isTest = nodeEnv === 'test';
const testDatabaseName = 'libreria_oskar_test';

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (nodeEnv === 'production') {
    throw new Error('La variable de entorno JWT_SECRET es obligatoria en entorno de producción.');
  }
  console.warn('[WARN CONFIG]: JWT_SECRET no está definida. Utilizando clave de desarrollo predeterminada.');
  jwtSecret = 'secreto-solo-para-desarrollo-local';
}

const mail = leerConfigCorreo(process.env, nodeEnv);
const security = parseSecurityConfig(process.env);
if (mail.faltantes.length > 0) {
  console.warn(`[WARN CONFIG]: MAIL_PROVIDER=smtp sin ${mail.faltantes.join(', ')}. Los envíos de correo fallarán hasta definirlas.`);
}

// `enforced` se lee en cada login (no se copia), así las pruebas pueden cambiarlo.
const twoFactor = leerConfigDosFactores(process.env, nodeEnv);
if (twoFactor.claveDesarrollo && !isTest) {
  console.warn('[WARN CONFIG]: TWO_FACTOR_ENCRYPTION_KEY no está definida. Utilizando clave de desarrollo predeterminada.');
}

const recuperacion = leerConfigRecuperacion(process.env, nodeEnv);
if (recuperacion.faltantes.length > 0) {
  console.warn(`[WARN CONFIG]: falta ${recuperacion.faltantes.join(', ')}. La recuperación de contraseña no enviará enlaces hasta definirla.`);
}

const env = {
  NODE_ENV: nodeEnv,
  ...security,
  PORT: parseInt(process.env.PORT || '3000', 10),
  db: {
    host: isTest ? (process.env.TEST_DB_HOST || 'localhost') : (process.env.DB_HOST || 'localhost'),
    port: parseInt(isTest ? (process.env.TEST_DB_PORT || '5435') : (process.env.DB_PORT || '5432'), 10),
    user: isTest ? (process.env.TEST_DB_USER || 'postgres') : (process.env.DB_USER || 'postgres'),
    password: isTest ? (process.env.TEST_DB_PASSWORD || 'postgres') : (process.env.DB_PASSWORD || 'postgres'),
    database: isTest ? testDatabaseName : (process.env.DB_NAME || 'libreria_oskar'),
    connectionString: isTest ? undefined : (process.env.DATABASE_URL || undefined),
  },
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
  googleBooks: {
    apiKey: process.env.GOOGLE_BOOKS_API_KEY || null,
    baseUrl: 'https://www.googleapis.com/books/v1/volumes',
    timeoutMs: 5000,
  },
  mail,
  twoFactor,
  recuperacion,
  diasStockObsoleto: parseInt(process.env.DIAS_STOCK_OBSOLETO || '90', 10),
};

module.exports = env;
