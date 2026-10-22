const { sequelize, Bodega, Categoria } = require('../../models');
const libroRepository = require('../../repositories/libro.repository');
const inventarioRepository = require('../../repositories/inventario.repository');
const googleBooksService = require('../googleBooks.service');
const { NotFoundError, ConflictError } = require('../../utils/errors');

// Los métodos usan `this` (fachada LibroService) para conservar la resolución dinámica
// de _upsertAutor/_upsertEditorial/_crearMovimientoIngreso y su parcheo en pruebas.
module.exports = {
  /**
   * Registra un libro manualmente en una sola transacción ACID.
   * Aplica regla de precio según rol: Administrador guarda el precio recibido,
   * Empleado guarda 0 y devuelve precio_pendiente = true.
   *
   * @param {{
   *   isbn?: string,
   *   titulo: string,
   *   autor: string,
   *   editorial?: string,
   *   categoriaId: string,
   *   resena: string,
   *   imagenUrl?: string,
   *   precio?: number,
   *   cantidad: number,
   *   stockMinimo?: number,
   *   bodegaId: string,
   *   usuarioId: string,
   *   usuarioRol: string
   * }} params
   */
  async registrarLibro({
    isbn,
    titulo,
    autor,
    editorial,
    categoriaId,
    resena,
    imagenUrl,
    precio,
    cantidad,
    stockMinimo,
    bodegaId,
    usuarioId,
    usuarioRol,
  }) {
    const cleanIsbn = isbn && isbn.trim() ? googleBooksService.normalizarIsbn(isbn) : null;
    const smNum = stockMinimo !== undefined && stockMinimo !== null && stockMinimo !== '' ? Number(stockMinimo) : 5;
    const esAdmin = usuarioRol === 'Administrador';
    const precioFinal = esAdmin ? (parseFloat(precio) >= 0 ? parseFloat(precio) : 0) : 0;
    const precioPendiente = !esAdmin;

    return await sequelize.transaction(async (transaction) => {
      const txOptions = { transaction };
      // Validar bodega
      const bodegaCheck = await Bodega.findByPk(bodegaId, { attributes: ['id'], transaction });
      if (!bodegaCheck) {
        throw new NotFoundError(`La bodega indicada (ID: ${bodegaId}) no existe.`);
      }

      // Validar categoría si viene
      if (categoriaId) {
        const catCheck = await Categoria.findByPk(categoriaId, { attributes: ['id'], transaction });
        if (!catCheck) {
          throw new NotFoundError(`La categoría indicada (ID: ${categoriaId}) no existe.`);
        }
      }

      // Verificar ISBN duplicado si viene
      if (cleanIsbn) {
        const existente = await libroRepository.findByIsbn(cleanIsbn, txOptions);
        if (existente) {
          throw new ConflictError(`Ya existe un libro registrado con el ISBN ${cleanIsbn}.`);
        }
      }

      // Upsert de autor (solo si viene nombre no vacío)
      let autorId = null;
      if (autor && autor.trim()) {
        const autorRec = await this._upsertAutor(transaction, {
          nombre: autor.trim(),
          biografia: null,
        });
        autorId = autorRec.id;
      }

      // Upsert de editorial (solo si viene nombre no vacío)
      let editorialId = null;
      if (editorial && editorial.trim()) {
        const editorialRec = await this._upsertEditorial(transaction, {
          nombre: editorial.trim(),
          pais: null,
        });
        editorialId = editorialRec.id;
      }

      // Crear libro (INSERT simple, sin ON CONFLICT)
      let libro;
      try {
        libro = await libroRepository.create(txOptions, {
          autor_id: autorId,
          editorial_id: editorialId,
          categoria_id: categoriaId || null,
          titulo,
          isbn: cleanIsbn,
          resena,
          imagen_url: imagenUrl || null,
          precio: precioFinal,
          activo: true,
        });
      } catch (err) {
        // Capturar unique_violation de Postgres (isbn duplicado a nivel BD)
        if ((err.code || err.original?.code || err.parent?.code) === ConflictError.PG_UNIQUE_VIOLATION) {
          throw new ConflictError(`Ya existe un libro registrado con el ISBN ${cleanIsbn}.`);
        }
        throw err;
      }

      // Crear o recuperar inventario con stock_minimo
      const inventario = await inventarioRepository.findOrCreate(txOptions, libro.id, bodegaId, smNum);

      // Si findOrCreate retornó un registro existente, actualizar stock_minimo
      await inventarioRepository.setStockMinimo(txOptions, inventario.id, smNum);

      // Crear movimiento Ingreso
      const { movimiento, inventarioActualizado } = await this._crearMovimientoIngreso(transaction, {
        inventarioId: inventario.id,
        usuarioId,
        cantidad: Number(cantidad),
        motivoDetalle: 'Registro de libro nuevo',
      });

      return {
        libro: {
          id: libro.id,
          titulo: libro.titulo,
          isbn: libro.isbn,
          resena: libro.resena,
          imagen_url: libro.imagen_url,
          precio: parseFloat(libro.precio) || 0,
          activo: libro.activo,
        },
        inventario: {
          id: inventarioActualizado.id,
          bodega_id: bodegaId,
          stock_actual: inventarioActualizado.stock_actual,
          stock_minimo: inventarioActualizado.stock_minimo,
        },
        movimiento: {
          id: movimiento.id,
          tipo: 'Ingreso',
          cantidad: movimiento.cantidad,
          motivo: movimiento.motivo_detalle,
          fecha_movimiento: movimiento.fecha_movimiento,
        },
        precio_pendiente: precioPendiente,
      };
    });
  },
};
