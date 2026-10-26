const { sequelize } = require('../models');
const bodegaRepository = require('../repositories/bodega.repository');
const sucursalRepository = require('../repositories/sucursal.repository');
const { esUuid } = require('../utils/uuid');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

function nombre(valor) {
  if (typeof valor !== 'string' || !valor.trim()) throw new ValidationError('El nombre de la bodega es obligatorio.');
  const limpio = valor.trim();
  if (limpio.length > 100) throw new ValidationError('El nombre de la bodega no puede exceder 100 caracteres.');
  return limpio;
}

function descripcion(valor) {
  if (valor === undefined) return undefined;
  if (valor !== null && typeof valor !== 'string') throw new ValidationError('La descripción debe ser texto.');
  const limpio = typeof valor === 'string' ? valor.trim() : '';
  if (limpio.length > 5000) throw new ValidationError('La descripción no puede exceder 5000 caracteres.');
  return limpio || null;
}

function validarId(id, entidad) {
  if (!esUuid(id)) throw new ValidationError(`El identificador de ${entidad} no es un UUID válido.`);
}

async function lockSucursal(sucursalId, transaction) {
  const sucursal = await sucursalRepository.findByIdForUpdate(sucursalId, { transaction });
  if (!sucursal) throw new NotFoundError('La sucursal indicada no existe.');
  return sucursal;
}

class BodegaGestionService {
  async listarPorSucursal(sucursalId, filtros = {}) {
    validarId(sucursalId, 'sucursal');
    if (!await sucursalRepository.findById(sucursalId)) throw new NotFoundError('La sucursal indicada no existe.');
    const activo = filtros.activo === undefined ? undefined
      : filtros.activo === 'true' ? true : filtros.activo === 'false' ? false : null;
    if (activo === null) throw new ValidationError('El filtro activo debe ser true o false.');
    return bodegaRepository.findBySucursal(sucursalId, { activo, q: typeof filtros.q === 'string' ? filtros.q : '' });
  }

  async detalle(id) {
    validarId(id, 'bodega');
    const row = await bodegaRepository.findById(id);
    if (!row) throw new NotFoundError('La bodega indicada no existe.');
    return row;
  }

  async crear(sucursalId, payload = {}) {
    validarId(sucursalId, 'sucursal');
    const datos = { nombre: nombre(payload.nombre), descripcion: descripcion(payload.descripcion) ?? null };
    return sequelize.transaction(async (transaction) => {
      const sucursal = await lockSucursal(sucursalId, transaction);
      if (!sucursal.activo) throw new ConflictError('No se puede crear una bodega en una sucursal inactiva.');
      if (await bodegaRepository.findByNombreNormalizado(sucursalId, datos.nombre, { transaction })) {
        throw new ConflictError('Ya existe una bodega con ese nombre en la sucursal.');
      }
      try {
        return await bodegaRepository.create({ ...datos, sucursal_id: sucursalId, activo: true }, transaction);
      } catch (error) {
        if ((error.original?.code || error.parent?.code || error.code) === ConflictError.PG_UNIQUE_VIOLATION) {
          throw new ConflictError('Ya existe una bodega con ese nombre en la sucursal.');
        }
        throw error;
      }
    });
  }

  async actualizar(id, payload = {}) {
    validarId(id, 'bodega');
    const datos = {};
    if (Object.hasOwn(payload, 'nombre')) datos.nombre = nombre(payload.nombre);
    if (Object.hasOwn(payload, 'descripcion')) datos.descripcion = descripcion(payload.descripcion);
    const destinoId = payload.sucursal_id === undefined ? undefined : payload.sucursal_id;
    if (destinoId !== undefined) validarId(destinoId, 'sucursal');
    if (!Object.keys(datos).length && destinoId === undefined) throw new ValidationError('Indique campos para actualizar.');

    return sequelize.transaction(async (transaction) => {
      const origenId = await bodegaRepository.findSucursalId(id, transaction);
      if (!origenId) throw new NotFoundError('La bodega indicada no existe.');
      const ids = [...new Set([origenId, destinoId || origenId])].sort();
      const sucursales = new Map();
      for (const sucursalId of ids) sucursales.set(sucursalId, await lockSucursal(sucursalId, transaction));
      const bodega = await bodegaRepository.findByIdForUpdate(id, { transaction });
      if (!bodega) throw new NotFoundError('La bodega indicada no existe.');
      if (bodega.sucursal_id !== origenId) throw new ConflictError('La bodega cambió de sucursal durante la operación; vuelva a intentar.');
      const nuevaSucursalId = destinoId || origenId;
      if (destinoId && !sucursales.get(destinoId).activo) throw new ConflictError('La bodega debe asociarse a una sucursal activa.');

      if (nuevaSucursalId !== origenId) {
        const [inventarios, ventas] = await Promise.all([
          bodegaRepository.countInventarios(id, transaction),
          bodegaRepository.countVentas(id, transaction),
        ]);
        if (inventarios > 0 || ventas > 0) {
          throw new ConflictError('No se puede trasladar una bodega que tenga inventario o ventas históricas.');
        }
        datos.sucursal_id = nuevaSucursalId;
      }
      const nuevoNombre = datos.nombre || bodega.nombre;
      if (await bodegaRepository.findByNombreNormalizado(nuevaSucursalId, nuevoNombre, { excludeId: id, transaction })) {
        throw new ConflictError('Ya existe una bodega con ese nombre en la sucursal.');
      }
      try {
        return await bodegaRepository.update(id, datos, transaction);
      } catch (error) {
        if ((error.original?.code || error.parent?.code || error.code) === ConflictError.PG_UNIQUE_VIOLATION) {
          throw new ConflictError('Ya existe una bodega con ese nombre en la sucursal.');
        }
        throw error;
      }
    });
  }

  async cambiarActivo(id, activo) {
    validarId(id, 'bodega');
    if (typeof activo !== 'boolean') throw new ValidationError('El campo activo debe ser booleano.');
    return sequelize.transaction(async (transaction) => {
      const sucursalId = await bodegaRepository.findSucursalId(id, transaction);
      if (!sucursalId) throw new NotFoundError('La bodega indicada no existe.');
      const sucursal = await lockSucursal(sucursalId, transaction);
      const bodega = await bodegaRepository.findByIdForUpdate(id, { transaction });
      if (!bodega || bodega.sucursal_id !== sucursalId) throw new ConflictError('La bodega cambió durante la operación; vuelva a intentar.');
      if (activo && !sucursal.activo) throw new ConflictError('No se puede reactivar una bodega bajo una sucursal inactiva.');
      if (!activo && await bodegaRepository.countConStock(id, transaction)) {
        throw new ConflictError('No se puede desactivar la bodega mientras tenga existencias positivas.');
      }
      return bodegaRepository.update(id, { activo }, transaction);
    });
  }
}

module.exports = new BodegaGestionService();
