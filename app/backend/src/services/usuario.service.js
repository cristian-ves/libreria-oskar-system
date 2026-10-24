const usuarioRepository = require('../repositories/usuario.repository');
const { sequelize } = require('../models');
const bcrypt = require('bcryptjs');
const { validarPassword } = require('../utils/passwordPolicy');
const { esUuid } = require('../utils/uuid');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

const ROLES_PERMITIDOS = ['Administrador', 'Empleado'];
const normalizarEmail = (email) => typeof email === 'string' ? email.trim().toLowerCase() : '';
const validarEmail = (email) => {
  if (!email || email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('El correo electrónico debe ser válido.');
};
const validarId = (id) => { if (!esUuid(id)) throw new ValidationError('El identificador debe ser un UUID válido.'); };
const validarRol = async (nombre, transaction) => {
  if (!ROLES_PERMITIDOS.includes(nombre)) throw new ValidationError('El rol debe ser Administrador o Empleado.');
  const rol = await usuarioRepository.findRoleByName(nombre, { transaction });
  if (!rol) throw new ValidationError('El rol indicado no existe o no está permitido.');
  return rol;
};

class UsuarioService {
  /**
   * Devuelve todos los usuarios activos con su rol, sin credenciales sensibles.
   * Delega en el método específico del repositorio.
   * @returns {Promise<Array<{ id: string, nombre_completo: string, email: string, rol_nombre: string|null }>>}
   */
  async listarActivosConRol() {
    return usuarioRepository.findActivosConRol();
  }

  async listar({ incluirInactivos = false } = {}) {
    return incluirInactivos ? usuarioRepository.findConRol({ incluirInactivos: true }) : usuarioRepository.findActivosConRol();
  }

  async crear({ nombre_completo, email, password, rol, ...ignored }) {
    const nombre = typeof nombre_completo === 'string' ? nombre_completo.trim() : '';
    if (!nombre || nombre.length > 150) throw new ValidationError('El nombre completo es obligatorio y no debe superar 150 caracteres.');
    const correo = normalizarEmail(email);
    validarEmail(correo);
    validarPassword(password);
    return sequelize.transaction(async (transaction) => {
      await usuarioRepository.lockRoles(transaction);
      const rolRecord = await validarRol(rol, transaction);
      if (await usuarioRepository.emailExists(correo, { transaction })) throw new ConflictError('Ya existe un usuario con ese correo electrónico.');
      const password_hash = await bcrypt.hash(password, 10);
      return usuarioRepository.create({ nombre_completo: nombre, email: correo, password_hash, rol_id: rolRecord.id, activo: true }, { transaction });
    });
  }

  async actualizar(id, data, actorId) {
    validarId(id);
    id = id.toLowerCase();
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new ValidationError('Los datos enviados no son válidos.');
    const allowed = ['nombre_completo', 'email', 'rol', 'activo'];
    if (Object.keys(data).some((key) => !allowed.includes(key))) throw new ValidationError('Se enviaron campos no permitidos.');
    return sequelize.transaction(async (transaction) => {
      await usuarioRepository.lockRoles(transaction);
      const usuario = await usuarioRepository.findByIdForUpdate(id, transaction);
      if (!usuario) throw new NotFoundError('Usuario no encontrado.');
      const changes = {};
      if ('nombre_completo' in data) {
        const value = typeof data.nombre_completo === 'string' ? data.nombre_completo.trim() : '';
        if (!value || value.length > 150) throw new ValidationError('El nombre completo es obligatorio y no debe superar 150 caracteres.');
        changes.nombre_completo = value;
      }
      if ('email' in data) {
        const email = normalizarEmail(data.email); validarEmail(email);
        if (await usuarioRepository.emailExists(email, { excludeId: id, transaction })) throw new ConflictError('Ya existe un usuario con ese correo electrónico.');
        changes.email = email;
      }
      if ('rol' in data) {
        const rol = await validarRol(data.rol, transaction);
        const actual = await usuarioRepository.findById(id, { transaction });
        if (id === actorId && actual?.rol_nombre === 'Administrador' && data.rol !== 'Administrador') throw new ValidationError('No puede quitarse su propio rol de Administrador.');
        changes.rol_id = rol.id;
      }
      if ('activo' in data) {
        if (typeof data.activo !== 'boolean') throw new ValidationError('El campo activo debe ser booleano.');
        if (id === actorId && !data.activo) throw new ValidationError('No puede desactivar su propia cuenta.');
        changes.activo = data.activo;
      }
      await this._protegerUltimoAdmin(usuario, changes, transaction);
      await usuario.update(changes, { transaction });
      return { id: usuario.id, rol_id: usuario.rol_id, nombre_completo: usuario.nombre_completo, email: usuario.email, activo: usuario.activo };
    });
  }

  async cambiarActivo(id, activo, actorId) {
    validarId(id);
    id = id.toLowerCase();
    if (typeof activo !== 'boolean') throw new ValidationError('El campo activo debe ser booleano.');
    return sequelize.transaction(async (transaction) => {
      await usuarioRepository.lockRoles(transaction);
      const usuario = await usuarioRepository.findByIdForUpdate(id, transaction);
      if (!usuario) throw new NotFoundError('Usuario no encontrado.');
      const actual = await usuarioRepository.findById(id, { transaction });
      if (id === actorId && !activo) throw new ValidationError('No puede desactivar su propia cuenta.');
      await this._protegerUltimoAdmin(usuario, { activo }, transaction, actual.rol_nombre);
      await usuario.update({ activo }, { transaction });
      return { id: usuario.id, activo: usuario.activo };
    });
  }

  async _protegerUltimoAdmin(usuario, changes, transaction, rolActual) {
    const actual = rolActual || (await usuarioRepository.findById(usuario.id, { transaction }))?.rol_nombre;
    const sigueAdminActivo = (changes.rol_id === undefined ? actual === 'Administrador' :
      (await usuarioRepository.findRoleByName('Administrador', { transaction }))?.id === changes.rol_id) &&
      (changes.activo === undefined ? usuario.activo : changes.activo);
    if (actual === 'Administrador' && usuario.activo && !sigueAdminActivo && await usuarioRepository.countActiveAdministrators(transaction) <= 1) {
      throw new ConflictError('Debe permanecer al menos un Administrador activo.');
    }
  }
}

module.exports = new UsuarioService();
