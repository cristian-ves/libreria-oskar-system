const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function seed() {
  console.log('[SEED]: Iniciando sembrado de datos básicos para pruebas y desarrollo...');

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Asegurar roles
    await client.query(`
      INSERT INTO roles (nombre, descripcion) VALUES
      ('Administrador', 'Control total de inventario y configuración.'),
      ('Empleado', 'Encargado de registrar ingresos, salidas y auditorías.'),
      ('Usuario', 'Clientes y público externo.')
      ON CONFLICT (nombre) DO NOTHING;
    `);

    // 2. Asegurar sucursal por defecto
    let sucursalId;
    const sucursalExistente = await client.query(
      'SELECT id FROM sucursales WHERE nombre = $1 LIMIT 1;',
      ['Sucursal Central']
    );

    if (sucursalExistente.rows.length > 0) {
      sucursalId = sucursalExistente.rows[0].id;
    } else {
      const nuevaSucursal = await client.query(`
        INSERT INTO sucursales (nombre, direccion, telefono)
        VALUES ($1, $2, $3)
        RETURNING id;
      `, ['Sucursal Central', 'Centro Comercial Paulinos Local L6, Quetzaltenango', '+502 5614 7611']);
      sucursalId = nuevaSucursal.rows[0].id;
    }

    // 3. Asegurar bodega por defecto
    let bodegaId;
    const bodegaExistente = await client.query(
      'SELECT id FROM bodegas WHERE nombre = $1 LIMIT 1;',
      ['Bodega Principal']
    );

    if (bodegaExistente.rows.length > 0) {
      bodegaId = bodegaExistente.rows[0].id;
    } else {
      const nuevaBodega = await client.query(`
        INSERT INTO bodegas (sucursal_id, nombre, descripcion)
        VALUES ($1, $2, $3)
        RETURNING id;
      `, [sucursalId, 'Bodega Principal', 'Bodega central de almacenamiento y recepción']);
      bodegaId = nuevaBodega.rows[0].id;
    }

    // 4. Asegurar usuarios con credenciales reales (Administrador y Empleado)
    const isProduction = process.env.NODE_ENV === 'production';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || (!isProduction ? 'Admin123!' : null);
    const empleadoPassword = process.env.SEED_EMPLEADO_PASSWORD || (!isProduction ? 'Empleado123!' : null);

    const rolAdminRes = await client.query("SELECT id FROM roles WHERE nombre = 'Administrador' LIMIT 1;");
    const rolAdminId = rolAdminRes.rows[0]?.id;

    const rolEmpleadoRes = await client.query("SELECT id FROM roles WHERE nombre = 'Empleado' LIMIT 1;");
    const rolEmpleadoId = rolEmpleadoRes.rows[0]?.id;

    let adminId = null;
    let usuarioId = null;

    if (adminPassword && rolAdminId) {
      const adminHash = await bcrypt.hash(adminPassword, 10);
      const adminRes = await client.query(`
        INSERT INTO usuarios (rol_id, nombre_completo, email, password_hash, activo)
        VALUES ($1, 'Administrador Principal', 'admin@libreriaoskar.com', $2, true)
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          rol_id = EXCLUDED.rol_id,
          nombre_completo = EXCLUDED.nombre_completo,
          activo = true
        RETURNING id;
      `, [rolAdminId, adminHash]);
      adminId = adminRes.rows[0].id;
    } else if (isProduction && !process.env.SEED_ADMIN_PASSWORD) {
      console.warn('[SEED AVISO]: NODE_ENV es production y falta SEED_ADMIN_PASSWORD. No se creó el usuario admin@libreriaoskar.com.');
    }

    if (empleadoPassword && rolEmpleadoId) {
      const empleadoHash = await bcrypt.hash(empleadoPassword, 10);
      const empleadoRes = await client.query(`
        INSERT INTO usuarios (rol_id, nombre_completo, email, password_hash, activo)
        VALUES ($1, 'Carlos Empleado', 'empleado@libreriaoskar.com', $2, true)
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          rol_id = EXCLUDED.rol_id,
          nombre_completo = EXCLUDED.nombre_completo,
          activo = true
        RETURNING id;
      `, [rolEmpleadoId, empleadoHash]);
      usuarioId = empleadoRes.rows[0].id;
    } else if (isProduction && !process.env.SEED_EMPLEADO_PASSWORD) {
      console.warn('[SEED AVISO]: NODE_ENV es production y falta SEED_EMPLEADO_PASSWORD. No se creó el usuario empleado@libreriaoskar.com.');
    }

    // 5. Asegurar tipos de movimiento
    await client.query(`
      INSERT INTO tipo_movimientos (nombre, descripcion) VALUES
      ('Ingreso', 'Entrada de stock por compras de mercancía a proveedores o transferencias.'),
      ('Salida', 'Disminución de stock por venta a cliente presencial u obsolescencia/daño.'),
      ('Ajuste', 'Corrección de inventario tras auditoría o recuento físico directo.')
      ON CONFLICT (nombre) DO NOTHING;
    `);

    await client.query('COMMIT');

    console.log('[SEED EXITOSO]:');
    console.log(` - Sucursal ID: ${sucursalId}`);
    console.log(` - Bodega ID:   ${bodegaId} (Bodega Principal)`);
    if (adminId) console.log(` - Admin ID:    ${adminId} (admin@libreriaoskar.com)`);
    if (usuarioId) console.log(` - Empleado ID: ${usuarioId} (Carlos Empleado - empleado@libreriaoskar.com)`);
    console.log('\nPuedes usar estos IDs para probar el endpoint POST /api/libros/escanear');

    return { sucursalId, bodegaId, usuarioId, adminId };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[SEED ERROR]: Error durante el sembrado de datos:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seed;
