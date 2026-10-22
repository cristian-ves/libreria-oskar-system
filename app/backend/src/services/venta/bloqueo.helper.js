const inventarioRepository = require('../../repositories/inventario.repository');

/**
 * Bloquea con FOR UPDATE los inventarios de los libros indicados en la bodega, siempre
 * en orden ascendente de `id`. Ese orden fijo evita deadlocks entre transacciones que
 * tocan las mismas líneas en distinto orden (crear y anular comparten esta función).
 * Los valores devueltos son los leídos BAJO el bloqueo.
 *
 * @param {string[]} libroIds
 * @param {string} bodegaId
 * @param {{ transaction: import('sequelize').Transaction }} txOptions
 * @returns {Promise<Array<object>>} inventarios bloqueados, ordenados por id
 */
async function bloquearInventariosOrdenados(libroIds, bodegaId, txOptions) {
  const encontrados = await inventarioRepository.findByLibrosAndBodega(libroIds, bodegaId, txOptions);
  const ordenados = [...encontrados].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const bloqueados = [];
  for (const inv of ordenados) {
    const actual = await inventarioRepository.findByIdForUpdate(inv.id, txOptions);
    if (actual) bloqueados.push(actual);
  }
  return bloqueados;
}

module.exports = { bloquearInventariosOrdenados };
