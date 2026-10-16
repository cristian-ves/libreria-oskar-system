const { Model, DataTypes } = require('sequelize');

class Inventario extends Model {
  static initModel(sequelize) {
    return Inventario.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        libro_id: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: 'uq_libro_bodega',
          references: {
            model: 'libros',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        bodega_id: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: 'uq_libro_bodega',
          references: {
            model: 'bodegas',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        stock_actual: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: 0,
          },
        },
        stock_minimo: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 5,
          validate: {
            min: 0,
          },
        },
        ultima_auditoria: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        creado_en: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: 'Inventario',
        tableName: 'inventarios',
        timestamps: true,
        createdAt: 'creado_en',
        updatedAt: false,
        underscored: true,
      }
    );
  }

  static associate(models) {
    Inventario.belongsTo(models.Libro, {
      foreignKey: 'libro_id',
      as: 'libro',
      onDelete: 'CASCADE',
    });

    Inventario.belongsTo(models.Bodega, {
      foreignKey: 'bodega_id',
      as: 'bodega',
      onDelete: 'CASCADE',
    });

    Inventario.hasMany(models.MovimientoInventario, {
      foreignKey: 'inventario_id',
      as: 'movimientos',
      onDelete: 'CASCADE',
    });
  }
}

module.exports = Inventario;
