const PROVEEDORES = ['smtp', 'consola'];
// `console` se acepta como alias de `consola`.
const ALIAS = { console: 'consola' };
const HOST_POR_DEFECTO = 'smtp.gmail.com';
const PUERTO_POR_DEFECTO = 587;

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function resolverProveedor(valor, nodeEnv) {
  // En pruebas siempre consola, sin importar el .env, para no enviar correo real.
  if (nodeEnv === 'test') return 'consola';
  const pedido = texto(valor).toLowerCase();
  if (!pedido) return nodeEnv === 'production' ? 'smtp' : 'consola';
  const proveedor = ALIAS[pedido] || pedido;
  if (!PROVEEDORES.includes(proveedor)) {
    throw new Error(`MAIL_PROVIDER inválido: use ${PROVEEDORES.join(' o ')}.`);
  }
  return proveedor;
}

function resolverPuerto(valor) {
  const bruto = texto(valor);
  if (!bruto) return PUERTO_POR_DEFECTO;
  const puerto = Number(bruto);
  if (!/^\d+$/.test(bruto) || puerto < 1 || puerto > 65535) {
    throw new Error('MAIL_PORT inválido: debe ser un entero entre 1 y 65535.');
  }
  return puerto;
}

// Función pura: no lee process.env ni escribe en consola.
// `faltantes` nombra variables (nunca valores) que el proveedor smtp necesita.
function leerConfigCorreo(entorno = {}, nodeEnv = 'development') {
  const proveedor = resolverProveedor(entorno.MAIL_PROVIDER, nodeEnv);
  const user = texto(entorno.MAIL_USER);
  const password = entorno.MAIL_PASSWORD || '';
  const faltantes = [];
  if (proveedor === 'smtp') {
    if (!user) faltantes.push('MAIL_USER');
    if (!password) faltantes.push('MAIL_PASSWORD');
  }
  return {
    proveedor,
    host: texto(entorno.MAIL_HOST) || HOST_POR_DEFECTO,
    port: resolverPuerto(entorno.MAIL_PORT),
    user,
    password,
    from: texto(entorno.MAIL_FROM) || user,
    faltantes,
  };
}

module.exports = { leerConfigCorreo, PROVEEDORES };
