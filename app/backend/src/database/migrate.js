const fs = require('fs');
const path = require('path');
const db = require('../config/db');

/**
 * Ejecutador de migraciones versionadas e idempotentes para PostgreSQL.
 */
async function migrate() {
  const migrationsDir = process.env.MIGRATIONS_DIR
    ? path.resolve(process.env.MIGRATIONS_DIR)
    : path.resolve(__dirname, '../../../database/migrations');

  const client = await db.pool.connect();
  try {
    // 1. Asegurar la tabla de registro schema_migrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Comprobar existencia del directorio
    if (!fs.existsSync(migrationsDir)) {
      console.log(`[MIGRATE] Directorio no encontrado: ${migrationsDir}`);
      return;
    }

    // 3. Obtener migraciones ya aplicadas
    const res = await client.query('SELECT filename FROM schema_migrations;');
    const applied = new Set(res.rows.map((row) => row.filename));

    // 4. Leer archivos .sql ordenados alfabéticamente
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    // 5. Aplicar cada migración pendiente en su propia transacción
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[MIGRATE] Omitida: ${file}`);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      const fileClient = await db.pool.connect();
      try {
        await fileClient.query('BEGIN');
        await fileClient.query(sql);
        await fileClient.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1);',
          [file]
        );
        await fileClient.query('COMMIT');
        console.log(`[MIGRATE] Aplicada: ${file}`);
      } catch (err) {
        await fileClient.query('ROLLBACK');
        console.error(`[MIGRATE] Error en ${file}: ${err.message}`);
        throw err;
      } finally {
        fileClient.release();
      }
    }
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrate;
