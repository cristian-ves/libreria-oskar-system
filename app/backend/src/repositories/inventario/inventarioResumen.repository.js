const {
  Inventario,
  Libro,
  Bodega,
  sequelize,
  Sequelize,
} = require('../../models');
const { ULTIMA_SALIDA_SQL } = require('./inventarioSubconsultas.helper');

const { Op } = Sequelize;

module.exports = {
  /**
   * Obtiene el resumen general del inventario, alertas y libros sin precio.
   * @param {number} diasStockObsoleto
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
  */
  async getResumen(diasStockObsoleto = 90, options = {}) {
    const txOption = options.transaction ? { transaction: options.transaction } : {};

    const diasNum = Number(diasStockObsoleto) || 90;
    const ultSal = ULTIMA_SALIDA_SQL;

    const loadMetricas = () => Inventario.findAll({
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('stock_actual')), 0), 'total_unidades'],
        [sequelize.literal('COUNT(DISTINCT CASE WHEN "Inventario"."stock_actual" > 0 THEN "Inventario"."libro_id" END)'), 'titulos_con_stock'],
        [sequelize.literal('COUNT(CASE WHEN "Inventario"."stock_actual" <= "Inventario"."stock_minimo" THEN 1 END)'), 'bajo_stock'],
        [sequelize.literal('COUNT(CASE WHEN "Inventario"."stock_actual" = 0 THEN 1 END)'), 'agotados'],
        [sequelize.literal(`COUNT(CASE WHEN "Inventario"."stock_actual" > 0 AND COALESCE(${ultSal}, "Inventario"."creado_en") < (NOW() - (${diasNum} || ' days')::INTERVAL) THEN 1 END)`), 'obsoletos'],
      ],
      raw: true,
      ...txOption,
    });

    const loadSinPrecio = () => Libro.count({
      where: {
        activo: true,
        [Op.or]: [
          { precio: 0 },
          { precio: null },
        ],
      },
      ...txOption,
    });

    const loadAlertas = () => Inventario.findAll({
      where: sequelize.literal('"Inventario"."stock_actual" <= "Inventario"."stock_minimo"'),
      attributes: ['stock_actual', 'stock_minimo'],
      include: [
        {
          model: Libro,
          as: 'libro',
          attributes: ['titulo'],
          required: true,
        },
        {
          model: Bodega,
          as: 'bodega',
          attributes: ['nombre'],
          required: true,
        },
      ],
      order: [
        [sequelize.literal('("Inventario"."stock_actual" - "Inventario"."stock_minimo")'), 'ASC'],
      ],
      limit: 10,
      raw: true,
      nest: true,
      ...txOption,
    });

    let resMetricas;
    let librosSinPrecio;
    let resAlertas;

    if (options.transaction) {
      // Una transacción Sequelize usa una conexión; serializar evita consultas
      // concurrentes sobre el mismo cliente PostgreSQL.
      resMetricas = await loadMetricas();
      librosSinPrecio = await loadSinPrecio();
      resAlertas = await loadAlertas();
    } else {
      [resMetricas, librosSinPrecio, resAlertas] = await Promise.all([
        loadMetricas(),
        loadSinPrecio(),
        loadAlertas(),
      ]);
    }

    const metricasRow = resMetricas[0] || {};

    const alertas_bajo_stock = resAlertas.map((a) => ({
      titulo: a.libro?.titulo || '',
      bodega_nombre: a.bodega?.nombre || '',
      stock_actual: a.stock_actual,
      stock_minimo: a.stock_minimo,
    }));

    return {
      total_unidades: parseInt(metricasRow.total_unidades || 0, 10),
      titulos_con_stock: parseInt(metricasRow.titulos_con_stock || 0, 10),
      bajo_stock: parseInt(metricasRow.bajo_stock || 0, 10),
      agotados: parseInt(metricasRow.agotados || 0, 10),
      obsoletos: parseInt(metricasRow.obsoletos || 0, 10),
      libros_sin_precio: librosSinPrecio,
      alertas_bajo_stock,
    };
  },
};
