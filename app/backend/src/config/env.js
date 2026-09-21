const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno desde .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (nodeEnv === 'production') {
    throw new Error('La variable de entorno JWT_SECRET es obligatoria en entorno de producción.');
  }
  console.warn('[WARN CONFIG]: JWT_SECRET no está definida. Utilizando clave de desarrollo predeterminada.');
  jwtSecret = 'secreto-solo-para-desarrollo-local';
}

const env = {
  NODE_ENV: nodeEnv,
  PORT: parseInt(process.env.PORT || '3000', 10),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'libreria_oskar',
    connectionString: process.env.DATABASE_URL || undefined,
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
  diasStockObsoleto: parseInt(process.env.DIAS_STOCK_OBSOLETO || '90', 10),
};

module.exports = env;
