const { Model, DataTypes } = require('sequelize');

class Sucursal extends Model {
  static initModel(sequelize) {
    return Sucursal.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        nombre: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        direccion: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        telefono: {
          type: DataTypes.STRING(20),
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
        modelName: 'Sucursal',
        tableName: 'sucursales',
        timestamps: true,
        createdAt: 'creado_en',
        updatedAt: 'actualizado_en',
        underscored: true,
      }
    );
  }

  static associate(models) {
    Sucursal.hasMany(models.Bodega, {
      foreignKey: 'sucursal_id',
      as: 'bodegas',
      onDelete: 'RESTRICT',
    });
  }
}

module.exports = Sucursal;
