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
    const sucursalRes = await client.query(`
      INSERT INTO sucursales (nombre, direccion, telefono)
      VALUES ('Sucursal Central', 'Zona 1, Ciudad de Guatemala', '+502 2222-3333')
      ON CONFLICT DO NOTHING
      RETURNING id, nombre;
    `);

    let sucursalId;
    if (sucursalRes.rows.length > 0) {
      sucursalId = sucursalRes.rows[0].id;
    } else {
      const existing = await client.query('SELECT id FROM sucursales LIMIT 1;');
      sucursalId = existing.rows[0].id;
    }

    // 3. Asegurar bodega por defecto
    const bodegaRes = await client.query(`
      INSERT INTO bodegas (sucursal_id, nombre, descripcion)
      VALUES ($1, 'Bodega Principal', 'Bodega central de almacenamiento y recepción')
      ON CONFLICT (sucursal_id, nombre) DO UPDATE SET nombre = EXCLUDED.nombre
      RETURNING id, nombre;
    `, [sucursalId]);

    const bodegaId = bodegaRes.rows[0].id;

    // 4. Asegurar usuario por defecto
    const rolEmpleado = await client.query("SELECT id FROM roles WHERE nombre = 'Empleado' LIMIT 1;");
    const rolId = rolEmpleado.rows[0].id;

    const usuarioRes = await client.query(`
      INSERT INTO usuarios (rol_id, nombre_completo, email, password_hash)
      VALUES ($1, 'Carlos Empleado', 'empleado@libreriaoskar.com', '$2b$10$dummyHashForDevelopmentTestingPurposes123')
      ON CONFLICT (email) DO UPDATE SET nombre_completo = EXCLUDED.nombre_completo
      RETURNING id, nombre_completo, email;
    `, [rolId]);

    const usuarioId = usuarioRes.rows[0].id;

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
    console.log(` - Usuario ID:  ${usuarioId} (Carlos Empleado)`);
    console.log('\nPuedes usar estos IDs para probar el endpoint POST /api/libros/escanear');

    return { sucursalId, bodegaId, usuarioId };
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
