const { Model, DataTypes } = require('sequelize');

class AlertaInventarioEntrega extends Model {
  static initModel(sequelize) {
    return AlertaInventarioEntrega.init({
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
      reporte_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'alertas_inventario_reportes', key: 'id' }, onDelete: 'CASCADE' },
      // Intencionalmente sin FK: el historial se conserva aunque se borre el usuario.
      administrador_id: { type: DataTypes.UUID, allowNull: false },
      correo_electronico: { type: DataTypes.STRING(254), allowNull: false },
      nombre_administrador: { type: DataTypes.STRING(150), allowNull: false },
      estado: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'pendiente' },
      intentos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      reintento_seguro: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      enviado_en: { type: DataTypes.DATE, allowNull: true },
      error: { type: DataTypes.TEXT, allowNull: true },
      lease_token: { type: DataTypes.UUID, allowNull: true },
      lease_hasta: { type: DataTypes.DATE, allowNull: true },
      creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    }, { sequelize, modelName: 'AlertaInventarioEntrega', tableName: 'alertas_inventario_entregas', timestamps: true, createdAt: 'creado_en', updatedAt: 'actualizado_en', underscored: true });
  }

  static associate(models) {
    AlertaInventarioEntrega.belongsTo(models.AlertaInventarioReporte, { foreignKey: 'reporte_id', as: 'reporte', onDelete: 'CASCADE' });
  }
}

module.exports = AlertaInventarioEntrega;
