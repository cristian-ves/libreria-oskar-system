const { Model, DataTypes } = require('sequelize');

class CodigoRespaldo extends Model {
  static initModel(sequelize) {
    return CodigoRespaldo.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        usuario_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'usuarios',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        // HMAC-SHA256 del código normalizado; el código en claro nunca se guarda.
        codigo_hash: {
          type: DataTypes.STRING(128),
          allowNull: false,
        },
        usado_en: {
          type: DataTypes.DATE,
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
        modelName: 'CodigoRespaldo',
        tableName: 'codigos_respaldo_2fa',
        timestamps: false,
        underscored: true,
      }
    );
  }

  static associate(models) {
    CodigoRespaldo.belongsTo(models.Usuario, {
      foreignKey: 'usuario_id',
      as: 'usuario',
      onDelete: 'CASCADE',
    });
  }
}

module.exports = CodigoRespaldo;
