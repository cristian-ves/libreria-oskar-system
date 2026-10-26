#!/usr/bin/env node
// Este archivo es la única entrada que selecciona el perfil de configuración del Job.
process.env.APP_PROCESS_MODE = 'alertas-inventario';

const { sequelize } = require('../config/sequelize');
const { esperarBaseDatos } = require('../database/esperarBaseDatos');
const { crearServicioAlertasInventario } = require('../services/alertasInventario.service');

async function main({ database = sequelize, waitForDatabase = esperarBaseDatos, serviceFactory = crearServicioAlertasInventario, args = process.argv.slice(2), logger = console } = {}) {
  const desconocidos = args.filter((arg) => arg !== '--dry-run');
  if (desconocidos.length) throw new Error(`Argumentos no reconocidos: ${desconocidos.join(', ')}`);
  const dryRun = args.includes('--dry-run');
  try {
    await waitForDatabase();
    const resultado = await serviceFactory().ejecutar({ dryRun });
    logger.log(JSON.stringify({ proceso: 'alertas-inventario', ...resultado }));
    if (!dryRun && ['sin_administradores', 'fallido', 'incierto', 'procesando'].includes(resultado.estado)) process.exitCode = 1;
  } finally {
    await database.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    // Evita imprimir credenciales o mensajes de transporte sin filtrar.
    let mensaje = String(error.message || 'Fallo inesperado');
    for (const secreto of [
      process.env.DB_PASSWORD, process.env.MAIL_PASSWORD, process.env.JWT_SECRET,
      process.env.TWO_FACTOR_ENCRYPTION_KEY, process.env.SEED_ADMIN_PASSWORD, process.env.DATABASE_URL,
    ]) {
      if (secreto) mensaje = mensaje.split(secreto).join('[REDACTED]');
    }
    console.error(JSON.stringify({ proceso: 'alertas-inventario', estado: 'fallido', error: mensaje.slice(0, 500) }));
    process.exitCode = 1;
  });
}

module.exports = { main };
