const { Model, DataTypes } = require('sequelize');

class Editorial extends Model {
  static initModel(sequelize) {
    return Editorial.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        nombre: {
          type: DataTypes.STRING(150),
          allowNull: false,
          unique: true,
        },
        pais: {
          type: DataTypes.STRING(100),
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
        modelName: 'Editorial',
        tableName: 'editoriales',
        timestamps: true,
        createdAt: 'creado_en',
        updatedAt: false,
        underscored: true,
      }
    );
  }

  static associate(models) {
    Editorial.hasMany(models.Libro, {
      foreignKey: 'editorial_id',
      as: 'libros',
      onDelete: 'SET NULL',
    });
  }
}

module.exports = Editorial;
