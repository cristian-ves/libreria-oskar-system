const db = require('../config/db');
const libroRepository = require('../repositories/libro.repository');
const autorRepository = require('../repositories/autor.repository');
const editorialRepository = require('../repositories/editorial.repository');
const inventarioRepository = require('../repositories/inventario.repository');
const movimientoRepository = require('../repositories/movimiento.repository');
const googleBooksService = require('./googleBooks.service');
const { ValidationError, NotFoundError } = require('../utils/errors');

class LibroService {
  /**
   * Procesa el escaneo de un código de barras / ISBN.
   * Si el libro no existe localmente, consulta la API externa de Google Books y registra
   * autor, editorial y libro de forma atómica usando ON CONFLICT.
   * Finalmente registra un movimiento de inventario de tipo 'Ingreso' con cantidad 1,
   * garantizando la transacción ACID con BEGIN y ROLLBACK.
   * 
   * @param {{
   *   isbn: string,
   *   bodegaId: string,
   *   usuarioId: string
   * }} params
   */
  async escanearLibro({ isbn, bodegaId, usuarioId }) {
    const cleanIsbn = googleBooksService.normalizarIsbn(isbn);
    if (!cleanIsbn) {
      throw new ValidationError('El código ISBN proporcionado es obligatorio y no puede estar vacío.');
    }

    if (!bodegaId) {
      throw new ValidationError('El identificador de la bodega (bodegaId) es obligatorio.');
    }

    if (!usuarioId) {
      throw new ValidationError('El identificador del usuario (usuarioId) es obligatorio.');
    }

    // Ejecución segura dentro de una transacción ACID
    return await db.withTransaction(async (client) => {
      // 1. Validar existencia de bodega
      const bodegaCheck = await client.query('SELECT id, nombre FROM bodegas WHERE id = $1', [bodegaId]);
      if (bodegaCheck.rowCount === 0) {
        throw new NotFoundError(`La bodega indicada (ID: ${bodegaId}) no existe.`);
      }

      // 2. Validar existencia de usuario que realiza la operación
      const usuarioCheck = await client.query('SELECT id, nombre_completo FROM usuarios WHERE id = $1', [usuarioId]);
      if (usuarioCheck.rowCount === 0) {
        throw new NotFoundError(`El usuario indicado (ID: ${usuarioId}) no existe en el sistema.`);
      }

      // 3. Verificar si el libro ya se encuentra registrado localmente
      let libro = await libroRepository.findByIsbn(cleanIsbn, client);
      const libroExistentePrevio = !!libro;

      // 4. Si no existe localmente, consultar la API de Google Books y crear registros maestros
      if (!libro) {
        const bookData = await googleBooksService.buscarPorIsbn(cleanIsbn);
        if (!bookData) {
          throw new NotFoundError(
            `El libro con ISBN ${cleanIsbn} no se encontró en el catálogo local ni en la API de Google Books.`
          );
        }

        // Registrar autor de forma atómica con ON CONFLICT
        const autor = await autorRepository.upsert(client, {
          nombre: bookData.autor,
          biografia: `Autor registrado automáticamente a través del catálogo de ${bookData.fuente}.`,
        });

        // Registrar editorial de forma atómica con ON CONFLICT
        const editorial = await editorialRepository.upsert(client, {
          nombre: bookData.editorial,
          pais: 'Internacional',
        });

        // Registrar libro de forma atómica con ON CONFLICT
        libro = await libroRepository.upsert(client, {
          autor_id: autor.id,
          editorial_id: editorial.id,
          titulo: bookData.titulo,
          isbn: cleanIsbn,
          resena: bookData.resena,
          imagen_url: bookData.imagen_url,
          precio: bookData.precio,
          activo: true,
        });

        // Asociar nombres de autor y editorial en la respuesta
        libro.autor_nombre = autor.nombre;
        libro.editorial_nombre = editorial.nombre;
      }

      // 5. Asegurar existencia del registro de inventario para este libro en la bodega especificada
      const inventario = await inventarioRepository.findOrCreate(client, libro.id, bodegaId);
      const stockAnterior = inventario.stock_actual;

      // 6. Obtener el ID del tipo de movimiento 'Ingreso'
      let tipoMovimiento = await movimientoRepository.getTipoMovimientoByName('Ingreso', client);
      if (!tipoMovimiento) {
        tipoMovimiento = await movimientoRepository.ensureTipoMovimiento(
          'Ingreso',
          'Entrada de stock por compras de mercancía o transferencias.',
          client
        );
      }

      // 7. Insertar el movimiento de inventario (cantidad: 1, tipo: 'Ingreso')
      // El trigger PL/pgSQL 'tg_movimientos_inventario_stock' se dispara automáticamente
      // actualizando el stock con SELECT ... FOR UPDATE sobre la fila de inventarios.
      const movimiento = await movimientoRepository.createMovimiento(client, {
        inventarioId: inventario.id,
        usuarioId,
        tipoMovimientoId: tipoMovimiento.id,
        cantidad: 1,
        motivoDetalle: 'Ingreso atómico por escaneo de código de barras / ISBN',
      });

      // 8. Consultar el inventario actualizado por el trigger
      const inventarioActualizado = await inventarioRepository.findById(inventario.id, client);

      return {
        mensaje: libroExistentePrevio
          ? 'Libro existente catalogado: se registró el ingreso de 1 unidad al inventario.'
          : 'Libro nuevo registrado desde API externa e ingresado exitosamente al inventario.',
        es_nuevo_en_catalogo: !libroExistentePrevio,
        libro: {
          id: libro.id,
          titulo: libro.titulo,
          isbn: libro.isbn,
          resena: libro.resena,
          imagen_url: libro.imagen_url,
          precio: parseFloat(libro.precio) || 0.00,
          autor: libro.autor_nombre || null,
          editorial: libro.editorial_nombre || null,
        },
        inventario: {
          id: inventario.id,
          bodega_id: bodegaId,
          stock_anterior: stockAnterior,
          stock_actual: inventarioActualizado.stock_actual,
        },
        movimiento: {
          id: movimiento.id,
          tipo: 'Ingreso',
          cantidad: movimiento.cantidad,
          motivo: movimiento.motivo_detalle,
          fecha_movimiento: movimiento.fecha_movimiento,
        },
      };
    });
  }
}

module.exports = new LibroService();
