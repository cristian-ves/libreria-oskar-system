const { Model, DataTypes } = require('sequelize');

class Bodega extends Model {
  static initModel(sequelize) {
    return Bodega.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        sucursal_id: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: 'uq_sucursal_bodega',
          references: {
            model: 'sucursales',
            key: 'id',
          },
          onDelete: 'RESTRICT',
        },
        nombre: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: 'uq_sucursal_bodega',
        },
        descripcion: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        activo: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        creado_en: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        actualizado_en: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: 'Bodega',
        tableName: 'bodegas',
        timestamps: true,
        createdAt: 'creado_en',
        updatedAt: 'actualizado_en',
        underscored: true,
      }
    );
  }

  static associate(models) {
    Bodega.belongsTo(models.Sucursal, {
      foreignKey: 'sucursal_id',
      as: 'sucursal',
      onDelete: 'RESTRICT',
    });

    Bodega.hasMany(models.Inventario, {
      foreignKey: 'bodega_id',
      as: 'inventarios',
      onDelete: 'RESTRICT',
    });

    Bodega.belongsToMany(models.Libro, {
      through: models.Inventario,
      foreignKey: 'bodega_id',
      otherKey: 'libro_id',
      as: 'libros',
    });
  }
}

module.exports = Bodega;
