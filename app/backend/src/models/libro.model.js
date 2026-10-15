const { Model, DataTypes } = require('sequelize');

class Libro extends Model {
  static initModel(sequelize) {
    return Libro.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        autor_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'autores',
            key: 'id',
          },
          onDelete: 'SET NULL',
        },
        editorial_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'editoriales',
            key: 'id',
          },
          onDelete: 'SET NULL',
        },
        categoria_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'categorias',
            key: 'id',
          },
          onDelete: 'SET NULL',
        },
        titulo: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        isbn: {
          type: DataTypes.STRING(20),
          allowNull: true,
          unique: true,
        },
        resena: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        imagen_url: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        precio: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0,
          },
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
        modelName: 'Libro',
        tableName: 'libros',
        timestamps: true,
        createdAt: 'creado_en',
        updatedAt: 'actualizado_en',
        underscored: true,
      }
    );
  }

  static associate(models) {
    Libro.belongsTo(models.Autor, {
      foreignKey: 'autor_id',
      as: 'autor',
      onDelete: 'SET NULL',
    });

    Libro.belongsTo(models.Editorial, {
      foreignKey: 'editorial_id',
      as: 'editorial',
      onDelete: 'SET NULL',
    });

    Libro.belongsTo(models.Categoria, {
      foreignKey: 'categoria_id',
      as: 'categoria',
      onDelete: 'SET NULL',
    });

    Libro.hasMany(models.Inventario, {
      foreignKey: 'libro_id',
      as: 'inventarios',
      onDelete: 'CASCADE',
    });

    Libro.belongsToMany(models.Bodega, {
      through: models.Inventario,
      foreignKey: 'libro_id',
      otherKey: 'bodega_id',
      as: 'bodegas',
    });
  }
}

module.exports = Libro;
