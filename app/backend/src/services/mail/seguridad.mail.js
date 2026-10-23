// Reemplaza cada secreto por *** en cualquier texto que vaya a un log o a un resultado.
function crearSanitizador(secretos = []) {
  const lista = secretos.filter((s) => typeof s === 'string' && s.length > 0);
  return (valor) => {
    const texto = valor instanceof Error ? valor.message : String(valor ?? '');
    return lista.reduce((acc, secreto) => acc.split(secreto).join('***'), texto);
  };
}

// a***@dominio
function enmascarar(direccion) {
  const [local = '', dominio = ''] = String(direccion).split('@');
  return `${local.slice(0, 1)}***@${dominio}`;
}

module.exports = { crearSanitizador, enmascarar };
