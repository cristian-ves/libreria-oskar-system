const { Model, DataTypes } = require('sequelize');

class Usuario extends Model {
  static initModel(sequelize) {
    return Usuario.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        rol_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'roles',
            key: 'id',
          },
          onDelete: 'RESTRICT',
        },
        nombre_completo: {
          type: DataTypes.STRING(150),
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING(150),
          allowNull: false,
          unique: true,
          validate: {
            isEmail: true,
          },
        },
        password_hash: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        dos_factores_activo: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        dos_factores_secreto: {
          type: DataTypes.STRING(128),
          allowNull: true,
        },
        token_recuperacion: {
          type: DataTypes.STRING(255),
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
        modelName: 'Usuario',
        tableName: 'usuarios',
        timestamps: true,
        createdAt: 'creado_en',
        updatedAt: 'actualizado_en',
        underscored: true,
      }
    );
  }

  static associate(models) {
    Usuario.belongsTo(models.Rol, {
      foreignKey: 'rol_id',
      as: 'rol',
      onDelete: 'RESTRICT',
    });

    Usuario.hasMany(models.MovimientoInventario, {
      foreignKey: 'usuario_id',
      as: 'movimientos',
      onDelete: 'RESTRICT',
    });
  }
}

module.exports = Usuario;
