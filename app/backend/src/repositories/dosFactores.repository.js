const { Usuario, Rol, CodigoRespaldo, sequelize, Sequelize } = require('../models');

const { Op } = Sequelize;
const conTx = (options) => (options?.transaction ? { transaction: options.transaction } : {});

// Único repositorio que consulta dos_factores_secreto en la BD. El estado de bloqueo se calcula con la hora de la BD.
const ATRIBUTOS_ESTADO = [
  'id', 'nombre_completo', 'email', 'activo', 'dos_factores_activo', 'dos_factores_secreto',
  'dos_factores_intentos', 'dos_factores_ultimo_paso',
  [sequelize.literal('COALESCE("Usuario"."dos_factores_bloqueado_hasta" > CURRENT_TIMESTAMP, false)'), 'bloqueado'],
];

const REINICIO_INTENTOS = { dos_factores_intentos: 0, dos_factores_bloqueado_hasta: null };

class DosFactoresRepository {
  /**
   * Estado 2FA del usuario con rol y bandera `bloqueado`. Con `lock: true` bloquea la fila (FOR UPDATE).
   * @returns {Promise<Object|null>} JSON plano; `dos_factores_ultimo_paso` como número o null.
   */
  async obtenerEstado(id, options = {}) {
    const usuario = await Usuario.findByPk(id, {
      attributes: ATRIBUTOS_ESTADO,
      include: [{ model: Rol, as: 'rol', attributes: ['nombre'] }],
      ...conTx(options),
      ...(options.lock && options.transaction ? { lock: { level: options.transaction.LOCK.UPDATE, of: Usuario } } : {}),
    });
    if (!usuario) return null;
    const plain = usuario.get({ plain: true });
    plain.rol_nombre = plain.rol ? plain.rol.nombre : null;
    plain.bloqueado = plain.bloqueado === true;
    plain.dos_factores_ultimo_paso = plain.dos_factores_ultimo_paso === null ? null : Number(plain.dos_factores_ultimo_paso);
    delete plain.rol;
    return plain;
  }

  /** Id del usuario por email (sin distinguir mayúsculas), o null. */
  async buscarIdPorEmail(email) {
    if (typeof email !== 'string' || !email.trim()) return null;
    const usuario = await Usuario.findOne({
      attributes: ['id'],
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), email.trim().toLowerCase()),
    });
    return usuario ? usuario.id : null;
  }

  /** Guarda un secreto pendiente (activo=false) solo si el 2FA no está activo. @returns {Promise<boolean>} */
  async guardarSecretoPendiente(id, secretoCifrado) {
    const [filas] = await Usuario.update(
      { dos_factores_secreto: secretoCifrado, dos_factores_activo: false, dos_factores_ultimo_paso: null },
      { where: { id, dos_factores_activo: false } }
    );
    return filas === 1;
  }

  /**
   * Anti-reutilización atómica: acepta `paso` solo si es estrictamente mayor que el último
   * aceptado, y en la misma sentencia reinicia intentos y bloqueo. `extra` añade columnas.
   * @returns {Promise<boolean>} true si esta llamada reclamó el paso.
   */
  async reclamarPaso(id, paso, options = {}) {
    const [filas] = await Usuario.update(
      { dos_factores_ultimo_paso: paso, ...REINICIO_INTENTOS, ...(options.extra || {}) },
      {
        where: {
          id,
          ...(options.where || {}),
          [Op.or]: [{ dos_factores_ultimo_paso: null }, { dos_factores_ultimo_paso: { [Op.lt]: paso } }],
        },
        ...conTx(options),
      }
    );
    return filas === 1;
  }

  /**
   * Reserva un intento ANTES de verificar el código, en una sola sentencia sin transacción
   * (se confirma aunque la operación falle). Solo actúa si no hay bloqueo vigente (hora de la BD);
   * al llegar a `maxIntentos` fija el bloqueo y reinicia el contador. En el SET, las columnas
   * referidas valen lo ANTERIOR a la actualización.
   * @returns {Promise<{ permitido: boolean, bloqueadoAhora: boolean }>}
   */
  async reservarIntento(id, maxIntentos, bloqueoMinutos) {
    const max = Number.parseInt(maxIntentos, 10);
    const minutos = Number.parseInt(bloqueoMinutos, 10);
    const alcanza = `"dos_factores_intentos" + 1 >= ${max}`;
    const [, filas] = await Usuario.update(
      {
        dos_factores_intentos: sequelize.literal(`CASE WHEN ${alcanza} THEN 0 ELSE "dos_factores_intentos" + 1 END`),
        dos_factores_bloqueado_hasta: sequelize.literal(
          `CASE WHEN ${alcanza} THEN CURRENT_TIMESTAMP + make_interval(mins => ${minutos}) ELSE "dos_factores_bloqueado_hasta" END`
        ),
      },
      {
        where: {
          id,
          [Op.or]: [
            { dos_factores_bloqueado_hasta: null },
            { dos_factores_bloqueado_hasta: { [Op.lte]: sequelize.literal('CURRENT_TIMESTAMP') } },
          ],
        },
        returning: ['dos_factores_intentos'],
      }
    );
    if (!filas[0]) return { permitido: false, bloqueadoAhora: false };
    return { permitido: true, bloqueadoAhora: filas[0].dos_factores_intentos === 0 };
  }

  async reiniciarIntentos(id) {
    await Usuario.update(REINICIO_INTENTOS, { where: { id } });
  }

  /** Consumo atómico de un código de respaldo. @returns {Promise<boolean>} */
  async consumirRespaldo(usuarioId, codigoHash) {
    const [filas] = await CodigoRespaldo.update(
      { usado_en: sequelize.literal('CURRENT_TIMESTAMP') },
      { where: { usuario_id: usuarioId, codigo_hash: codigoHash, usado_en: null } }
    );
    return filas === 1;
  }

  /** Reemplaza el conjunto completo de códigos (usar dentro de una transacción). */
  async reemplazarRespaldos(usuarioId, hashes, options = {}) {
    await CodigoRespaldo.destroy({ where: { usuario_id: usuarioId }, ...conTx(options) });
    await CodigoRespaldo.bulkCreate(
      hashes.map((codigo_hash) => ({ usuario_id: usuarioId, codigo_hash })),
      conTx(options)
    );
  }

  async contarRespaldosRestantes(usuarioId) {
    return CodigoRespaldo.count({ where: { usuario_id: usuarioId, usado_en: null } });
  }

  /** Borra secreto y códigos y reinicia contador, bloqueo y último paso. @returns {Promise<boolean>} */
  async restablecer(id, options = {}) {
    const [filas] = await Usuario.update(
      { dos_factores_secreto: null, dos_factores_activo: false, dos_factores_ultimo_paso: null, ...REINICIO_INTENTOS },
      { where: { id }, ...conTx(options) }
    );
    await CodigoRespaldo.destroy({ where: { usuario_id: id }, ...conTx(options) });
    return filas === 1;
  }
}

module.exports = new DosFactoresRepository();
