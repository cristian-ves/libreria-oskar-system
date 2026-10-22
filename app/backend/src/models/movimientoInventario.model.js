const { Model, DataTypes } = require('sequelize');

class MovimientoInventario extends Model {
  static initModel(sequelize) {
    return MovimientoInventario.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        inventario_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'inventarios',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        usuario_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'usuarios',
            key: 'id',
          },
          onDelete: 'RESTRICT',
        },
        tipo_movimiento_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'tipo_movimientos',
            key: 'id',
          },
          onDelete: 'RESTRICT',
        },
        cantidad: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            min: 0,
          },
        },
        motivo_detalle: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        fecha_movimiento: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        venta_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'ventas',
            key: 'id',
          },
          onDelete: 'RESTRICT',
        },
      },
      {
        sequelize,
        modelName: 'MovimientoInventario',
        tableName: 'movimientos_inventario',
        timestamps: true,
        createdAt: 'fecha_movimiento',
        updatedAt: false,
        underscored: true,
      }
    );
  }

  static associate(models) {
    MovimientoInventario.belongsTo(models.Inventario, {
      foreignKey: 'inventario_id',
      as: 'inventario',
      onDelete: 'CASCADE',
    });

    MovimientoInventario.belongsTo(models.Usuario, {
      foreignKey: 'usuario_id',
      as: 'usuario',
      onDelete: 'RESTRICT',
    });

    MovimientoInventario.belongsTo(models.TipoMovimiento, {
      foreignKey: 'tipo_movimiento_id',
      as: 'tipo_movimiento',
      onDelete: 'RESTRICT',
    });

    MovimientoInventario.belongsTo(models.Venta, {
      foreignKey: 'venta_id',
      as: 'venta',
      onDelete: 'RESTRICT',
    });
  }
}

module.exports = MovimientoInventario;
