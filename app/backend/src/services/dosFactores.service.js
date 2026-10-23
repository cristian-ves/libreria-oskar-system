const { sequelize } = require('../models');
const dosFactoresRepository = require('../repositories/dosFactores.repository');
const authService = require('./auth.service');
const { cifrar } = require('./dosFactores/cifrado');
const totp = require('./dosFactores/totp');
const respaldo = require('./dosFactores/respaldo');
const { esObligatorio } = require('./dosFactores/sesion');
const {
  cargarEstado, asegurarNoBloqueado, reservarIntento, rechazar, abrirSecreto,
} = require('./dosFactores/intentos');
const { esUuid } = require('../utils/uuid');
const {
  ValidationError, UnauthorizedError, ConflictError, ForbiddenError, NotFoundError,
} = require('../utils/errors');

const MENSAJE_FORMATO_TOTP = 'El código debe tener 6 dígitos.';
const MENSAJE_NO_ACTIVO = 'La verificación en dos pasos no está activa.';
const presente = (valor) => valor !== undefined && valor !== null && valor !== '';
const hashes = (usuarioId, codigos) => codigos.map((c) => respaldo.hashCodigo(usuarioId, respaldo.normalizar(c)));

/**
 * Verifica un TOTP y reclama su paso. El intento se reserva antes de verificar (el formato inválido
 * no lo consume); el éxito lo reinicia al reclamar el paso y cualquier fallo queda contado.
 */
async function verificarTotp(estado, codigo, TipoError) {
  const normalizado = totp.normalizarCodigo(codigo);
  if (!normalizado) throw new ValidationError(MENSAJE_FORMATO_TOTP);
  const secreto = abrirSecreto(estado);
  const bloqueadoAhora = await reservarIntento(estado.id);
  const paso = totp.verificarCodigo(secreto, normalizado);
  const reclamado = paso !== null
    && await dosFactoresRepository.reclamarPaso(estado.id, paso, { where: { dos_factores_activo: true } });
  if (!reclamado) rechazar(bloqueadoAhora, TipoError);
}

class DosFactoresService {
  /** Genera un secreto nuevo (reemplaza uno pendiente) y lo guarda cifrado con activo=false. */
  async configurar(usuarioId) {
    const estado = await cargarEstado(usuarioId);
    if (estado.dos_factores_activo) throw new ConflictError('La verificación en dos pasos ya está activa.');
    const secreto = totp.generarSecreto();
    const otpauthUrl = totp.construirUri(secreto, estado.email);
    if (!(await dosFactoresRepository.guardarSecretoPendiente(usuarioId, cifrar(secreto, usuarioId)))) {
      throw new ConflictError('La verificación en dos pasos ya está activa.');
    }
    return { qrDataUrl: await totp.generarQr(otpauthUrl), secretoManual: secreto, otpauthUrl };
  }

  /**
   * Activa con el primer código: reserva un intento, verifica y, en una transacción con FOR UPDATE,
   * reclama el paso, activa y crea los respaldos. Un 409 por alta cambiada a mitad deja el intento consumido.
   */
  async activar(usuarioId, codigo) {
    const estado = await cargarEstado(usuarioId);
    if (estado.dos_factores_activo || !estado.dos_factores_secreto) {
      throw new ConflictError('No hay un alta de verificación en dos pasos pendiente.');
    }
    asegurarNoBloqueado(estado);
    const normalizado = totp.normalizarCodigo(codigo);
    if (!normalizado) throw new ValidationError(MENSAJE_FORMATO_TOTP);
    const secreto = abrirSecreto(estado);
    const bloqueadoAhora = await reservarIntento(usuarioId);
    const paso = totp.verificarCodigo(secreto, normalizado);
    if (paso === null) rechazar(bloqueadoAhora);

    const codigos = respaldo.generarCodigos();
    const reclamado = await sequelize.transaction(async (transaction) => {
      const actual = await cargarEstado(usuarioId, { transaction, lock: true });
      if (actual.dos_factores_activo || actual.dos_factores_secreto !== estado.dos_factores_secreto) {
        throw new ConflictError('No hay un alta de verificación en dos pasos pendiente.');
      }
      const ok = await dosFactoresRepository.reclamarPaso(usuarioId, paso, {
        transaction, extra: { dos_factores_activo: true },
      });
      if (ok) await dosFactoresRepository.reemplazarRespaldos(usuarioId, hashes(usuarioId, codigos), { transaction });
      return ok;
    });
    if (!reclamado) rechazar(bloqueadoAhora);
    return { ...authService.emitirSesion(estado), codigosRespaldo: codigos };
  }

  /** Segundo paso del login: exactamente uno de { codigo } o { codigoRespaldo }. */
  async verificar(usuarioId, { codigo, codigoRespaldo } = {}) {
    if (presente(codigo) === presente(codigoRespaldo)) {
      throw new ValidationError('Envíe exactamente uno de los campos: codigo o codigoRespaldo.');
    }
    const estado = await cargarEstado(usuarioId);
    if (!estado.dos_factores_activo) {
      throw new UnauthorizedError('La verificación en dos pasos no está activa. Inicie sesión de nuevo.');
    }
    asegurarNoBloqueado(estado);

    if (presente(codigo)) {
      await verificarTotp(estado, codigo, UnauthorizedError);
    } else {
      const normalizado = respaldo.normalizar(codigoRespaldo);
      if (!normalizado) throw new ValidationError('El código de respaldo no tiene un formato válido.');
      const bloqueadoAhora = await reservarIntento(usuarioId);
      const hash = respaldo.hashCodigo(usuarioId, normalizado);
      if (!(await dosFactoresRepository.consumirRespaldo(usuarioId, hash))) rechazar(bloqueadoAhora);
      await dosFactoresRepository.reiniciarIntentos(usuarioId);
    }
    return authService.emitirSesion(estado);
  }

  async estado(usuarioId) {
    const estado = await cargarEstado(usuarioId);
    return {
      activo: estado.dos_factores_activo,
      obligatorio: esObligatorio(estado.rol_nombre),
      codigosRespaldoRestantes: estado.dos_factores_activo
        ? await dosFactoresRepository.contarRespaldosRestantes(usuarioId)
        : 0,
    };
  }

  /** Reemplaza los códigos de respaldo. Con sesión completa, un código inválido es 400 (no 401). */
  async regenerarRespaldo(usuarioId, codigo) {
    const estado = await cargarEstado(usuarioId);
    if (!estado.dos_factores_activo) throw new ConflictError(MENSAJE_NO_ACTIVO);
    asegurarNoBloqueado(estado);
    await verificarTotp(estado, codigo, ValidationError);
    const codigos = respaldo.generarCodigos();
    await sequelize.transaction((transaction) =>
      dosFactoresRepository.reemplazarRespaldos(usuarioId, hashes(usuarioId, codigos), { transaction }));
    return { codigosRespaldo: codigos };
  }

  /** Lógica única de restablecimiento (endpoint y script reset-2fa). */
  async restablecer(usuarioId) {
    return sequelize.transaction(async (transaction) => {
      const estado = await dosFactoresRepository.obtenerEstado(usuarioId, { transaction, lock: true });
      if (!estado) throw new NotFoundError('Usuario no encontrado.');
      await dosFactoresRepository.restablecer(usuarioId, { transaction });
      return { restablecido: true };
    });
  }

  async restablecerPorAdministrador(actorId, objetivoId) {
    if (!esUuid(objetivoId)) throw new ValidationError('El identificador del usuario no es válido.');
    if (String(objetivoId).toLowerCase() === String(actorId).toLowerCase()) {
      throw new ForbiddenError('No puede restablecer su propia verificación en dos pasos; use el script reset-2fa.');
    }
    return this.restablecer(objetivoId);
  }

  async restablecerPorEmail(email) {
    const usuarioId = await dosFactoresRepository.buscarIdPorEmail(email);
    if (!usuarioId) throw new NotFoundError('Usuario no encontrado.');
    return this.restablecer(usuarioId);
  }
}

module.exports = new DosFactoresService();
