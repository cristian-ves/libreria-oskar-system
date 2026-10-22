const { Model, DataTypes } = require('sequelize');

class VentaDetalle extends Model {
  static initModel(sequelize) {
    return VentaDetalle.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        venta_id: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: 'uq_venta_libro',
          references: {
            model: 'ventas',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        libro_id: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: 'uq_venta_libro',
          references: {
            model: 'libros',
            key: 'id',
          },
          onDelete: 'RESTRICT',
        },
        cantidad: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            min: 1,
          },
        },
        // Snapshot del precio del libro al momento de la venta.
        precio_unitario: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0.01,
          },
        },
        subtotal: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'VentaDetalle',
        tableName: 'venta_detalles',
        timestamps: false,
        underscored: true,
      }
    );
  }

  static associate(models) {
    VentaDetalle.belongsTo(models.Venta, {
      foreignKey: 'venta_id',
      as: 'venta',
      onDelete: 'CASCADE',
    });

    VentaDetalle.belongsTo(models.Libro, {
      foreignKey: 'libro_id',
      as: 'libro',
      onDelete: 'RESTRICT',
    });
  }
}

module.exports = VentaDetalle;
