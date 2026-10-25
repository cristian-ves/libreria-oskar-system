/**
 * Espera a que PostgreSQL responda al arrancar (Cloud Run con Direct VPC egress puede tardar
 * un minuto o más en abrir conexiones salientes). Reintenta con pausas crecientes hasta un
 * tiempo máximo; fuera de producción el tiempo por defecto es 0: un solo intento.
 *
 * Cómo se verificó el formato de los errores (node_modules/sequelize/lib):
 * - dialects/postgres/connection-manager.js:128-150 envuelve el error de `pg` según `err.code`:
 *   ECONNREFUSED -> ConnectionRefusedError, ENOTFOUND -> HostNotFoundError,
 *   EHOSTUNREACH -> HostNotReachableError, EINVAL -> InvalidConnectionError y cualquier otro
 *   (incluidos 28P01, 28000, 3D000, 57P03, 53300) -> ConnectionError genérico.
 * - errors/connection-error.js:34-40 guarda el error de `pg` en `parent` y `original`,
 *   por eso el código SQLSTATE/errno se busca en `error`, `error.original` y `error.parent`.
 * - errors/connection/access-denied-error.js define el nombre SequelizeAccessDeniedError; el
 *   dialecto postgres no lo lanza (lo usan otros dialectos), pero se trata como fatal por seguridad.
 * - ConnectionAcquireTimeoutError (pool.acquire) y los errores desconocidos se reintentan.
 */
const ESPERA_PRODUCCION_MS = 120000;
const ESPERA_TOPE_MS = 600000;
const MAX_MENSAJE = 200;

// Fatales: reintentar no los arregla (credenciales o base inexistente).
const NOMBRES_FATALES = new Set(['SequelizeAccessDeniedError']);
const CODIGOS_FATALES = new Set(['28P01', '28000', '3D000']);

function leerEsperaMaxima(entorno = process.env) {
  const crudo = entorno.DB_CONNECT_MAX_WAIT_MS;
  if (crudo === undefined || crudo === '') {
    return entorno.NODE_ENV === 'production' ? ESPERA_PRODUCCION_MS : 0;
  }
  const texto = String(crudo).trim();
  const valor = Number(texto);
  if (!/^\d+$/.test(texto) || !Number.isSafeInteger(valor) || valor > ESPERA_TOPE_MS) {
    throw new Error(`DB_CONNECT_MAX_WAIT_MS debe ser un entero entre 0 y ${ESPERA_TOPE_MS} (milisegundos)`);
  }
  return valor;
}

function esFatal(error) {
  if (!error) return false;
  if (NOMBRES_FATALES.has(error.name)) return true;
  return [error, error.original, error.parent].some(
    (e) => e && CODIGOS_FATALES.has(e.code)
  );
}

function resumirMensaje(error) {
  const mensaje = String((error && error.message) || 'error desconocido');
  return mensaje.length > MAX_MENSAJE ? `${mensaje.slice(0, MAX_MENSAJE)}...` : mensaje;
}

const segundos = (ms) => Number((ms / 1000).toFixed(1));

async function esperarBaseDatos({
  conectar,
  maxEsperaMs,
  pausaInicialMs = 1000,
  pausaMaxMs = 10000,
  esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms)),
  ahora = Date.now,
  log = console,
} = {}) {
  // Carga perezosa: importar este módulo no abre el pool de Sequelize.
  const intentar = conectar || require('../config/sequelize').testSequelizeConnection;
  const limite = maxEsperaMs === undefined ? leerEsperaMaxima() : maxEsperaMs;
  const inicio = ahora();
  let intento = 0;
  let pausa = pausaInicialMs;

  for (;;) {
    intento += 1;
    try {
      return await intentar();
    } catch (error) {
      if (limite === 0 || esFatal(error)) throw error;

      const transcurrido = ahora() - inicio;
      const restante = limite - transcurrido;
      if (restante <= 0) {
        log.warn(`[DATABASE RETRY]: se agotó la espera (${intento} intentos en ${segundos(transcurrido)} s)`);
        throw error;
      }

      const espera = Math.min(pausa, pausaMaxMs, restante);
      log.warn(`[DATABASE RETRY]: intento ${intento} falló (${resumirMensaje(error)}); reintentando en ${segundos(espera)} s`);
      await esperar(espera);
      pausa = Math.min(pausa * 2, pausaMaxMs);
    }
  }
}

module.exports = { esperarBaseDatos, leerEsperaMaxima };
