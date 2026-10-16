const {
  TipoMovimiento,
  MovimientoInventario,
  Inventario,
  Libro,
  Bodega,
  Sucursal,
  Usuario,
  sequelize,
} = require('../models');

class MovimientoRepository {
  /**
   * Obtiene el identificador y detalle de un tipo de movimiento por nombre (case-insensitive).
   * @param {string} nombre - 'Ingreso', 'Salida', 'Ajuste'
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
   * @returns {Promise<{ id: string, nombre: string, descripcion: string | null } | null>}
   */
  async getTipoMovimientoByName(nombre, options = {}) {
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return null;
    }

    const cleanNombre = nombre.trim();

    const queryOptions = {
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('nombre')),
        cleanNombre.toLowerCase()
      ),
      raw: true,
    };

    if (options.transaction) {
      queryOptions.transaction = options.transaction;
    }

    const tipo = await TipoMovimiento.findOne(queryOptions);
    return tipo || null;
  }

  /**
   * Asegura la existencia de un tipo de movimiento ('Ingreso', 'Salida', etc.) de forma idempotente.
   * @param {string} nombre
   * @param {string} [descripcion='']
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
   * @returns {Promise<{ id: string, nombre: string, descripcion: string | null }>}
   */
  async ensureTipoMovimiento(nombre, descripcion = '', options = {}) {
    const cleanNombre = nombre.trim();
    const txOption = options.transaction ? { transaction: options.transaction } : {};

    const tipoExistente = await TipoMovimiento.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('nombre')),
        cleanNombre.toLowerCase()
      ),
      ...txOption,
    });

    if (tipoExistente) {
      return tipoExistente.get ? tipoExistente.get({ plain: true }) : tipoExistente;
    }

    // Sequelize 6 ejecuta findOrCreate en un savepoint si recibe una
    // transacción externa y recupera la fila creada por una solicitud rival
    // cuando la restricción UNIQUE(nombre) rechaza el INSERT concurrente.
    const [tipo] = await TipoMovimiento.findOrCreate({
      where: { nombre: cleanNombre },
      defaults: {
        descripcion: descripcion || null,
      },
      ...txOption,
    });

    return tipo.get ? tipo.get({ plain: true }) : tipo;
  }

  /**
   * Inserta un nuevo registro de movimiento de inventario dentro de una transacción.
   * Dispara automáticamente el trigger PL/pgSQL 'tg_movimientos_inventario_stock'
   * que actualiza de forma atómica y pesimista el stock en la tabla inventarios.
   * 
   * NOTA CRÍTICA: NO actualizar stock_actual directamente desde JavaScript.
   * El stock es administrado exclusivamente por el trigger de PostgreSQL.
   * 
   * @param {{ transaction?: import('sequelize').Transaction }} options
   * @param {{
   *   inventarioId: string,
   *   usuarioId: string,
   *   tipoMovimientoId: string,
   *   cantidad: number,
   *   motivoDetalle?: string
   * }} data
   * @returns {Promise<{
   *   id: string,
   *   inventario_id: string,
   *   usuario_id: string,
   *   tipo_movimiento_id: string,
   *   cantidad: number,
   *   motivo_detalle: string | null,
   *   fecha_movimiento: Date
   * }>}
   */
  async createMovimiento(options, { inventarioId, usuarioId, tipoMovimientoId, cantidad, motivoDetalle = null }) {
    const txOption = options.transaction ? { transaction: options.transaction } : {};

    const mov = await MovimientoInventario.create(
      {
        inventario_id: inventarioId,
        usuario_id: usuarioId,
        tipo_movimiento_id: tipoMovimientoId,
        cantidad: Number(cantidad),
        motivo_detalle: motivoDetalle || null,
      },
      txOption
    );

    return mov.get({ plain: true });
  }

  /**
   * Consulta el kardex / movimientos de inventario con filtros y paginación utilizando Sequelize ORM.
   * @param {{
   *   libroId?: string,
   *   bodegaId?: string,
   *   tipo?: string,
   *   limit?: number,
   *   offset?: number
   * }} filters
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
   * @returns {Promise<{
   *   total: number,
   *   limit: number,
   *   offset: number,
   *   movimientos: Array<Object>
   * }>}
   */
  async findAllWithFilters({ libroId = null, bodegaId = null, tipo = null, limit = 50, offset = 0 }, options = {}) {
    const whereInventario = {};
    if (libroId && typeof libroId === 'string' && libroId.trim()) {
      whereInventario.libro_id = libroId.trim();
    }
    if (bodegaId && typeof bodegaId === 'string' && bodegaId.trim()) {
      whereInventario.bodega_id = bodegaId.trim();
    }

    let tipoIncludeWhere = undefined;
    if (tipo && typeof tipo === 'string' && tipo.trim()) {
      tipoIncludeWhere = sequelize.where(
        sequelize.fn('LOWER', sequelize.col('tipo_movimiento.nombre')),
        tipo.trim().toLowerCase()
      );
    }

    const queryOptions = {
      include: [
        {
          model: TipoMovimiento,
          as: 'tipo_movimiento',
          attributes: ['id', 'nombre'],
          ...(tipoIncludeWhere ? { where: tipoIncludeWhere } : {}),
        },
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre_completo'],
          required: false,
        },
        {
          model: Inventario,
          as: 'inventario',
          attributes: ['id', 'libro_id', 'bodega_id'],
          ...(Object.keys(whereInventario).length > 0 ? { where: whereInventario } : {}),
          include: [
            {
              model: Libro,
              as: 'libro',
              attributes: ['id', 'titulo', 'isbn'],
            },
            {
              model: Bodega,
              as: 'bodega',
              attributes: ['id', 'nombre'],
              include: [
                {
                  model: Sucursal,
                  as: 'sucursal',
                  attributes: ['id', 'nombre'],
                  required: false,
                },
              ],
            },
          ],
        },
      ],
      order: [['fecha_movimiento', 'DESC']],
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
      distinct: true,
      ...(options.transaction ? { transaction: options.transaction } : {}),
    };

    const res = await MovimientoInventario.findAndCountAll(queryOptions);

    const movimientos = res.rows.map((m) => {
      const row = m.get ? m.get({ plain: true }) : m;
      return {
        id: row.id,
        fecha_movimiento: row.fecha_movimiento,
        tipo: row.tipo_movimiento ? row.tipo_movimiento.nombre : null,
        cantidad: row.cantidad,
        motivo_detalle: row.motivo_detalle,
        libro_id: row.inventario?.libro?.id || null,
        titulo: row.inventario?.libro?.titulo || null,
        isbn: row.inventario?.libro?.isbn || null,
        bodega_nombre: row.inventario?.bodega?.nombre || null,
        sucursal_nombre: row.inventario?.bodega?.sucursal?.nombre || null,
        usuario_nombre: row.usuario?.nombre_completo || null,
      };
    });

    return {
      total: res.count,
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
      movimientos,
    };
  }
}

module.exports = new MovimientoRepository();
