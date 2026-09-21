const db = require('../config/db');
const libroRepository = require('../repositories/libro.repository');
const autorRepository = require('../repositories/autor.repository');
const editorialRepository = require('../repositories/editorial.repository');
const inventarioRepository = require('../repositories/inventario.repository');
const movimientoRepository = require('../repositories/movimiento.repository');
const googleBooksService = require('./googleBooks.service');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

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

  // ---------------------------------------------------------------------------
  // Helper privado: crea un movimiento de tipo Ingreso dentro de una transacción
  // ---------------------------------------------------------------------------

  /**
   * @private
   * Asegura el tipo Ingreso, inserta el movimiento y retorna inventario actualizado.
   * @param {import('pg').PoolClient} client
   * @param {{ inventarioId: string, usuarioId: string, cantidad: number, motivoDetalle: string }} params
   */
  async _crearMovimientoIngreso(client, { inventarioId, usuarioId, cantidad, motivoDetalle }) {
    let tipoMovimiento = await movimientoRepository.getTipoMovimientoByName('Ingreso', client);
    if (!tipoMovimiento) {
      tipoMovimiento = await movimientoRepository.ensureTipoMovimiento(
        'Ingreso',
        'Entrada de stock por compras de mercancía o transferencias.',
        client
      );
    }

    const movimiento = await movimientoRepository.createMovimiento(client, {
      inventarioId,
      usuarioId,
      tipoMovimientoId: tipoMovimiento.id,
      cantidad,
      motivoDetalle,
    });

    const inventarioActualizado = await inventarioRepository.findById(inventarioId, client);

    return { movimiento, inventarioActualizado };
  }

  // ---------------------------------------------------------------------------
  // 1. POST /api/libros/consultar
  // ---------------------------------------------------------------------------

  /**
   * Consulta si un libro existe localmente por ISBN.
   * Si existe devuelve { existe: true, libro, inventarios }.
   * Si no existe consulta Google Books y devuelve { existe: false, sugerencia }.
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
      const inventarios = await inventarioRepository.findByLibroId(libro.id);
      return { existe: true, libro, inventarios };
    }

    // No existe localmente → consultar API sin insertar nada
    let sugerencia = null;
    try {
      const bookData = await googleBooksService.buscarPorIsbn(cleanIsbn);
      if (bookData) {
        sugerencia = {
          isbn: bookData.isbn,
          titulo: bookData.titulo,
          autor: bookData.autor,
          editorial: bookData.editorial,
          resena: bookData.resena,
          imagen_url: bookData.imagen_url,
          fuente: bookData.fuente,
          // precio excluido intencionalmente
        };
      }
    } catch {
      // Fallo de API externa → sugerencia queda null, el frontend muestra formulario manual
    }

    return { existe: false, sugerencia };
  }

  // ---------------------------------------------------------------------------
  // 2. POST /api/libros/registrar
  // ---------------------------------------------------------------------------

  /**
   * Registra un libro manualmente en una sola transacción ACID.
   * Aplica regla de precio según rol: Administrador guarda el precio recibido,
   * Empleado guarda 0 y devuelve precio_pendiente = true.
   *
   * @param {{
   *   isbn?: string,
   *   titulo: string,
   *   autor?: string,
   *   editorial?: string,
   *   categoriaId?: string,
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

    return await db.withTransaction(async (client) => {
      // Validar bodega
      const bodegaCheck = await client.query('SELECT id FROM bodegas WHERE id = $1', [bodegaId]);
      if (bodegaCheck.rowCount === 0) {
        throw new NotFoundError(`La bodega indicada (ID: ${bodegaId}) no existe.`);
      }

      // Validar categoría si viene
      if (categoriaId) {
        const catCheck = await client.query('SELECT id FROM categorias WHERE id = $1', [categoriaId]);
        if (catCheck.rowCount === 0) {
          throw new NotFoundError(`La categoría indicada (ID: ${categoriaId}) no existe.`);
        }
      }

      // Verificar ISBN duplicado si viene
      if (cleanIsbn) {
        const existente = await libroRepository.findByIsbn(cleanIsbn, client);
        if (existente) {
          throw new ConflictError(`Ya existe un libro registrado con el ISBN ${cleanIsbn}.`);
        }
      }

      // Upsert de autor (solo si viene nombre no vacío)
      let autorId = null;
      if (autor && autor.trim()) {
        const autorRec = await autorRepository.upsert(client, {
          nombre: autor.trim(),
          biografia: null,
        });
        autorId = autorRec.id;
      }

      // Upsert de editorial (solo si viene nombre no vacío)
      let editorialId = null;
      if (editorial && editorial.trim()) {
        const editorialRec = await editorialRepository.upsert(client, {
          nombre: editorial.trim(),
          pais: null,
        });
        editorialId = editorialRec.id;
      }

      // Crear libro (INSERT simple, sin ON CONFLICT)
      let libro;
      try {
        libro = await libroRepository.create(client, {
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
        if (err.code === ConflictError.PG_UNIQUE_VIOLATION) {
          throw new ConflictError(`Ya existe un libro registrado con el ISBN ${cleanIsbn}.`);
        }
        throw err;
      }

      // Crear o recuperar inventario con stock_minimo
      const inventario = await inventarioRepository.findOrCreate(client, libro.id, bodegaId, smNum);

      // Si findOrCreate retornó un registro existente, actualizar stock_minimo
      await inventarioRepository.setStockMinimo(client, inventario.id, smNum);

      // Crear movimiento Ingreso
      const { movimiento, inventarioActualizado } = await this._crearMovimientoIngreso(client, {
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
  }

  // ---------------------------------------------------------------------------
  // 3. POST /api/libros/:id/ingreso
  // ---------------------------------------------------------------------------

  /**
   * Registra un ingreso de mercancía para un libro ya existente.
   *
   * @param {{
   *   libroId: string,
   *   bodegaId: string,
   *   cantidad: number,
   *   usuarioId: string
   * }} params
   */
  async ingresoLibro({ libroId, bodegaId, cantidad, usuarioId }) {
    return await db.withTransaction(async (client) => {
      // Validar libro
      const libro = await libroRepository.findById(libroId, client);
      if (!libro) {
        throw new NotFoundError(`El libro con ID ${libroId} no existe.`);
      }

      // Validar bodega
      const bodegaCheck = await client.query('SELECT id FROM bodegas WHERE id = $1', [bodegaId]);
      if (bodegaCheck.rowCount === 0) {
        throw new NotFoundError(`La bodega indicada (ID: ${bodegaId}) no existe.`);
      }

      // Obtener o crear inventario
      const inventario = await inventarioRepository.findOrCreate(client, libroId, bodegaId);

      // Crear movimiento Ingreso
      const { movimiento, inventarioActualizado } = await this._crearMovimientoIngreso(client, {
        inventarioId: inventario.id,
        usuarioId,
        cantidad: Number(cantidad),
        motivoDetalle: 'Ingreso de mercancía',
      });

      return {
        libro: {
          id: libro.id,
          titulo: libro.titulo,
          isbn: libro.isbn,
          imagen_url: libro.imagen_url,
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
      };
    });
  }
}

module.exports = new LibroService();

