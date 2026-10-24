const crearPoliticaCors = ({ origins, permissive }) => (origin, callback) => {
  // Sin Origin no se concede acceso CORS. El servidor puede atender llamadas no navegador,
  // pero la ausencia de la cabecera nunca se usa como señal de confianza.
  if (!origin) return callback(null, false);
  if (permissive || origins.includes(origin)) return callback(null, true);
  const error = new Error('Origen CORS no autorizado.');
  error.code = 'CORS_ORIGIN_DENIED';
  return callback(error);
};

module.exports = { crearPoliticaCors };
