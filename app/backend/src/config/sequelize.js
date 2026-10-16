const { Sequelize } = require('sequelize');
const env = require('./env');

const sequelizeOptions = {
  dialect: 'postgres',
  logging: process.env.SEQUELIZE_LOGGING === 'true' ? console.log : false,
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 30000,
  },
  define: {
    freezeTableName: true,
    underscored: true,
    timestamps: false,
  },
};

const sequelize = env.db.connectionString
  ? new Sequelize(env.db.connectionString, sequelizeOptions)
  : new Sequelize(
      env.db.database,
      env.db.user,
      env.db.password,
      {
        host: env.db.host,
        port: env.db.port,
        ...sequelizeOptions,
      }
    );

/**
 * Prueba la conexión con PostgreSQL vía Sequelize sin alterar el esquema ni datos.
 * @returns {Promise<{ current_time: Date, db_name: string }>}
 */
const testSequelizeConnection = async () => {
  await sequelize.authenticate();
  const [results] = await sequelize.query('SELECT NOW() AS current_time, current_database() AS db_name;');
  return results[0];
};

module.exports = {
  sequelize,
  Sequelize,
  testSequelizeConnection,
};
