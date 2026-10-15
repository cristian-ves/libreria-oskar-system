const { Model, DataTypes } = require('sequelize');

class Categoria extends Model {
  static initModel(sequelize) {
    return Categoria.init(
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
          unique: true,
        },
        creado_en: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: 'Categoria',
        tableName: 'categorias',
        timestamps: true,
        createdAt: 'creado_en',
        updatedAt: false,
        underscored: true,
      }
    );
  }

  static associate(models) {
    Categoria.hasMany(models.Libro, {
      foreignKey: 'categoria_id',
      as: 'libros',
      onDelete: 'SET NULL',
    });
  }
}

module.exports = Categoria;
