const {
  sequelize,
  Sucursal,
  Bodega,
  Rol,
  Usuario,
  Libro,
  Inventario,
  Venta,
  MovimientoInventario,
} = require('../../src/models');
const movimientoRepository = require('../../src/repositories/movimiento.repository');

// ISBN-13 válido con prefijo 978 y dígito de control calculado.
function isbn13(body9) {
  const body = `978${String(body9).padStart(9, '0').slice(-9)}`;
  const sum = body.split('').reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return `${body}${(10 - (sum % 10)) % 10}`;
}

/**
 * Crea un entorno aislado (sucursal, bodegas, usuarios por rol) y devuelve utilidades
 * para fabricar libros con stock y para limpiar respetando las FK RESTRICT.
 */
async function crearEntorno(etiqueta) {
  const tag = `${etiqueta}-${Date.now()}`;
  const prefijo = Math.floor(100000 + Math.random() * 899999) * 1000;
  let contador = 0;
  const libros = [];
  const inventarios = [];

  const sucursal = await Sucursal.create({ nombre: `Suc ${tag}`, direccion: 'Fixture' });
  const bodega = await Bodega.create({ sucursal_id: sucursal.id, nombre: `Bod ${tag}` });
  const bodegaInactiva = await Bodega.create({
    sucursal_id: sucursal.id, nombre: `Bod inactiva ${tag}`, activo: false,
  });

  const usuarios = {};
  for (const rolNombre of ['Administrador', 'Empleado', 'Usuario']) {
    const rol = await Rol.findOne({ where: { nombre: rolNombre } });
    if (!rol) throw new Error(`Debe existir el rol ${rolNombre}`);
    usuarios[rolNombre] = await Usuario.create({
      rol_id: rol.id,
      nombre_completo: `${rolNombre} ${tag}`,
      email: `${rolNombre.toLowerCase()}-${tag}@example.test`,
      password_hash: 'no-es-un-hash-real',
    });
  }

  const tipoIngreso = await movimientoRepository.getTipoMovimientoByName('Ingreso');
  if (!tipoIngreso) throw new Error('Debe existir el tipo de movimiento Ingreso');

  /** Crea un libro con `precio`; si `stock` está definido, crea su inventario en la bodega con ese stock. */
  async function crearLibro({ titulo, precio = 10, stock = null, bodegaId = bodega.id } = {}) {
    contador += 1;
    const libro = await Libro.create({
      titulo: titulo || `Libro ventas ${tag} ${contador}`,
      isbn: isbn13(prefijo + contador),
      resena: 'Fixture aislado para ventas',
      precio,
    });
    libros.push(libro);

    let inventario = null;
    if (stock !== null) {
      inventario = await Inventario.create({
        libro_id: libro.id, bodega_id: bodegaId, stock_actual: 0, stock_minimo: 1,
      });
      inventarios.push(inventario);
      if (stock > 0) {
        await sequelize.transaction((transaction) =>
          movimientoRepository.createMovimiento({ transaction }, {
            inventarioId: inventario.id,
            usuarioId: usuarios.Administrador.id,
            tipoMovimientoId: tipoIngreso.id,
            cantidad: stock,
            motivoDetalle: 'Fixture inicial',
          }));
      }
    }
    return { libro, inventario };
  }

  const stockDe = async (inventario) => (await Inventario.findByPk(inventario.id)).stock_actual;

  /** Conteos de lo que la bodega de pruebas tiene persistido (ventas, movimientos). */
  async function conteos() {
    const ids = inventarios.map((i) => i.id);
    return {
      ventas: await Venta.count({ where: { bodega_id: bodega.id } }),
      movimientos: await MovimientoInventario.count({ where: { inventario_id: ids } }),
      stocks: (await Inventario.findAll({ where: { id: ids }, order: [['id', 'ASC']] }))
        .map((i) => `${i.id}:${i.stock_actual}`),
    };
  }

  async function limpiar() {
    const inventarioIds = (await Inventario.findAll({
      where: { bodega_id: [bodega.id, bodegaInactiva.id] }, attributes: ['id'],
    })).map((i) => i.id);
    const ventaIds = (await Venta.findAll({
      where: { bodega_id: [bodega.id, bodegaInactiva.id] }, attributes: ['id'],
    })).map((v) => v.id);

    await MovimientoInventario.destroy({ where: { inventario_id: inventarioIds } });
    await MovimientoInventario.destroy({ where: { venta_id: ventaIds } });
    await Venta.destroy({ where: { id: ventaIds } }); // venta_detalles cae en cascada
    await Inventario.destroy({ where: { id: inventarioIds } });
    await Libro.destroy({ where: { id: libros.map((l) => l.id) } });
    await Usuario.destroy({ where: { id: Object.values(usuarios).map((u) => u.id) } });
    await Bodega.destroy({ where: { id: [bodega.id, bodegaInactiva.id] } });
    await Sucursal.destroy({ where: { id: sucursal.id } });
  }

  return { tag, bodega, bodegaInactiva, usuarios, crearLibro, stockDe, conteos, limpiar };
}

module.exports = { crearEntorno, isbn13 };
