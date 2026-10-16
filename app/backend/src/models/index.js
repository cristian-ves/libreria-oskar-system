const { sequelize, Sequelize } = require('../config/sequelize');

const Sucursal = require('./sucursal.model');
const Bodega = require('./bodega.model');
const Rol = require('./rol.model');
const Usuario = require('./usuario.model');
const Autor = require('./autor.model');
const Editorial = require('./editorial.model');
const Categoria = require('./categoria.model');
const Libro = require('./libro.model');
const Inventario = require('./inventario.model');
const TipoMovimiento = require('./tipoMovimiento.model');
const MovimientoInventario = require('./movimientoInventario.model');

const models = {
  Sucursal,
  Bodega,
  Rol,
  Usuario,
  Autor,
  Editorial,
  Categoria,
  Libro,
  Inventario,
  TipoMovimiento,
  MovimientoInventario,
};

// Inicializar cada modelo vinculándolo a la instancia de Sequelize
Object.values(models).forEach((model) => {
  if (typeof model.initModel === 'function') {
    model.initModel(sequelize);
  }
});

// Configurar todas las asociaciones entre modelos
Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

module.exports = {
  sequelize,
  Sequelize,
  ...models,
};
