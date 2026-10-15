/**
 * Script de verificación de conexión y lectura para Sequelize ORM.
 * Ejecuta validaciones estrictamente de solo lectura sin alterar datos ni el esquema.
 * 
 * Uso: node src/test-sequelize.js
 */
const { testSequelizeConnection, sequelize } = require('./config/sequelize');
const models = require('./models');

async function main() {
  console.log('=======================================================');
  console.log(' Prueba de Conexión y Lectura - Sequelize ORM');
  console.log('=======================================================');

  try {
    // 1. Probar conectividad con PostgreSQL
    const connInfo = await testSequelizeConnection();
    console.log(`[CONEXIÓN OK]: PostgreSQL | BD: "${connInfo.db_name}" | Hora Servidor: ${connInfo.current_time}`);

    // 2. Verificar carga de los 11 modelos
    const modelNames = [
      'Sucursal',
      'Bodega',
      'Rol',
      'Usuario',
      'Autor',
      'Editorial',
      'Categoria',
      'Libro',
      'Inventario',
      'TipoMovimiento',
      'MovimientoInventario',
    ];

    console.log('\n[MODELOS]: Verificando modelos inicializados...');
    modelNames.forEach((name) => {
      if (models[name]) {
        console.log(` ✔ Modelo ${name} cargado correctamente (tabla: "${models[name].tableName}")`);
      } else {
        throw new Error(`Modelo ${name} no encontrado en models/index.js`);
      }
    });

    // 3. Lectura de catálogos y datos existentes (solo lectura)
    console.log('\n[CONSULTAS DE LECTURA]:');
    const roles = await models.Rol.findAll({ raw: true });
    console.log(` ✔ Roles en BD (${roles.length}): ${roles.map((r) => r.nombre).join(', ')}`);

    const tipos = await models.TipoMovimiento.findAll({ raw: true });
    console.log(` ✔ Tipos de Movimiento (${tipos.length}): ${tipos.map((t) => t.nombre).join(', ')}`);

    const categorias = await models.Categoria.findAll({ raw: true });
    console.log(` ✔ Categorías registradas: ${categorias.length}`);

    // 4. Prueba de Eager Loading con asociaciones
    const usuarios = await models.Usuario.findAll({
      include: [{ model: models.Rol, as: 'rol' }],
      limit: 2,
    });
    console.log(` ✔ Usuarios con relación Rol (${usuarios.length}):`);
    usuarios.forEach((u) => {
      console.log(`    - ${u.nombre_completo} (${u.email}) -> Rol: ${u.rol ? u.rol.nombre : 'Sin rol'}`);
    });

    const bodegas = await models.Bodega.findAll({
      include: [{ model: models.Sucursal, as: 'sucursal' }],
      limit: 2,
    });
    console.log(` ✔ Bodegas con relación Sucursal (${bodegas.length}):`);
    bodegas.forEach((b) => {
      console.log(`    - ${b.nombre} -> Sucursal: ${b.sucursal ? b.sucursal.nombre : 'Sin sucursal'}`);
    });

    console.log('\n=======================================================');
    console.log(' ESTADO: Conexión y lectura con Sequelize 100% EXITOSAS');
    console.log(' Ninguna tabla ni dato fue modificado.');
    console.log('=======================================================');
  } catch (error) {
    console.error('\n[ERROR EN VERIFICACIÓN SEQUELIZE]:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
    console.log('[CONEXIÓN]: Pool de Sequelize cerrado limpiamente.');
  }
}

if (require.main === module) {
  main();
}

module.exports = main;
