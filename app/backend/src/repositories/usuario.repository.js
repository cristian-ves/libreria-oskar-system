const { Usuario, Rol, sequelize } = require('../models');

class UsuarioRepository {
  /**
   * Busca un usuario por su dirección de correo electrónico (case-insensitive),
   * incluyendo su rol asociado y campos requeridos para autenticación.
   * 
   * @param {string} email
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
   * @returns {Promise<Object|null>} Objeto plano con datos de usuario y rol_nombre.
   */
  async findByEmail(email, options = {}) {
    if (!email || typeof email !== 'string' || !email.trim()) {
      return null;
    }

    const cleanEmail = email.trim();

    const queryOptions = {
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('Usuario.email')),
        cleanEmail.toLowerCase()
      ),
      include: [
        {
          model: Rol,
          as: 'rol',
          attributes: ['id', 'nombre'],
        },
      ],
      attributes: [
        'id',
        'rol_id',
        'nombre_completo',
        'email',
        'password_hash',
        'dos_factores_activo',
        'activo',
        'creado_en',
        'actualizado_en',
      ],
    };

    if (options?.transaction) {
      queryOptions.transaction = options.transaction;
    }

    const usuario = await Usuario.findOne(queryOptions);
    if (!usuario) {
      return null;
    }

    const plain = usuario.get({ plain: true });
    plain.rol_nombre = plain.rol ? plain.rol.nombre : null;
    return plain;
  }

  /**
   * Busca un usuario por su identificador único (UUID),
   * incluyendo su rol asociado y datos para verificación de estado y permisos.
   * 
   * @param {string} id
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
   * @returns {Promise<Object|null>} Objeto plano con datos de usuario y rol_nombre.
   */
  async findById(id, options = {}) {
    if (!id) {
      return null;
    }

    const queryOptions = {
      include: [
        {
          model: Rol,
          as: 'rol',
          attributes: ['id', 'nombre'],
        },
      ],
      attributes: [
        'id',
        'rol_id',
        'nombre_completo',
        'email',
        'dos_factores_activo',
        'activo',
        'creado_en',
        'actualizado_en',
      ],
    };

    if (options?.transaction) {
      queryOptions.transaction = options.transaction;
    }

    const usuario = await Usuario.findByPk(id, queryOptions);
    if (!usuario) {
      return null;
    }

    const plain = usuario.get({ plain: true });
    plain.rol_nombre = plain.rol ? plain.rol.nombre : null;
    return plain;
  }

  /**
   * Obtiene todos los usuarios del sistema sin exponer credenciales sensibles.
   * @param {object} [options]
   * @returns {Promise<Array<Object>>}
   */
  async findAll(options = {}) {
    const queryOptions = {
      include: [
        {
          model: Rol,
          as: 'rol',
          attributes: ['id', 'nombre'],
        },
      ],
      attributes: [
        'id',
        'rol_id',
        'nombre_completo',
        'email',
        'dos_factores_activo',
        'activo',
        'creado_en',
        'actualizado_en',
      ],
      order: [['nombre_completo', 'ASC']],
      ...(options && options.transaction ? { transaction: options.transaction } : {}),
    };

    const usuarios = await Usuario.findAll(queryOptions);
    return usuarios.map((u) => {
      const plain = u.get({ plain: true });
      plain.rol_nombre = plain.rol ? plain.rol.nombre : null;
      return plain;
    });
  }

  /**
   * Crea un nuevo usuario en la base de datos con Sequelize.
   * @param {object} userData
   * @param {object} [options]
   * @returns {Promise<Object>}
   */
  async create(userData, options = {}) {
    const usuario = await Usuario.create(
      userData,
      options && options.transaction ? { transaction: options.transaction } : {}
    );
    const plain = usuario.get({ plain: true });
    delete plain.password_hash;
    delete plain.dos_factores_secreto;
    delete plain.token_recuperacion;
    return plain;
  }

  /**
   * Actualiza los datos de un usuario por su ID.
   * @param {string} id
   * @param {object} updateData
   * @param {object} [options]
   * @returns {Promise<Object|null>}
   */
  async update(id, updateData, options = {}) {
    const txOption = options && options.transaction ? { transaction: options.transaction } : {};
    const usuario = await Usuario.findByPk(id, txOption);
    if (!usuario) {
      return null;
    }
    await usuario.update(updateData, txOption);
    const plain = usuario.get({ plain: true });
    delete plain.password_hash;
    delete plain.dos_factores_secreto;
    delete plain.token_recuperacion;
    return plain;
  }
  /**
   * Obtiene todos los usuarios activos con su rol para el endpoint GET /api/usuarios.
   * Query copiada exactamente del handler inline original en routes/index.js.
   * No expone credenciales sensibles (no incluye password_hash, dos_factores_secreto, etc.).
   *
   * @returns {Promise<Array<{ id: string, nombre_completo: string, email: string, rol_nombre: string|null }>>}
   */
  async findActivosConRol() {
    const usuarios = await Usuario.findAll({
      attributes: ['id', 'nombre_completo', 'email'],
      where: { activo: true },
      include: [{
        model: Rol,
        as: 'rol',
        attributes: ['nombre'],
        required: true,
      }],
      order: [['nombre_completo', 'ASC']],
    });

    return usuarios.map((usuario) => {
      const plain = usuario.get({ plain: true });
      return {
        id: plain.id,
        nombre_completo: plain.nombre_completo,
        email: plain.email,
        rol_nombre: plain.rol?.nombre ?? null,
      };
    });
  }
}

module.exports = new UsuarioRepository();
