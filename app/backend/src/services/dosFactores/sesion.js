const jwt = require('jsonwebtoken');
const env = require('../../config/env');

const ALCANCE_VERIFICAR = '2fa-verify';
const ALCANCE_CONFIGURAR = '2fa-setup';
const ROLES_OBLIGATORIOS = ['Administrador', 'Empleado'];

/** true si el rol debe tener 2FA con la bandera actual (se lee en cada llamada). */
function esObligatorio(rol) {
  return Boolean(env.twoFactor.enforced) && ROLES_OBLIGATORIOS.includes(rol);
}

/** Token temporal de alcance limitado: payload mínimo { sub, scope }. */
function firmarTokenTemporal(usuarioId, scope) {
  const expiraEnSegundos = env.twoFactor.tokenTemporalSegundos;
  const tokenTemporal = jwt.sign({ sub: usuarioId, scope }, env.jwt.secret, { expiresIn: expiraEnSegundos });
  return { tokenTemporal, expiraEnSegundos };
}

/**
 * Decide el segundo paso tras validar credenciales.
 * @param {{ id: string, rol_nombre: string, dos_factores_activo: boolean }} usuario
 * @returns {null|{ paso: 'verificar'|'configurar', tokenTemporal: string, expiraEnSegundos: number }}
 */
function resolverSegundoPaso(usuario) {
  if (usuario.dos_factores_activo) {
    return { paso: 'verificar', ...firmarTokenTemporal(usuario.id, ALCANCE_VERIFICAR) };
  }
  if (esObligatorio(usuario.rol_nombre)) {
    return { paso: 'configurar', ...firmarTokenTemporal(usuario.id, ALCANCE_CONFIGURAR) };
  }
  return null;
}

module.exports = {
  ALCANCE_VERIFICAR,
  ALCANCE_CONFIGURAR,
  esObligatorio,
  firmarTokenTemporal,
  resolverSegundoPaso,
};
