const { sequelize, Categoria } = require('../../models');
const libroRepository = require('../../repositories/libro.repository');
const { normalizarIsbn } = require('../../utils/isbn');
const { NotFoundError, ConflictError } = require('../../utils/errors');

const codigoError = (error) => error.code || error.original?.code || error.parent?.code;

module.exports = {
  async actualizarLibro({ libroId, titulo, autor, editorial, categoriaId, resena, imagenUrl, isbn, isbnPresente }) {
    try {
      return await sequelize.transaction(async (transaction) => {
        const txOptions = { transaction };
        const libro = await libroRepository.findByIdForUpdate(libroId, txOptions);
        if (!libro) throw new NotFoundError(`El libro indicado (ID: ${libroId}) no existe.`);

        const categoria = await Categoria.findByPk(categoriaId, { attributes: ['id'], transaction });
        if (!categoria) throw new NotFoundError(`La categoría indicada (ID: ${categoriaId}) no existe.`);

        const updates = {
          titulo: titulo.trim(),
          autor_id: (await this._upsertAutor(transaction, { nombre: autor.trim() })).id,
          editorial_id: editorial && editorial.trim()
            ? (await this._upsertEditorial(transaction, { nombre: editorial.trim() })).id
            : null,
          categoria_id: categoriaId,
          resena: resena.trim(),
          imagen_url: typeof imagenUrl === 'string' && imagenUrl.trim() ? imagenUrl.trim() : null,
        };

        if (isbnPresente) {
          const isbnNormalizado = isbn ? normalizarIsbn(isbn) : null;
          if (isbnNormalizado) {
            const otro = await libroRepository.findByIsbn(isbnNormalizado, txOptions);
            if (otro && otro.id !== libroId) {
              throw new ConflictError(`Ya existe otro libro registrado con el ISBN ${isbnNormalizado}.`);
            }
          }
          updates.isbn = isbnNormalizado;
        }

        return libroRepository.updateBibliografia(libroId, updates, txOptions);
      });
    } catch (error) {
      if (codigoError(error) === ConflictError.PG_UNIQUE_VIOLATION) {
        throw new ConflictError('El ISBN ya pertenece a otro libro.');
      }
      throw error;
    }
  },

  async cambiarActivoLibro({ libroId, activo }) {
    return sequelize.transaction(async (transaction) => {
      const options = { transaction };
      const libro = await libroRepository.findByIdForUpdate(libroId, options);
      if (!libro) throw new NotFoundError(`El libro indicado (ID: ${libroId}) no existe.`);
      return libroRepository.updateActivo(libroId, activo, options);
    });
  },

  async listarLibrosAdministracion(filtros) {
    return libroRepository.findAdminPage(filtros);
  },
};
