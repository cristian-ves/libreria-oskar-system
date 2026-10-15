const { Model, DataTypes } = require('sequelize');

class Rol extends Model {
  static initModel(sequelize) {
    return Rol.init(
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
        creado_en: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: 'Rol',
        tableName: 'roles',
        timestamps: true,
        createdAt: 'creado_en',
        updatedAt: false,
        underscored: true,
      }
    );
  }

  static associate(models) {
    Rol.hasMany(models.Usuario, {
      foreignKey: 'rol_id',
      as: 'usuarios',
      onDelete: 'RESTRICT',
    });
  }
}

module.exports = Rol;
