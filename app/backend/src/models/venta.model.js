const { Model, DataTypes, literal } = require('sequelize');

class Venta extends Model {
  static initModel(sequelize) {
    return Venta.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        // Correlativo asignado por la BD (ventas_numero_seq); puede tener huecos.
        numero: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
          defaultValue: literal("nextval('ventas_numero_seq')"),
        },
        bodega_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'bodegas',
            key: 'id',
          },
          onDelete: 'RESTRICT',
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
        cliente_nombre: {
          type: DataTypes.STRING(150),
          allowNull: false,
          defaultValue: 'Consumidor final',
        },
        cliente_nit: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        metodo_pago: {
          type: DataTypes.STRING(20),
          allowNull: false,
          validate: {
            isIn: [['Efectivo', 'Transferencia']],
          },
        },
        subtotal: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0,
          },
        },
        descuento: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: 0,
          },
        },
        total: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0,
          },
        },
        notas: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        estado: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: 'Completada',
          validate: {
            isIn: [['Completada', 'Anulada']],
          },
        },
        anulada_en: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        anulada_por: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'usuarios',
            key: 'id',
          },
          onDelete: 'RESTRICT',
        },
        motivo_anulacion: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        creado_en: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: 'Venta',
        tableName: 'ventas',
        timestamps: true,
        createdAt: 'creado_en',
        updatedAt: false,
        underscored: true,
      }
    );
  }

  static associate(models) {
    Venta.belongsTo(models.Bodega, {
      foreignKey: 'bodega_id',
      as: 'bodega',
      onDelete: 'RESTRICT',
    });

    Venta.belongsTo(models.Usuario, {
      foreignKey: 'usuario_id',
      as: 'vendedor',
      onDelete: 'RESTRICT',
    });

    Venta.belongsTo(models.Usuario, {
      foreignKey: 'anulada_por',
      as: 'anulador',
      onDelete: 'RESTRICT',
    });

    Venta.hasMany(models.VentaDetalle, {
      foreignKey: 'venta_id',
      as: 'detalles',
      onDelete: 'CASCADE',
    });

    Venta.hasMany(models.MovimientoInventario, {
      foreignKey: 'venta_id',
      as: 'movimientos',
      onDelete: 'RESTRICT',
    });
  }
}

module.exports = Venta;
