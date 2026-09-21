const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const { NotFoundError } = require('./utils/errors');
const env = require('./config/env');

const app = express();

// Seguridad HTTP con Helmet
app.use(helmet());

// Habilitar CORS para integración con Frontend React
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parsing de JSON y URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
