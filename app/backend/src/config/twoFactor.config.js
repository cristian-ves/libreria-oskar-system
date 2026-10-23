// Clave de desarrollo: obviamente falsa, de formato válido y nunca apta para producción.
const CLAVE_DESARROLLO = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
const FORMATO_CLAVE = /^[0-9a-fA-F]{64}$/;

const CONSTANTES = Object.freeze({
  emisor: 'Librería Oskar',
  digitos: 6,
  periodoSegundos: 30,
  algoritmo: 'sha1', // máxima compatibilidad con las apps de autenticación
  toleranciaPasos: 1,
  tokenTemporalSegundos: 600,
  maxIntentos: 5,
  bloqueoMinutos: 15,
  codigosRespaldo: 10,
});

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function resolverObligatorio(valor, nodeEnv) {
  // En pruebas siempre apagado, sin importar el .env ni el entorno.
  if (nodeEnv === 'test') return false;
  const pedido = texto(valor).toLowerCase();
  if (!pedido) return nodeEnv === 'production';
  if (pedido !== 'true' && pedido !== 'false') {
    throw new Error("TWO_FACTOR_ENFORCED inválido: use 'true' o 'false'.");
  }
  return pedido === 'true';
}

function resolverClave(valor, nodeEnv) {
  const bruto = texto(valor);
  if (!bruto) {
    if (nodeEnv === 'production') {
      throw new Error('La variable de entorno TWO_FACTOR_ENCRYPTION_KEY es obligatoria en entorno de producción.');
    }
    return { clave: Buffer.from(CLAVE_DESARROLLO, 'hex'), claveDesarrollo: true };
  }
  // Nunca se incluye el valor recibido en el mensaje.
  if (!FORMATO_CLAVE.test(bruto)) {
    throw new Error('TWO_FACTOR_ENCRYPTION_KEY inválida: deben ser 64 caracteres hexadecimales (32 bytes).');
  }
  return { clave: Buffer.from(bruto, 'hex'), claveDesarrollo: false };
}

// Función pura: no lee process.env ni escribe en consola.
function leerConfigDosFactores(entorno = {}, nodeEnv = 'development') {
  const { clave, claveDesarrollo } = resolverClave(entorno.TWO_FACTOR_ENCRYPTION_KEY, nodeEnv);
  return {
    ...CONSTANTES,
    enforced: resolverObligatorio(entorno.TWO_FACTOR_ENFORCED, nodeEnv),
    encryptionKey: clave,
    claveDesarrollo,
  };
}

module.exports = { leerConfigDosFactores, CLAVE_DESARROLLO };
