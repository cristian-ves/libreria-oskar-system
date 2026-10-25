const fs = require('fs');
const path = require('path');
const { sequelize, Sequelize } = require('../config/sequelize');
const { esperarBaseDatos } = require('./esperarBaseDatos');

const { QueryTypes } = Sequelize;

/**
 * Ejecutador de migraciones versionadas e idempotentes para PostgreSQL.
 */
async function migrate() {
  const migrationsDir = process.env.MIGRATIONS_DIR
    ? path.resolve(process.env.MIGRATIONS_DIR)
    : path.resolve(__dirname, '../../../database/migrations');

  // 1. Asegurar la tabla de registro schema_migrations
  await sequelize.query(`
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
  const rows = await sequelize.query('SELECT filename FROM schema_migrations;', {
    type: QueryTypes.SELECT,
  });
  const applied = new Set(rows.map((row) => row.filename));

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

    try {
      await sequelize.transaction(async (transaction) => {
        // Sin bind ni replacements: el archivo es SQL multi-sentencia.
        await sequelize.query(sql, { transaction });
        await sequelize.query('INSERT INTO schema_migrations (filename) VALUES ($1);', {
          bind: [file],
          transaction,
        });
      });
      console.log(`[MIGRATE] Aplicada: ${file}`);
    } catch (err) {
      console.error(`[MIGRATE] Error en ${file}: ${err.message}`);
      throw err;
    }
  }
}

if (require.main === module) {
  esperarBaseDatos()
    .catch((error) => {
      console.error(`[DATABASE CONNECTION FAILED]: ${error.message}`);
      process.exit(1);
    })
    .then(() => migrate())
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrate;
