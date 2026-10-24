const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const { NotFoundError } = require('./utils/errors');
const env = require('./config/env');
const { crearPoliticaCors } = require('./config/cors.config');

const app = express();

// Seguridad HTTP con Helmet
app.use(helmet());
app.set('trust proxy', env.trustProxy);

// Habilitar CORS para integración con Frontend React
app.use(cors({
  origin: crearPoliticaCors({ origins: env.corsOrigins, permissive: env.corsPermissive }),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// Parsing de JSON y URL-encoded
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging de peticiones HTTP
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Montar enrutador principal bajo el prefijo /api
app.use('/api', routes);

// Manejo de rutas inexistentes 404
app.use((req, res, next) => {
  next(new NotFoundError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
});

// Middleware centralizado de manejo de errores
app.use(errorHandler);

module.exports = app;
