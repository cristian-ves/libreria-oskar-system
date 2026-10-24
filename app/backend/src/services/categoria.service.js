const categoriaRepository = require('../repositories/categoria.repository');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');
const { esUuid } = require('../utils/uuid');

function validarNombre(value) {
  if (typeof value !== 'string') throw new ValidationError('El nombre de la categoría es obligatorio.');
  const nombre = value.trim();
  if (!nombre) throw new ValidationError('El nombre de la categoría es obligatorio.');
  if (nombre.length > 100) throw new ValidationError('El nombre de la categoría no debe superar 100 caracteres.');
  return nombre;
}

function validarId(id) {
  if (!esUuid(id)) throw new ValidationError('El ID de la categoría debe ser un UUID válido.');
}

class CategoriaService {
  /**
   * Devuelve todas las categorías ordenadas ASC por nombre.
   * Delega en el método existente de categoriaRepository.
   * @returns {Promise<Array<{ id: string, nombre: string }>>}
   */
  async listar() {
    return categoriaRepository.findAll();
  }

  async listarAdministracion() {
    return categoriaRepository.findAllWithLibroCount();
  }

  async crear(data = {}) {
    const nombre = validarNombre(data.nombre);
    if (await categoriaRepository.findByNombre(nombre)) throw new ConflictError('Ya existe una categoría con ese nombre.');
    return categoriaRepository.create({ nombre });
  }

  async renombrar(id, data = {}) {
    validarId(id);
    id = id.toLowerCase();
    const actual = await categoriaRepository.findById(id);
    if (!actual) throw new NotFoundError('Categoría no encontrada.');
    const nombre = validarNombre(data.nombre);
    const duplicada = await categoriaRepository.findByNombre(nombre);
    if (duplicada && duplicada.id !== id) throw new ConflictError('Ya existe una categoría con ese nombre.');
    return categoriaRepository.updateNombre(id, nombre);
  }

  async eliminar(id) {
    validarId(id);
    id = id.toLowerCase();
    const actual = await categoriaRepository.findById(id);
    if (!actual) throw new NotFoundError('Categoría no encontrada.');
    const libros = await categoriaRepository.countLibros(id);
    if (libros > 0) throw new ConflictError(`No se puede eliminar la categoría porque tiene ${libros} libro${libros === 1 ? '' : 's'} asociado${libros === 1 ? '' : 's'}.`);
    await categoriaRepository.delete(id);
    return { id };
  }
}

module.exports = new CategoriaService();
