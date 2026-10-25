const { Op } = require('sequelize');
const { Usuario, sequelize } = require('../models');

// Único lugar que lee o escribe token_recuperacion y token_recuperacion_expira,
// y que escribe password_cambiada_en. Los vencimientos usan la hora de la BD.
const ahoraBd = () => sequelize.literal('CURRENT_TIMESTAMP');
const enMinutos = (minutos) => sequelize.literal(`CURRENT_TIMESTAMP + make_interval(mins => ${Number(minutos)})`);

class RecuperacionRepository {
  /**
   * Usuario activo por correo (sin distinguir mayúsculas). Solo los campos del correo.
   * @param {string} email
   * @returns {Promise<{ id: string, nombre_completo: string, email: string }|null>}
   */
  async buscarActivoPorEmail(email) {
    const usuario = await Usuario.findOne({
      where: {
        [Op.and]: [
          sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), email.toLowerCase()),
          { activo: true },
        ],
      },
      attributes: ['id', 'nombre_completo', 'email'],
      raw: true,
    });
    return usuario || null;
  }

  /**
   * Guarda el hash del token si no hay un enlace emitido dentro del enfriamiento.
   * Sentencia atómica: UPDATE ... WHERE id = :id AND (expira IS NULL OR expira < ahora + (vencimiento - enfriamiento)).
   * @returns {Promise<boolean>} true si se emitió (afectó una fila).
   */
  async emitirToken(id, hash, { vencimientoMinutos, enfriamientoMinutos }) {
    const [filas] = await Usuario.update(
      { token_recuperacion: hash, token_recuperacion_expira: enMinutos(vencimientoMinutos) },
      {
        where: {
          id,
          [Op.or]: [
            { token_recuperacion_expira: null },
            { token_recuperacion_expira: { [Op.lt]: enMinutos(vencimientoMinutos - enfriamientoMinutos) } },
          ],
        },
      }
    );
    return filas === 1;
  }

  /**
   * Usuario activo dueño de un token vigente (búsqueda barata previa al bcrypt).
   * @returns {Promise<{ id: string, nombre_completo: string, email: string, password_hash: string }|null>}
   */
  async buscarPorTokenVigente(hash) {
    const usuario = await Usuario.findOne({
      where: { token_recuperacion: hash, token_recuperacion_expira: { [Op.gt]: ahoraBd() }, activo: true },
      attributes: ['id', 'nombre_completo', 'email', 'password_hash'],
      raw: true,
    });
    return usuario || null;
  }

  /**
   * Cambia la contraseña y consume el token en una sola sentencia atómica;
   * solo una petición concurrente con el mismo token afecta la fila.
   * @param {Date} cambiadaEn reloj de la app (se compara con el `iat` de los JWT).
   * @returns {Promise<boolean>}
   */
  async consumirToken(hash, passwordHash, cambiadaEn) {
    const [filas] = await Usuario.update(
      {
        password_hash: passwordHash,
        token_recuperacion: null,
        token_recuperacion_expira: null,
        password_cambiada_en: cambiadaEn,
      },
      { where: { token_recuperacion: hash, token_recuperacion_expira: { [Op.gt]: ahoraBd() }, activo: true } }
    );
    return filas === 1;
  }
}

module.exports = new RecuperacionRepository();
