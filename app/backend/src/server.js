const app = require('./app');
const env = require('./config/env');
const db = require('./config/db');

const startServer = async () => {
  try {
    // Verificar conectividad con PostgreSQL
    const connInfo = await db.testConnection();
    console.log(`[DATABASE CONNECTED]: PostgreSQL en ${env.db.host}:${env.db.port} | BD: ${connInfo.db_name} | Hora servidor: ${connInfo.current_time}`);

    const server = app.listen(env.PORT, () => {
      console.log(`=======================================================`);
      console.log(` Librería Oskar - API Backend (Node.js & Express)`);
      console.log(` Entorno: ${env.NODE_ENV}`);
      console.log(` Servidor escuchando en: http://localhost:${env.PORT}`);
      console.log(` Endpoint Escaneo: POST http://localhost:${env.PORT}/api/libros/escanear`);
      console.log(` Healthcheck:      GET  http://localhost:${env.PORT}/api/health`);
      console.log(`=======================================================`);
    });

    // Cierre limpio (Graceful shutdown)
    const handleShutdown = async (signal) => {
      console.log(`\n[SHUTDOWN]: Señal ${signal} recibida. Cerrando servidor HTTP...`);
      server.close(async () => {
        console.log('[SHUTDOWN]: Servidor HTTP cerrado. Cerrando pool de conexiones PostgreSQL...');
        try {
          await db.pool.end();
          console.log('[SHUTDOWN]: Pool de base de datos finalizado correctamente.');
          process.exit(0);
        } catch (err) {
          console.error('[SHUTDOWN ERROR]: Error al cerrar el pool:', err.message);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  } catch (error) {
    console.error('[DATABASE CONNECTION FAILED]: No se pudo conectar a PostgreSQL:', error.message);
    process.exit(1);
  }
};

startServer();
