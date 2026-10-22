const { sequelize, Autor, Editorial } = require('../../models');
const { ConflictError } = require('../../utils/errors');

// Los métodos usan `this` (fachada LibroService) para conservar la resolución dinámica
// de _upsertAutor/_upsertEditorial/_crearMovimientoIngreso y su parcheo en pruebas.
module.exports = {
  async _upsertMasterRecord(Model, transaction, nombre, defaults, updates) {
    const cleanNombre = nombre.trim();
    const where = sequelize.where(
      sequelize.fn('LOWER', sequelize.col('nombre')),
      cleanNombre.toLowerCase()
    );
    let record = await Model.findOne({ where, transaction });

    if (!record) {
      try {
        // El savepoint permite recuperar un conflicto UNIQUE sin dejar abortada
        // la transacción principal que registra el libro y su inventario.
        record = await sequelize.transaction({ transaction }, (savepoint) =>
          Model.create({ nombre: cleanNombre, ...defaults }, { transaction: savepoint })
        );
      } catch (error) {
        if ((error.code || error.original?.code || error.parent?.code) !== ConflictError.PG_UNIQUE_VIOLATION) {
          throw error;
        }
        record = await Model.findOne({ where, transaction });
        if (!record) throw error;
      }
    }

    const changed = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== null && value !== undefined && value !== '')
    );
    if (Object.keys(changed).length) {
      await record.update(changed, { transaction });
    }
    return record.get({ plain: true });
  },

  async _upsertAutor(transaction, { nombre, biografia = null }) {
    return this._upsertMasterRecord(Autor, transaction, nombre, { biografia }, { biografia });
  },

  async _upsertEditorial(transaction, { nombre, pais = null }) {
    return this._upsertMasterRecord(Editorial, transaction, nombre, { pais }, { pais });
  },
};
