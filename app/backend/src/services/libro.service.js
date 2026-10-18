const { sequelize, Bodega, Usuario, Categoria, Autor, Editorial } = require('../models');
const libroRepository = require('../repositories/libro.repository');
const inventarioRepository = require('../repositories/inventario.repository');
const movimientoRepository = require('../repositories/movimiento.repository');
const googleBooksService = require('./googleBooks.service');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

class LibroService {
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
  }

  async _upsertAutor(transaction, { nombre, biografia = null }) {
    return this._upsertMasterRecord(Autor, transaction, nombre, { biografia }, { biografia });
  }

  async _upsertEditorial(transaction, { nombre, pais = null }) {
    return this._upsertMasterRecord(Editorial, transaction, nombre, { pais }, { pais });
  }

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
      let libro = await libroRepository.findByIsbn(cleanIsbn, txOptions);
      const libroExistentePrevio = !!libro;

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
  }

  // ---------------------------------------------------------------------------
  // Helper privado: crea un movimiento de tipo Ingreso dentro de una transacción
  // ---------------------------------------------------------------------------

  /**
   * @private
   * Asegura el tipo Ingreso, inserta el movimiento y retorna inventario actualizado.
   * @param {import('sequelize').Transaction} transaction
   * @param {{ inventarioId: string, usuarioId: string, cantidad: number, motivoDetalle: string }} params
   */
  async _crearMovimientoIngreso(transaction, { inventarioId, usuarioId, cantidad, motivoDetalle }) {
    const txOptions = { transaction };
    let tipoMovimiento = await movimientoRepository.getTipoMovimientoByName('Ingreso', txOptions);
    if (!tipoMovimiento) {
      tipoMovimiento = await movimientoRepository.ensureTipoMovimiento(
        'Ingreso',
        'Entrada de stock por compras de mercancía o transferencias.',
        txOptions
      );
    }

    const movimiento = await movimientoRepository.createMovimiento(txOptions, {
      inventarioId,
      usuarioId,
      tipoMovimientoId: tipoMovimiento.id,
      cantidad,
      motivoDetalle,
    });

    const inventarioActualizado = await inventarioRepository.findById(inventarioId, txOptions);

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
    const cantidadNum = Number(cantidad);
    if (cantidad === undefined || cantidad === null || cantidad === '' ||
        !Number.isInteger(cantidadNum) || cantidadNum < 1) {
      throw new ValidationError('La cantidad debe ser un entero mayor o igual a 1.');
    }

    return await sequelize.transaction(async (transaction) => {
      const txOptions = { transaction };
      // Validar libro
      const libro = await libroRepository.findById(libroId, txOptions);
      if (!libro) {
        throw new NotFoundError(`El libro con ID ${libroId} no existe.`);
      }

      // Validar bodega
      const bodegaCheck = await Bodega.findByPk(bodegaId, { attributes: ['id'], transaction });
      if (!bodegaCheck) {
        throw new NotFoundError(`La bodega indicada (ID: ${bodegaId}) no existe.`);
      }

      // Obtener o crear inventario
      const inventario = await inventarioRepository.findOrCreate(txOptions, libroId, bodegaId);

      // Crear movimiento Ingreso
      const { movimiento, inventarioActualizado } = await this._crearMovimientoIngreso(transaction, {
        inventarioId: inventario.id,
        usuarioId,
        cantidad: cantidadNum,
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
