const { Model, DataTypes } = require('sequelize');

class AlertaInventarioReporte extends Model {
  static initModel(sequelize) {
    return AlertaInventarioReporte.init({
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
      fecha_local: { type: DataTypes.DATEONLY, allowNull: false, unique: true },
      estado: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'procesando' },
      snapshot: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      cantidad_alertas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      iniciado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      finalizado_en: { type: DataTypes.DATE, allowNull: true },
      error: { type: DataTypes.TEXT, allowNull: true },
      lease_token: { type: DataTypes.UUID, allowNull: true },
      lease_hasta: { type: DataTypes.DATE, allowNull: true },
      creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    }, { sequelize, modelName: 'AlertaInventarioReporte', tableName: 'alertas_inventario_reportes', timestamps: true, createdAt: 'creado_en', updatedAt: 'actualizado_en', underscored: true });
  }

  static associate(models) {
    AlertaInventarioReporte.hasMany(models.AlertaInventarioEntrega, { foreignKey: 'reporte_id', as: 'entregas', onDelete: 'CASCADE' });
  }
}

module.exports = AlertaInventarioReporte;
