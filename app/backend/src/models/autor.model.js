const { Model, DataTypes } = require('sequelize');

class Autor extends Model {
  static initModel(sequelize) {
    return Autor.init(
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
        biografia: {
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
        modelName: 'Autor',
        tableName: 'autores',
        timestamps: true,
        createdAt: 'creado_en',
        updatedAt: false,
        underscored: true,
      }
    );
  }

  static associate(models) {
    Autor.hasMany(models.Libro, {
      foreignKey: 'autor_id',
      as: 'libros',
      onDelete: 'SET NULL',
    });
  }
}

module.exports = Autor;
