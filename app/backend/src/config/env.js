const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno desde .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'libreria_oskar',
    connectionString: process.env.DATABASE_URL || undefined,
  },
  googleBooks: {
    apiKey: process.env.GOOGLE_BOOKS_API_KEY || null,
    baseUrl: 'https://www.googleapis.com/books/v1/volumes',
    timeoutMs: 5000,
  }
};

module.exports = env;
