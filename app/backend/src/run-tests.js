const { spawnSync } = require('child_process');
const path = require('path');

if (process.env.NODE_ENV === 'production') {
  throw new Error('npm test está bloqueado cuando NODE_ENV=production.');
}

process.env.NODE_ENV = 'test';

const env = require('./config/env');
const TEST_DATABASE_NAME = 'libreria_oskar_test';

if (env.NODE_ENV !== 'test' || env.db.database !== TEST_DATABASE_NAME || env.db.connectionString) {
  throw new Error(`Pruebas bloqueadas: la conexión debe usar exclusivamente ${TEST_DATABASE_NAME}.`);
}

async function run() {
  const { sequelize } = require('./config/sequelize');
  let sequelizeDatabase;

  try {
    await sequelize.authenticate();
    const [rows] = await sequelize.query('SELECT current_database() AS db_name;');
    sequelizeDatabase = rows[0].db_name;
    if (sequelizeDatabase !== TEST_DATABASE_NAME) {
      throw new Error('Pruebas bloqueadas: Sequelize no está conectado a libreria_oskar_test.');
    }
  } finally {
    await sequelize.close();
  }

  console.log(`Base de pruebas verificada para Sequelize: ${TEST_DATABASE_NAME}`);
  const result = spawnSync(
    process.execPath,
    ['--test', '--test-concurrency=1', 'tests/**/*.test.js'],
    {
      cwd: path.resolve(__dirname, '..'),
      env: process.env,
      stdio: 'inherit',
    }
  );

  if (result.error) throw result.error;
  process.exitCode = result.status === null ? 1 : result.status;
}

run().catch((error) => {
  console.error(`[TEST GUARD]: ${error.message}`);
  process.exitCode = 1;
});
