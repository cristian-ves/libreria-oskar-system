const { Model, DataTypes } = require('sequelize');

class TipoMovimiento extends Model {
  static initModel(sequelize) {
    return TipoMovimiento.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        nombre: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true,
        },
        descripcion: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'TipoMovimiento',
        tableName: 'tipo_movimientos',
        timestamps: false,
        underscored: true,
      }
    );
  }

  static associate(models) {
    TipoMovimiento.hasMany(models.MovimientoInventario, {
      foreignKey: 'tipo_movimiento_id',
      as: 'movimientos',
      onDelete: 'RESTRICT',
    });
  }
}

module.exports = TipoMovimiento;
