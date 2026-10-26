const { sequelize } = require('../models');
const sucursalRepository = require('../repositories/sucursal.repository');
const bodegaRepository = require('../repositories/bodega.repository');
const { esUuid } = require('../utils/uuid');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

function texto(valor, campo, max, obligatorio = false) {
  if (valor === undefined && !obligatorio) return undefined;
  if (valor === null && !obligatorio) return null;
  if (typeof valor !== 'string') throw new ValidationError(`El campo ${campo} debe ser texto.`);
  const limpio = valor.trim();
  if (obligatorio && !limpio) throw new ValidationError(`El campo ${campo} es obligatorio.`);
  if (limpio.length > max) throw new ValidationError(`El campo ${campo} no puede exceder ${max} caracteres.`);
  return limpio || null;
}

function validarActivo(valor) {
  if (valor === undefined) return undefined;
  if (valor === true || valor === 'true') return true;
  if (valor === false || valor === 'false') return false;
  throw new ValidationError('El filtro activo debe ser true o false.');
}

function validarId(id, tipo) {
  if (!esUuid(id)) throw new ValidationError(`El identificador de ${tipo} no es un UUID válido.`);
}

async function bloquearNombre(nombre, transaction) {
  // Lock transaccional por nombre normalizado: evita duplicados simultáneos
  // sin introducir índices que puedan fallar por datos históricos.
  await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:clave))', {
    replacements: { clave: `oskar:sucursal:${nombre.toLowerCase()}` }, transaction,
  });
}

class SucursalService {
  async listar({ activo, q = '' } = {}) {
    return sucursalRepository.findAll({ activo: validarActivo(activo), q: typeof q === 'string' ? q : '' });
  }

  async detalle(id) {
    validarId(id, 'sucursal');
    const fila = await sucursalRepository.findById(id);
    if (!fila) throw new NotFoundError('La sucursal indicada no existe.');
    return fila;
  }

  async bodegas(id, filtros = {}) {
    validarId(id, 'sucursal');
    const sucursal = await sucursalRepository.findById(id);
    if (!sucursal) throw new NotFoundError('La sucursal indicada no existe.');
    return bodegaRepository.findBySucursal(id, { activo: validarActivo(filtros.activo), q: filtros.q || '' });
  }

  async crear(payload = {}) {
    const nombre = texto(payload.nombre, 'nombre', 100, true);
    const direccion = texto(payload.direccion, 'dirección', 1000, true);
    const telefono = texto(payload.telefono, 'teléfono', 20);
    return sequelize.transaction(async (transaction) => {
      await bloquearNombre(nombre, transaction);
      if (await sucursalRepository.findByNombreNormalizado(nombre, { transaction })) {
        throw new ConflictError('Ya existe una sucursal con ese nombre.');
      }
      try {
        return await sucursalRepository.create({ nombre, direccion, telefono }, { transaction });
      } catch (error) {
        if ((error.original?.code || error.parent?.code || error.code) === ConflictError.PG_UNIQUE_VIOLATION) {
          throw new ConflictError('Ya existe una sucursal con ese nombre.');
        }
        throw error;
      }
    });
  }

  async actualizar(id, payload = {}) {
    validarId(id, 'sucursal');
    const datos = {};
    if (Object.hasOwn(payload, 'nombre')) datos.nombre = texto(payload.nombre, 'nombre', 100, true);
    if (Object.hasOwn(payload, 'direccion')) datos.direccion = texto(payload.direccion, 'dirección', 1000, true);
    if (Object.hasOwn(payload, 'telefono')) datos.telefono = texto(payload.telefono, 'teléfono', 20);
    if (!Object.keys(datos).length) throw new ValidationError('Indique al menos un campo para actualizar.');
    return sequelize.transaction(async (transaction) => {
      const existente = await sucursalRepository.findByIdForUpdate(id, { transaction });
      if (!existente) throw new NotFoundError('La sucursal indicada no existe.');
      if (datos.nombre) {
        const nombres = [...new Set([existente.nombre.trim().toLowerCase(), datos.nombre.toLowerCase()])].sort();
        for (const nombre of nombres) await bloquearNombre(nombre, transaction);
        if (await sucursalRepository.findByNombreNormalizado(datos.nombre, { excludeId: id, transaction })) {
          throw new ConflictError('Ya existe una sucursal con ese nombre.');
        }
      }
      return sucursalRepository.update(id, datos, { transaction });
    });
  }

  async cambiarActivo(id, activo) {
    validarId(id, 'sucursal');
    if (typeof activo !== 'boolean') throw new ValidationError('El campo activo debe ser booleano.');
    return sequelize.transaction(async (transaction) => {
      const sucursal = await sucursalRepository.findByIdForUpdate(id, { transaction });
      if (!sucursal) throw new NotFoundError('La sucursal indicada no existe.');
      const bodegas = await sucursalRepository.findBodegasForUpdate(id, transaction);
      if (!activo) {
        if (bodegas.some((bodega) => bodega.activo)) {
          throw new ConflictError('No se puede desactivar la sucursal mientras tenga bodegas activas.');
        }
        if (await sucursalRepository.contarStockPositivo(id, transaction)) {
          throw new ConflictError('No se puede desactivar la sucursal mientras conserve existencias pendientes.');
        }
      }
      return sucursalRepository.update(id, { activo }, { transaction });
    });
  }
}

module.exports = new SucursalService();
