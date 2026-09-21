const { Pool } = require('pg');
const env = require('./env');

const poolConfig = env.db.connectionString
  ? { connectionString: env.db.connectionString }
  : {
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      max: 20, // Máximo de conexiones concurrentes en el pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[DB POOL ERROR]: Error inesperado en el cliente inactivo de PostgreSQL:', err.message);
});

/**
 * Ejecuta una consulta directa utilizando el pool.
 * @param {string} text - Consulta SQL parametrizada.
 * @param {Array} params - Parámetros de la consulta.
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Obtiene un cliente dedicado del pool para control manual de transacciones.
 * @returns {Promise<import('pg').PoolClient>}
 */
const getClient = () => pool.connect();

/**
 * Ejecuta una función dentro de una transacción ACID en PostgreSQL.
 * Realiza BEGIN antes de la ejecución, COMMIT al completarse exitosamente,
 * y ROLLBACK en caso de cualquier error, asegurando la liberación del cliente en el bloque finally.
 * 
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} callback - Operaciones a ejecutar dentro de la transacción.
 * @returns {Promise<T>}
 */
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('[DB TRANSACTION ROLLBACK ERROR]:', rollbackErr.message);
    }
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Prueba la conexión con PostgreSQL al inicio del servicio.
 */
const testConnection = async () => {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT NOW() AS current_time, current_database() AS db_name');
    return res.rows[0];
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  getClient,
  withTransaction,
  testConnection,
};
