const { sequelize, Bodega, Usuario } = require('../../models');
const libroRepository = require('../../repositories/libro.repository');
const inventarioRepository = require('../../repositories/inventario.repository');
const movimientoRepository = require('../../repositories/movimiento.repository');
const googleBooksService = require('../googleBooks.service');
const { ValidationError, NotFoundError, ConflictError } = require('../../utils/errors');

// Campos que una fuente externa puede rellenar con texto genérico, en el orden de `campos_faltantes`.
const CAMPOS_SUGERIBLES = ['titulo', 'autor', 'editorial', 'resena', 'imagen_url'];

// Los métodos usan `this` (fachada LibroService) para conservar la resolución dinámica
// de _upsertAutor/_upsertEditorial/_crearMovimientoIngreso y su parcheo en pruebas.
module.exports = {
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

    // Validar referencias antes de la consulta externa y repetir dentro de la
    // transacción para conservar la validación junto a las escrituras.
    const [bodegaPrevia, usuarioPrevio, libroPrevio] = await Promise.all([
      Bodega.findByPk(bodegaId, { attributes: ['id'] }),
      Usuario.findByPk(usuarioId, { attributes: ['id'] }),
      libroRepository.findByIsbn(cleanIsbn),
    ]);
    if (!bodegaPrevia) {
      throw new NotFoundError(`La bodega indicada (ID: ${bodegaId}) no existe.`);
    }
    if (!usuarioPrevio) {
      throw new NotFoundError(`El usuario indicado (ID: ${usuarioId}) no existe en el sistema.`);
    }
    if (libroPrevio && !libroPrevio.activo) {
      throw new ConflictError('No se pueden ingresar existencias de un libro inactivo.');
    }

    // Evitar mantener una transacción abierta durante solicitudes de red.
    const bookData = libroPrevio ? null : await googleBooksService.buscarPorIsbn(cleanIsbn);
    if (!libroPrevio && !bookData) {
      throw new NotFoundError(
        `El libro con ISBN ${cleanIsbn} no se encontró en el catálogo local ni en la API de Google Books.`
      );
    }

    return await sequelize.transaction(async (transaction) => {
      const txOptions = { transaction };
      // 1. Validar existencia de bodega
      const bodegaCheck = await Bodega.findByPk(bodegaId, { attributes: ['id', 'nombre'], transaction });
      if (!bodegaCheck) {
        throw new NotFoundError(`La bodega indicada (ID: ${bodegaId}) no existe.`);
      }

      // 2. Validar existencia de usuario que realiza la operación
      const usuarioCheck = await Usuario.findByPk(usuarioId, { attributes: ['id', 'nombre_completo'], transaction });
      if (!usuarioCheck) {
        throw new NotFoundError(`El usuario indicado (ID: ${usuarioId}) no existe en el sistema.`);
      }

      // Revalidar el ISBN dentro de la transacción para resolver carreras
      // ocurridas mientras se consultaban las fuentes bibliográficas.
      let libro = await libroRepository.findByIsbnForUpdate(cleanIsbn, txOptions);
      const libroExistentePrevio = !!libro;
      if (libro && !libro.activo) {
        throw new ConflictError('No se pueden ingresar existencias de un libro inactivo.');
      }

      // Registrar datos bibliográficos si sigue sin existir localmente.
      if (!libro) {
        const autor = await this._upsertAutor(transaction, {
          nombre: bookData.autor,
          biografia: `Autor registrado automáticamente a través del catálogo de ${bookData.fuente}.`,
        });

        const editorial = await this._upsertEditorial(transaction, {
          nombre: bookData.editorial,
          pais: 'Internacional',
        });

        libro = await libroRepository.upsert(txOptions, {
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
      const inventario = await inventarioRepository.findOrCreate(txOptions, libro.id, bodegaId);
      const stockAnterior = inventario.stock_actual;

      // 6. Obtener el ID del tipo de movimiento 'Ingreso'
      let tipoMovimiento = await movimientoRepository.getTipoMovimientoByName('Ingreso', txOptions);
      if (!tipoMovimiento) {
        tipoMovimiento = await movimientoRepository.ensureTipoMovimiento(
          'Ingreso',
          'Entrada de stock por compras de mercancía o transferencias.',
          txOptions
        );
      }

      // 7. Insertar el movimiento de inventario (cantidad: 1, tipo: 'Ingreso')
      // El trigger PL/pgSQL 'tg_movimientos_inventario_stock' se dispara automáticamente
      // actualizando el stock con SELECT ... FOR UPDATE sobre la fila de inventarios.
      const movimiento = await movimientoRepository.createMovimiento(txOptions, {
        inventarioId: inventario.id,
        usuarioId,
        tipoMovimientoId: tipoMovimiento.id,
        cantidad: 1,
        motivoDetalle: 'Ingreso atómico por escaneo de código de barras / ISBN',
      });

      // 8. Consultar el inventario actualizado por el trigger
      const inventarioActualizado = await inventarioRepository.findById(inventario.id, txOptions);

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
  },

  /**
   * Consulta si un libro existe localmente por ISBN.
   * Si existe devuelve { existe: true, libro, inventarios }.
   * Si no existe consulta Google Books y devuelve { existe: false, sugerencia }, donde los datos
   * que la fuente no aportó van vacíos y se listan en `sugerencia.campos_faltantes`.
   * Nunca lanza 404 ni 500 por ausencia del libro o fallo de la API externa.
   *
   * @param {{ isbn: string }} params
   */
  async consultarLibro({ isbn }) {
    const cleanIsbn = googleBooksService.normalizarIsbn(isbn);
    if (!cleanIsbn) {
      throw new ValidationError('El campo "isbn" es obligatorio y no puede estar vacío.');
    }

    // Buscar localmente
    const libro = await libroRepository.findByIsbn(cleanIsbn);

    if (libro) {
      if (!libro.activo) {
        throw new ConflictError('El libro está inactivo y no admite operaciones de ingreso.');
      }
      const inventarios = await inventarioRepository.findByLibroId(libro.id);
      return { existe: true, libro, inventarios };
    }

    // No existe localmente → consultar API sin insertar nada
    let sugerencia = null;
    try {
      const bookData = await googleBooksService.buscarPorIsbn(cleanIsbn);
      if (bookData) {
        // Objeto nuevo: bookData puede ser el del caché y no se debe mutar (ni su arreglo `relleno`).
        const relleno = Array.isArray(bookData.relleno) ? bookData.relleno : [];
        const vacio = (campo, valorVacio) => (relleno.includes(campo) ? valorVacio : bookData[campo]);
        sugerencia = {
          isbn: bookData.isbn,
          titulo: vacio('titulo', ''),
          autor: vacio('autor', ''),
          editorial: vacio('editorial', ''),
          resena: vacio('resena', ''),
          imagen_url: vacio('imagen_url', null),
          fuente: bookData.fuente,
          // Orden canónico; `categoria` siempre falta porque ninguna fuente la aporta.
          campos_faltantes: [...CAMPOS_SUGERIBLES.filter((c) => relleno.includes(c)), 'categoria'],
          // precio excluido intencionalmente
        };
      }
    } catch {
      // Fallo de API externa → sugerencia queda null, el frontend muestra formulario manual
    }

    return { existe: false, sugerencia };
  },
};
